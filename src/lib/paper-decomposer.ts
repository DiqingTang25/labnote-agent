/**
 * Paper Decomposer — 论文 Methods 拆解引擎
 *
 * 使用 DeepSeek-V3 将论文 Methods 段落拆解为结构化复现参数，
 * 标注每个参数的确定性等级和推断依据。
 *
 * 核心原则：
 *   - 论文明确写出的 → explicit, confidence=100
 *   - 论文间接提及的 → implied, confidence=80-95
 *   - AI 基于领域知识推断的 → inferred, confidence=40-80
 *   - 完全无法确定的 → 标记为 gap
 */

import { chat } from "./deepseek";
import { extractJSON } from "./json-parser";
import type {
  ReproductionParameter,
  ReproductionGap,
  ReproductionAudit,
  ParameterCategory,
  CertaintyLevel,
  SourceTag,
} from "./reproduction-audit";
import { buildAuditFromAI } from "./reproduction-audit";
import { queryDomainKnowledge } from "./domain-knowledge";
import { extractChemicalFormulas, queryMaterialsProject, summarizeMPResult } from "./materials-project";
import { extractNISTQueries, queryNIST, summarizeNISTResult } from "./nist";

// ═══════════════════════════════════════════════════════
// 论文拆解 System Prompt
// ═══════════════════════════════════════════════════════

const DECOMPOSE_SYSTEM = `你是实验复现专家。你的任务是将科研论文的 Methods/Experimental 段落拆解为精确的、可用于复现实验的结构化参数列表。

【关键原则】
1. 区分"论文明确写出"和"你推断的"——绝对不能混为一谈
2. 每个参数必须标注来源：explicit(论文明确)、implied(论文隐含)、inferred(AI推断)
3. 对于每个 inferred 参数，必须说明推断依据
4. 识别所有缺失但复现必需的信息，标记为 gap
5. 对于数值参数，区分"精确值"和"合理范围"
6. 【安全参数】必须专门提取实验安全相关参数——使用 safety 类别。包括但不限于：
   - 危险化学品(浓酸/强碱/有机溶剂)的防护要求(PPE/通风橱)
   - 高温高压操作(煅烧/水热釜/高压灭菌)的安全条件
   - 生物危害(人体组织/病原体/生物安全等级)
   - 紫外/激光/辐射源的防护参数
   - 纳米材料的吸入/接触防护
   - 低温(液氮)和电气安全
   论文未提及安全措施时，在 gaps 中标记 safety 类别缺口并给出行业标准建议

【常见论文隐含信息的例子】
- "室温搅拌" → 隐含温度约 25°C，但实际可能 20-30°C
- "干燥过夜" → 隐含约 12 小时，但不精确
- "用去离子水洗涤数次" → 隐含 ≥3 次，但具体次数未知
- "适量"、"若干" → 完全不确定

【输出 JSON 格式】
{
  "paperSummary": "一句话概括实验内容",
  "parameters": [
    {
      "name": "参数名",
      "value": "参数值",
      "unit": "单位",
      "category": "synthesis|precursor|equipment|characterization|testing|environment|post-processing|safety",
      "source": "paper|paper-implied|ai-inference|standard-protocol",
      "certainty": "explicit|implied|inferred|unknown",
      "paperQuote": "论文原文引用（如来自论文）",
      "inferenceRationale": "AI推断依据（如为推断）",
      "confidence": 85,
      "alternativeRange": "备选范围（如有）",
      "impactIfWrong": "critical|major|minor"
    }
  ],
  "gaps": [
    {
      "description": "缺失信息描述",
      "category": "synthesis|precursor|...",
      "importanceRationale": "为什么这个信息对复现至关重要",
      "aiSuggestion": "AI 的最佳推断",
      "confidence": 50,
      "inferenceBasis": "推断依据",
      "impactIfWrong": "critical|major|minor"
    }
  ],
  "aiAssessment": "总体复现评估，2-4句话，指出最大风险和最重要的gap"
}`;

