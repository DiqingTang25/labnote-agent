/**
 * Reproduction Audit Engine — 复现审计引擎
 *
 * 核心功能：
 *   1. 将论文 Methods 拆解为结构化复现参数
 *   2. 标注每个参数的来源确定性（论文明确/论文隐含/AI推断/用户补充）
 *   3. 对缺口给出带置信度的推断
 *   4. 生成可执行的复现协议
 *
 * 设计原则：
 *   - 不确定就是不确定，不假装知道
 *   - 每个推断都标注来源和置信度
 *   - 研究者始终是最终决策者
 */

// ═══════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════

/** 参数来源确定性等级 */
export type CertaintyLevel = "explicit" | "implied" | "inferred" | "unknown";

/** 参数来源标签 */
export type SourceTag =
  | "paper"        // 论文中明确写出
  | "paper-implied" // 论文中间接隐含
  | "ai-inference"  // AI 基于领域知识推断
  | "db-reference"  // 来自公共数据库
  | "user-supplied" // 研究者手动补充
  | "standard-protocol"; // 标准操作流程

/** 单个复现参数 */
export type ReproductionParameter = {
  /** 参数名，如 "退火温度"、"前驱体摩尔比" */
  name: string;
  /** 参数值 */
  value: string;
  /** 单位 */
  unit: string;
  /** 所属类别 */
  category: ParameterCategory;
  /** 参数值来源 */
  source: SourceTag;
  /** 确定性等级 */
  certainty: CertaintyLevel;
  /** 论文原文引用（如果来自论文） */
  paperQuote: string;
  /** AI 推断说明 */
  inferenceRationale: string;
  /** 置信度 0-100，explicit=100, implied=80-95, inferred=40-80, unknown=0 */
  confidence: number;
  /** 备选值范围（如 "300-600°C"） */
  alternativeRange: string;
  /** 如果这个参数错了，对实验结果影响多大: critical | major | minor */
  impactIfWrong: "critical" | "major" | "minor";
  /** 用户是否已确认/修改 */
  userConfirmed: boolean;
  /** 用户修改后的值 */
  userValue: string;
  /** 关联的其他参数（如温度和时间通常耦合） */
  relatedParams: string[];
};

export type ParameterCategory =
  | "synthesis"       // 合成条件
  | "precursor"       // 前驱体/原料
  | "equipment"       // 设备与仪器
  | "characterization" // 表征条件
  | "testing"         // 性能测试条件
  | "environment"     // 环境条件
  | "post-processing" // 后处理
  | "safety";         // 安全相关

/** 复现缺口 — 论文中缺失但复现必需的信息 */
export type ReproductionGap = {
  /** 缺口描述 */
  description: string;
  /** 所属类别 */
  category: ParameterCategory;
  /** 为什么这个信息对复现重要 */
  importanceRationale: string;
  /** AI 的最佳推断 */
  aiSuggestion: string;
  /** 推断置信度 */
  confidence: number;
  /** 推断依据 */
  inferenceBasis: string;
  /** 来自公共数据库的参考值 */
  dbReference: string;
  /** 数据库来源 URL */
  dbSourceUrl: string;
  /** 如果推断错误的影响 */
  impactIfWrong: "critical" | "major" | "minor";
  /** 研究者补充的值 */
  userFill: string;
  /** 状态 */
  status: "open" | "ai-filled" | "user-filled" | "resolved";
};

/** 复现审计报告 */
export type ReproductionAudit = {
  /** 审计 ID */
  id: string;
  /** 论文标题 */
  paperTitle: string;
  /** 论文 DOI/URL */
  paperSource: string;
  /** 审计时间 */
  auditedAt: string;
  /** 提取的所有参数 */
  parameters: ReproductionParameter[];
  /** 识别的缺口 */
  gaps: ReproductionGap[];
  /** 总体复现可行性评分 0-100 */
  reproducibilityScore: number;
  /** 评分说明 */
  scoreBreakdown: string;
  /** AI 总体评估 */
  aiAssessment: string;
  /** 关键风险列表 */
  criticalRisks: string[];
};