// ═══════════════════════════════════════════════════════
// 进度回调类型
// ═══════════════════════════════════════════════════════

export type DecompositionStep =
  | "connecting"       // 准备连接 AI 引擎
  | "decomposing"      // AI 拆解论文 Methods
  | "enhancing-static" // 静态领域知识库匹配
  | "enhancing-mp"     // Materials Project API 查询
  | "enhancing-nist"   // NIST Chemistry WebBook 查询
  | "done";            // 完成

export type DecompositionProgress = {
  step: DecompositionStep;
  detail?: string; // 如 "已查询 3 个化学式"、"匹配到 SrTiO₃"
};

// ═══════════════════════════════════════════════════════
// 主函数：拆解论文 Methods
// ═══════════════════════════════════════════════════════

export async function decomposePaperMethods(
  paperTitle: string,
  paperSource: string,
  methodsText: string,
  discipline: string = "材料科学",
  onProgress?: (p: DecompositionProgress) => void,
): Promise<ReproductionAudit> {
  const report = (step: DecompositionStep, detail?: string) => {
    onProgress?.({ step, detail });
  };

  report("connecting", `模型: DeepSeek-V3, 领域: ${discipline}`);

  // 1. 构建 Prompt
  const prompt = `请拆解以下论文的实验方法段落，提取所有可复现的结构化参数。

论文标题：${paperTitle}
学科领域：${discipline}

【实验方法原文】
${methodsText.slice(0, 15000)}

请严格按照系统提示的 JSON 格式输出。特别注意：
- 明确写出的参数标记为 explicit
- 可从上下文合理推断的标记为 implied，并在 inferenceRationale 中说明推断逻辑
- 无法从论文确定、需要外部知识的标记为 inferred
- 对复现必需但完全缺失的信息，放入 gaps 数组
- 每个 gap 必须包含 aiSuggestion（基于领域知识的最佳猜测）`;

  // 2. 调用 DeepSeek-V3
  let rawOutput: string;
  try {
    report("decomposing", "DeepSeek-V3 拆解论文 Methods 段落 → 结构化参数…");
    rawOutput = await chat(
      "deepseek-ai/DeepSeek-V3",
      [
        { role: "system", content: DECOMPOSE_SYSTEM },
        { role: "user", content: prompt },
      ],
      8192,
    );
  } catch (err) {
    console.error("[PaperDecomposer] API call failed:", err);
    throw new Error(`论文拆解 API 调用失败: ${err}`);
  }

  // 3. 解析响应
  let data: Record<string, unknown>;
  try {
    data = extractJSON<Record<string, unknown>>(rawOutput);
  } catch (err) {
    console.error("[PaperDecomposer] JSON parse failed:", err);
    // 回退：创建基础 Audit
    return buildAuditFromAI(
      paperTitle,
      paperSource,
      [],
      [{
        description: "AI 解析论文失败，请手动输入实验参数",
        category: "synthesis",
        importanceRationale: "无法自动提取参数",
        aiSuggestion: "",
        confidence: 0,
        inferenceBasis: "",
        dbReference: "",
        dbSourceUrl: "",
        impactIfWrong: "critical",
      }],
      `解析失败: ${String(err).slice(0, 200)}`,
    );
  }

  // 4. 提取参数和缺口
  const rawParams = Array.isArray(data.parameters) ? data.parameters as Array<Record<string, unknown>> : [];
  const rawGaps = Array.isArray(data.gaps) ? data.gaps as Array<Record<string, unknown>> : [];
  const aiAssessment = String(data.aiAssessment ?? "");

  // 5. 映射参数
  const parameters: Omit<ReproductionParameter, "userConfirmed" | "userValue">[] = rawParams.map((rp) => ({
    name: String(rp.name ?? ""),
    value: String(rp.value ?? ""),
    unit: String(rp.unit ?? ""),
    category: (rp.category as ParameterCategory) ?? "synthesis",
    source: (rp.source as SourceTag) ?? "ai-inference",
    certainty: (rp.certainty as CertaintyLevel) ?? "inferred",
    paperQuote: String(rp.paperQuote ?? ""),
    inferenceRationale: String(rp.inferenceRationale ?? ""),
    confidence: typeof rp.confidence === "number" ? rp.confidence : 50,
    alternativeRange: String(rp.alternativeRange ?? ""),
    impactIfWrong: (rp.impactIfWrong as "critical" | "major" | "minor") ?? "major",
    relatedParams: Array.isArray(rp.relatedParams) ? rp.relatedParams as string[] : [],
  }));

  // 6. 映射缺口
  const gaps: Omit<ReproductionGap, "status" | "userFill">[] = rawGaps.map((rg) => ({
    description: String(rg.description ?? ""),
    category: (rg.category as ParameterCategory) ?? "synthesis",
    importanceRationale: String(rg.importanceRationale ?? ""),
    aiSuggestion: String(rg.aiSuggestion ?? ""),
    confidence: typeof rg.confidence === "number" ? rg.confidence : 30,
    inferenceBasis: String(rg.inferenceBasis ?? ""),
    dbReference: String(rg.dbReference ?? ""),
    dbSourceUrl: String(rg.dbSourceUrl ?? ""),
    impactIfWrong: (rg.impactIfWrong as "critical" | "major" | "minor") ?? "major",
  }));

  // 7. 用领域知识增强推断
  const enhancedParams = await enhanceWithDomainKnowledge(parameters, discipline, report);
  const enhancedGaps = await enhanceGapsWithDomainKnowledge(gaps, discipline);

  report("done", `提取 ${enhancedParams.length} 参数, ${enhancedGaps.length} 缺口`);

  // 8. 构建 Audit
  return buildAuditFromAI(
    paperTitle,
    paperSource,
    enhancedParams,
    enhancedGaps,
    aiAssessment || generateDefaultAssessment(enhancedParams, enhancedGaps),
  );
}

// ═══════════════════════════════════════════════════════
// 领域知识增强
// ═══════════════════════════════════════════════════════

async function enhanceWithDomainKnowledge(
  params: Omit<ReproductionParameter, "userConfirmed" | "userValue">[],
  discipline: string,
  report?: (step: DecompositionStep, detail?: string) => void,
): Promise<Omit<ReproductionParameter, "userConfirmed" | "userValue">[]> {
  const enhanced = [...params];

  // ── Step 1: 静态领域知识库（先运行，速度最快） ──
  report?.("enhancing-static", "匹配静态领域知识库…");
  for (const p of enhanced) {
    if (p.certainty !== "inferred" && p.certainty !== "unknown") continue;

    const knowledge = queryDomainKnowledge(p.name, discipline);
    if (knowledge && knowledge.confidence > p.confidence) {
      p.confidence = Math.min(knowledge.confidence + 10, 90);
      p.inferenceRationale = `${p.inferenceRationale}；领域知识: ${knowledge.rationale}`;
      if (knowledge.typicalRange && !p.alternativeRange) {
        p.alternativeRange = knowledge.typicalRange;
      }
      if (knowledge.dbReference) {
        p.source = "db-reference";
      }
    }
  }

  // ── Step 2: Materials Project API 实时查询 ──
  // 从所有参数中提取化学式，批量查询一次
  const allParamText = enhanced
    .map((p) => `${p.name} ${p.value} ${p.inferenceRationale}`)
    .join(" ");
  const formulas = extractChemicalFormulas(allParamText);

  if (formulas.length > 0) {
    try {
      report?.("enhancing-mp", `Materials Project 查询 ${formulas.length} 个化学式: ${formulas.join(", ")}`);
      const mpResults = await queryMaterialsProject(formulas);

      // 将 MP 数据注入匹配的参数
      for (const p of enhanced) {
        // only enhance non-explicit parameters
        if (p.certainty === "explicit") continue;

        const paramText = `${p.name} ${p.value} ${p.inferenceRationale}`;
        const paramFormulas = extractChemicalFormulas(paramText);

        for (const formula of paramFormulas) {
          const results = mpResults.get(formula);
          if (!results || results.length === 0) continue;

          // 优先取最稳定的（energyAboveHull 最小）
          const best = results.reduce((a, b) =>
            (a.energyAboveHull ?? 999) < (b.energyAboveHull ?? 999) ? a : b,
          );

          const summary = summarizeMPResult(best);

          // 如果参数涉及材料属性且 MP 有数据，显著提升置信度
          const isPropertyMatch = matchPropertyToParameter(p.name, p.value, best);
          const mpConfidence = isPropertyMatch ? 85 : 70;

          if (mpConfidence > p.confidence) {
            p.confidence = Math.min(mpConfidence, 92);
            p.source = "db-reference";
            p.inferenceRationale = `${p.inferenceRationale}；Materials Project 验证: ${summary}`;
            if (!p.alternativeRange && best.bandGap !== null) {
              p.alternativeRange = `${formula}: 带隙 ${best.bandGap.toFixed(2)} eV`;
            }
            // 添加可追溯的 DOI 引用
            (p as Record<string, unknown>).dbSourceUrl =
              `https://materialsproject.org/materials/${best.materialId}`;
            break; // 一个参数只匹配一次 MP 数据
          }
        }
      }
    } catch (err) {
      console.warn("[PaperDecomposer] MP enhancement failed, continuing:", err);
      // MP 失败不阻塞整体流程
    }
  }

  // ── Step 3: NIST Chemistry WebBook 实时查询 ──
  const nistQueries = extractNISTQueries(allParamText);
  if (nistQueries.length > 0) {
    try {
      report?.("enhancing-nist", `NIST Chemistry WebBook 查询 ${nistQueries.length} 个化合物: ${nistQueries.map(q => q.value).join(", ")}`);
      const nistResults = await queryNIST(nistQueries);

      for (const p of enhanced) {
        if (p.certainty === "explicit") continue;

        const paramText = `${p.name} ${p.value} ${p.inferenceRationale}`;
        const paramQueries = extractNISTQueries(paramText);

        for (const q of paramQueries) {
          const results = nistResults.get(q.value);
          if (!results || results.length === 0) continue;

          const best = results[0]; // 取第一个匹配
          const summary = summarizeNISTResult(best);

          // NIST 数据可提升热力学相关参数的置信度
          const isThermoParam = /焓|熵|热容|enthalpy|entropy|heat|capacity|formation|energy|比热|ΔH|ΔS|Cp/i.test(paramText);
          const nistConfidence = isThermoParam && best.enthalpyOfFormation !== null ? 82 : 65;

          if (nistConfidence > p.confidence) {
            p.confidence = Math.min(nistConfidence, 90);
            p.source = "db-reference";
            p.inferenceRationale = `${p.inferenceRationale}；NIST WebBook 验证: ${summary}`;
            if (best.casNumber) {
              (p as Record<string, unknown>).dbSourceUrl =
                `https://webbook.nist.gov/cgi/cbook.cgi?ID=${best.casNumber}`;
            }
            break;
          }
        }
      }
    } catch (err) {
      console.warn("[PaperDecomposer] NIST enhancement failed, continuing:", err);
      // NIST 失败不阻塞整体流程
    }
  }

  return enhanced;
}