// ═══════════════════════════════════════════════════════
// 确定性等级 → 置信度映射
// ═══════════════════════════════════════════════════════

export function certaintyToConfidence(level: CertaintyLevel): number {
  switch (level) {
    case "explicit": return 100;
    case "implied": return 85;
    case "inferred": return 55;
    case "unknown": return 0;
  }
}

// ═══════════════════════════════════════════════════════
// 复现可行性评分
// ═══════════════════════════════════════════════════════

export function calculateReproducibilityScore(
  parameters: ReproductionParameter[],
  gaps: ReproductionGap[],
): { score: number; breakdown: string } {
  if (parameters.length === 0) return { score: 0, breakdown: "无参数数据" };

  // 参数覆盖度：每个参数的置信度加权平均
  const totalConfidence = parameters.reduce((sum, p) => sum + p.confidence, 0);
  const avgConfidence = totalConfidence / parameters.length;

  // 关键参数检查
  const criticalParams = parameters.filter((p) => p.impactIfWrong === "critical");
  const criticalUncertain = criticalParams.filter((p) => p.confidence < 80);
  const criticalPenalty = criticalParams.length > 0
    ? (criticalUncertain.length / criticalParams.length) * 20
    : 0;

  // 缺口惩罚
  const gapPenalty = Math.min(gaps.length * 5, 30);

  // 综合评分
  const rawScore = avgConfidence - criticalPenalty - gapPenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  const parts: string[] = [];
  parts.push(`参数平均置信度: ${avgConfidence.toFixed(0)}%`);
  if (criticalParams.length > 0) {
    parts.push(`${criticalParams.length} 个关键参数中有 ${criticalUncertain.length} 个不确定`);
  }
  if (gaps.length > 0) {
    parts.push(`${gaps.length} 个信息缺口`);
  }

  return { score, breakdown: parts.join("；") };
}

// ═══════════════════════════════════════════════════════
// 缺口优先级排序
// ═══════════════════════════════════════════════════════

export function prioritizeGaps(gaps: ReproductionGap[]): ReproductionGap[] {
  return [...gaps].sort((a, b) => {
    // critical > major > minor
    const impactOrder = { critical: 0, major: 1, minor: 2 };
    const ia = impactOrder[a.impactIfWrong];
    const ib = impactOrder[b.impactIfWrong];
    if (ia !== ib) return ia - ib;
    // 低置信度优先
    return a.confidence - b.confidence;
  });
}

// ═══════════════════════════════════════════════════════
// 生成复现协议 Markdown
// ═══════════════════════════════════════════════════════