/**
 * 检查参数是否涉及 MP 材料的具体属性
 * 用于判断 MP 数据与参数的相关性强度
 */
function matchPropertyToParameter(
  paramName: string,
  paramValue: string,
  mpData: { bandGap: number | null; crystalSystem: string | null; isMetal: boolean },
): boolean {
  const text = `${paramName} ${paramValue}`.toLowerCase();

  if (mpData.bandGap !== null && /band.?gap|带隙|bandgap/i.test(text)) {
    return true;
  }
  if (mpData.crystalSystem && /crystal|晶[体系型相格]|structure|结构/i.test(text)) {
    return true;
  }
  if (mpData.isMetal && /metal|金属|conduct|导电/i.test(text)) {
    return true;
  }
  if (/(formation|形成)|energy|能量/i.test(text) && /energy|能量/i.test(text)) {
    return true;
  }
  // 弱匹配：参数名或值包含化学式
  return /[A-Z][a-z]?\d/.test(paramName) || /[A-Z][a-z]?\d/.test(paramValue);
}

async function enhanceGapsWithDomainKnowledge(
  gaps: Omit<ReproductionGap, "status" | "userFill">[],
  discipline: string,
): Promise<Omit<ReproductionGap, "status" | "userFill">[]> {
  return gaps.map((g) => {
    if (g.aiSuggestion) return g;

    const knowledge = queryDomainKnowledge(g.description, discipline);
    if (knowledge) {
      return {
        ...g,
        aiSuggestion: knowledge.suggestion,
        confidence: knowledge.confidence,
        inferenceBasis: knowledge.rationale,
        dbReference: knowledge.dbReference ?? "",
      };
    }
    return g;
  });
}

function generateDefaultAssessment(
  params: Omit<ReproductionParameter, "userConfirmed" | "userValue">[],
  gaps: Omit<ReproductionGap, "status" | "userFill">[],
): string {
  const explicitCount = params.filter((p) => p.certainty === "explicit").length;
  const inferredCount = params.filter((p) => p.certainty === "inferred").length;
  const criticalGaps = gaps.filter((g) => g.impactIfWrong === "critical").length;

  const parts: string[] = [];
  parts.push(`提取 ${params.length} 个参数，其中 ${explicitCount} 个来自论文明确陈述。`);

  if (inferredCount > 0) {
    parts.push(`${inferredCount} 个参数为 AI 推断，需要实验者验证。`);
  }
  if (criticalGaps > 0) {
    parts.push(`⚠️ 存在 ${criticalGaps} 个关键信息缺口，可能严重影响复现。`);
  }
  if (gaps.length > 0) {
    parts.push(`建议优先填补关键缺口后再开始实验。`);
  } else {
    parts.push(`参数较完整，可尝试按此协议进行复现实验。`);
  }

  return parts.join("");
}

// ═══════════════════════════════════════════════════════
// 快速分析：仅分析缺口（不需要完整拆解）
// ═══════════════════════════════════════════════════════

const GAP_ANALYSIS_SYSTEM = `你是实验复现专家。快速分析实验卡片与复现要求的差距。

输出 JSON：
{
  "gaps": [
    {
      "description": "缺失信息",
      "importanceRationale": "为什么重要",
      "aiSuggestion": "建议值",
      "confidence": 60,
      "inferenceBasis": "推断依据",
      "impactIfWrong": "critical|major|minor"
    }
  ],
  "assessment": "总体评估"
}`;

export async function quickGapAnalysis(
  experimentData: string,
): Promise<{
  gaps: Omit<ReproductionGap, "status" | "userFill" | "category" | "dbReference" | "dbSourceUrl">[];
  assessment: string;
}> {
  try {
    const rawOutput = await chat(
      "deepseek-ai/DeepSeek-V3",
      [
        { role: "system", content: GAP_ANALYSIS_SYSTEM },
        { role: "user", content: `分析以下实验数据的复现缺口：\n${experimentData.slice(0, 8000)}` },
      ],
      4096,
    );

    const data = extractJSON<{ gaps: Array<Record<string, unknown>>; assessment: string }>(rawOutput);
    return {
      gaps: (data.gaps ?? []).map((g) => ({
        description: String(g.description ?? ""),
        importanceRationale: String(g.importanceRationale ?? ""),
        aiSuggestion: String(g.aiSuggestion ?? ""),
        confidence: typeof g.confidence === "number" ? g.confidence : 50,
        inferenceBasis: String(g.inferenceBasis ?? ""),
        impactIfWrong: (g.impactIfWrong as "critical" | "major" | "minor") ?? "major",
      })),
      assessment: String(data.assessment ?? ""),
    };
  } catch (err) {
    console.error("[GapAnalysis] failed:", err);
    return { gaps: [], assessment: `分析失败: ${err}` };
  }
}