export function generateReproductionProtocol(audit: ReproductionAudit): string {
  const lines: string[] = [];

  lines.push(`# 复现协议：${audit.paperTitle}`);
  lines.push("");
  lines.push(`> **复现可行性评分**: ${audit.reproducibilityScore}/100`);
  lines.push(`> **评分说明**: ${audit.scoreBreakdown}`);
  lines.push(`> **审计时间**: ${audit.auditedAt}`);
  lines.push(`> **论文来源**: ${audit.paperSource}`);
  lines.push("");

  // AI 总体评估
  lines.push("## AI 总体评估");
  lines.push(audit.aiAssessment);
  lines.push("");

  // 关键风险
  if (audit.criticalRisks.length > 0) {
    lines.push("## ⚠️ 关键风险");
    for (const risk of audit.criticalRisks) {
      lines.push(`- ${risk}`);
    }
    lines.push("");
  }

  // 按类别组织参数
  const categoryOrder: ParameterCategory[] = [
    "safety", "precursor", "equipment", "synthesis",
    "post-processing", "characterization", "testing", "environment",
  ];
  const categoryLabels: Record<ParameterCategory, string> = {
    safety: "🦺 安全防护",
    precursor: "🧪 前驱体与原料",
    equipment: "🔬 设备与仪器",
    synthesis: "⚗️ 合成步骤",
    "post-processing": "🔥 后处理",
    characterization: "📊 表征条件",
    testing: "🧪 性能测试",
    environment: "🌡️ 环境条件",
  };

  for (const cat of categoryOrder) {
    const params = audit.parameters.filter((p) => p.category === cat);
    if (params.length === 0) continue;

    lines.push(`## ${categoryLabels[cat]}`);
    lines.push("");
    lines.push("| 参数 | 值 | 确定性 | 来源 | 说明 |");
    lines.push("|------|-----|--------|------|------|");

    for (const p of params) {
      const certaintyIcon =
        p.certainty === "explicit" ? "✅" :
        p.certainty === "implied" ? "📖" :
        p.certainty === "inferred" ? "🤖" : "❓";

      const sourceLabel =
        p.source === "paper" ? "论文" :
        p.source === "paper-implied" ? "论文隐含" :
        p.source === "ai-inference" ? "AI推断" :
        p.source === "db-reference" ? "数据库" :
        p.source === "user-supplied" ? "用户" : "标准协议";

      const displayValue = p.userConfirmed ? `${p.userValue} *(已确认)*` : p.value;

      lines.push(`| ${p.name} | ${displayValue} ${p.unit} | ${certaintyIcon} ${p.certainty} | ${sourceLabel} | ${p.inferenceRationale.slice(0, 60)} |`);
    }
    lines.push("");
  }

  // 缺口
  if (audit.gaps.length > 0) {
    lines.push("## 🔍 待补全信息");
    lines.push("");
    const sorted = prioritizeGaps(audit.gaps);
    for (const gap of sorted) {
      const impactIcon =
        gap.impactIfWrong === "critical" ? "🔴" :
        gap.impactIfWrong === "major" ? "🟡" : "🟢";
      lines.push(`### ${impactIcon} ${gap.description}`);
      lines.push(`- **重要性**: ${gap.importanceRationale}`);
      lines.push(`- **AI 建议**: ${gap.aiSuggestion}（置信度 ${gap.confidence}%）`);
      if (gap.dbReference) lines.push(`- **数据库参考**: ${gap.dbReference}`);
      lines.push(`- **状态**: ${gap.status}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════
// 从 AI 解析结果构建 Audit
// ═══════════════════════════════════════════════════════

export function buildAuditFromAI(
  paperTitle: string,
  paperSource: string,
  parsedParams: Omit<ReproductionParameter, "userConfirmed" | "userValue">[],
  parsedGaps: Omit<ReproductionGap, "status" | "userFill">[],
  aiAssessment: string,
): ReproductionAudit {
  const params: ReproductionParameter[] = parsedParams.map((p) => ({
    ...p,
    userConfirmed: false,
    userValue: "",
  }));

  const gaps: ReproductionGap[] = parsedGaps.map((g) => ({
    ...g,
    status: g.aiSuggestion ? "ai-filled" as const : "open" as const,
    userFill: "",
  }));

  const { score, breakdown } = calculateReproducibilityScore(params, gaps);

  const criticalRisks: string[] = [];
  for (const g of gaps) {
    if (g.impactIfWrong === "critical") {
      criticalRisks.push(`${g.description} — ${g.importanceRationale}`);
    }
  }
  for (const p of params) {
    if (p.impactIfWrong === "critical" && p.confidence < 70) {
      criticalRisks.push(`${p.name} 置信度仅 ${p.confidence}%，可能影响复现结果`);
    }
  }

  return {
    id: `audit_${Date.now().toString(36)}`,
    paperTitle,
    paperSource,
    auditedAt: new Date().toISOString(),
    parameters: params,
    gaps,
    reproducibilityScore: score,
    scoreBreakdown: breakdown,
    aiAssessment,
    criticalRisks: [...new Set(criticalRisks)],
  };
}
