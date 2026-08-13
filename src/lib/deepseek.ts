/**
 * AI API — 文本解析与对话
 *
 * AI 调用通过 server functions 代理 — API key 仅在服务端
 * Prompt 由模板动态生成（不再硬编码字段列表）
 */

import type { ScanResult, AuditLogEntry } from "./sanitizer";
import { scanSensitivity, applySanitization, createAuditEntry, persistAuditEntry } from "./sanitizer";
import type { Template } from "./exp-core";
import { GENERIC_TEMPLATE, getTemplate } from "./templates/presets";
import {
  buildExtractPrompt,
  buildAutofillPrompt,
  buildEvaluatePrompt,
  buildReparsePrompt,
  buildMergePrompt,
  classifyExperimentType,
} from "./prompt-builder";

// ===== 模型 ID =====
export const MODEL_TEXT = "d8j2d4r9dhtg6s3fevfg";
export const MODEL_VISION = "d95koqj7u3anoctav5sg";

/** 脱敏回调 — UI 层实现，返回脱敏后的文本或 null 表示取消 */
export type SanitizeHook = (
  scan: ScanResult,
  originalText: string,
) => Promise<{ action: "sanitize" | "send_raw" | "cancel"; sanitizedText?: string }>;

/** 脱敏配置 */
export type SanitizeConfig = {
  /** 是否启用脱敏检测 */
  enabled: boolean;
  /** 脱敏回调（UI 确认弹窗）。如果未提供，默认行为：高风险 → 报错，中低风险 → 自动脱敏 */
  onSensitive?: SanitizeHook;
  /** 数据类型（用于审计日志） */
  dataType?: AuditLogEntry["dataType"];
  /** 用户 ID */
  userId?: string;
};

export async function chat(
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  maxTokens = 2048,
  sanitize?: SanitizeConfig,
): Promise<string> {
  // ── 脱敏检测 ──
  if (sanitize?.enabled) {
    const textContent = extractTextContent(messages);
    const scan = scanSensitivity(textContent);

    if (scan.hasSensitive) {
      let sendText = textContent;

      if (sanitize.onSensitive) {
        const decision = await sanitize.onSensitive(scan, textContent);
        if (decision.action === "cancel") {
          throw new SanitizeBlockedError(scan);
        }
        if (decision.action === "sanitize" && decision.sanitizedText) {
          sendText = decision.sanitizedText;
        }
      } else {
        if (scan.highRiskCount > 0) {
          throw new SanitizeBlockedError(scan);
        }
        const result = applySanitization(textContent, scan.matches);
        sendText = result.sanitized;
      }

      if (sendText !== textContent) {
        messages = rebuildMessagesWithText(messages, sendText);
      }

      const audit = await createAuditEntry({
        dataType: sanitize.dataType ?? "paper",
        targetApi: "DeepSeek",
        model,
        content: sendText,
        sanitized: sendText !== textContent,
        sanitizeStrategies: sendText !== textContent ? ["mask", "generalize", "placeholder"] : [],
        sensitivityMatchCount: scan.matches.length,
        userConfirmation: sanitize.onSensitive ? "manual_approve" : "auto_sanitized",
        userId: sanitize.userId,
      });
      persistAuditEntry(audit).catch(() => {});
    } else {
      const audit = await createAuditEntry({
        dataType: sanitize.dataType ?? "paper",
        targetApi: "DeepSeek",
        model,
        content: textContent,
        sanitized: false,
        sensitivityMatchCount: 0,
        userConfirmation: "none_needed",
        userId: sanitize.userId,
      });
      persistAuditEntry(audit).catch(() => {});
    }
  }

  // 通过 server function 代理（API key 在服务端）
  const { chatCompletion } = await import("./api/ai.functions");
  return chatCompletion({
    data: {
      model,
      messages,
      maxTokens,
      temperature: 0.3,
      sanitized: sanitize?.enabled ?? false,
    },
  });
}

/** 脱敏检测被阻断时抛出的错误 */
export class SanitizeBlockedError extends Error {
  scan: ScanResult;
  constructor(scan: ScanResult) {
    super(`数据包含 ${scan.matches.length} 项敏感信息，已阻止发送：${scan.summary}`);
    this.name = "SanitizeBlockedError";
    this.scan = scan;
  }
}

/** 提取消息中的纯文本内容（用于扫描） */
function extractTextContent(messages: Array<{ role: string; content: unknown }>): string {
  const parts: string[] = [];
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      parts.push(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content as Array<{ type?: string; text?: string }>) {
        if (block.type === "text" && block.text) {
          parts.push(block.text);
        }
      }
    }
  }
  return parts.join("\n");
}

/** 将脱敏后的文本重建到 messages 中 */
function rebuildMessagesWithText(
  messages: Array<{ role: string; content: unknown }>,
  newText: string,
): Array<{ role: string; content: unknown }> {
  return messages.map((msg) => {
    if (typeof msg.content === "string") {
      return { ...msg, content: newText };
    }
    if (Array.isArray(msg.content)) {
      return {
        ...msg,
        content: (msg.content as Array<{ type: string; text?: string }>).map((block) => {
          if (block.type === "text" && block.text) {
            return { ...block, text: newText };
          }
          return block;
        }),
      };
    }
    return msg;
  });
}

// ===== 文件直传 Supabase Storage（客户端，无大小限制）=====

const STORAGE_BUCKET = "experiment-files";

export async function uploadFileToStorage(
  file: File,
  userId: string,
  expId: string,
): Promise<{ url: string; path: string } | null> {
  try {
    const { supabase } = await import("./supabase");
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-一-鿿]/g, "_");
    const path = `${userId}/${expId}/${timestamp}-${safeName}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      console.error("[Storage] Upload failed:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    return { url: urlData.publicUrl, path };
  } catch (err) {
    console.error("[Storage] Upload failed:", err);
    return null;
  }
}

// ===== 文件 → base64 =====
export async function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(",");
      const mime = header.split(":")[1].split(";")[0];
      resolve({ base64, mime });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== 图片解析 =====
export async function parseImage(imageBase64: string, mime: string, fileName: string): Promise<string> {
  return chat(MODEL_VISION, [
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:${mime};base64,${imageBase64}` },
        },
        {
          type: "text",
          text: `分析这张科研实验图片（${fileName}）。识别：图像类型(SEM/TEM/XRD/操作照片/其他)、材料、形貌、标尺、仪器、关键观察点。用中文JSON格式输出，不要其他文字。`,
        },
      ],
    },
  ]);
}

// ===== 文本文件 → 结构化实验数据 =====
const EXTRACT_PROMPT = `你是科研数据治理专家。从以下文件内容中提取实验信息。

【重要】输出纯JSON（不要markdown代码块），包含以下字段。全面提取：实验类型、材料试剂（含CAS号/纯度/批次/供应商）、仪器设备（含型号/序列号）、协议SOP名称、质控信息等。无法推断的字段填空字符串""或空数组[]。

输出格式：
{
  "experiments": [{
    "name": "简洁实验名称",
    "experimentType": "synthesis|characterization|measurement|simulation|other",
    "date": "YYYY-MM-DD HH:mm",
    "operator": "操作人",
    "purpose": "实验目的",
    "background": "背景说明",
    "hypothesis": "实验假设（如有）",
    "conclusion": "实验结论（如有）",
    "discipline": "学科",
    "device": {"name": "主要设备名", "model": "型号", "vendor": "厂家"},
    "instruments": [{"name": "仪器名", "model": "型号", "vendor": "厂家", "serialNumber": "序列号（如有）"}],
    "materials": [{"name": "材料名", "casNumber": "CAS号（如有）", "purity": "纯度", "lotNumber": "批次号", "supplier": "供应商", "amount": "用量", "role": "reactant|catalyst|solvent|substrate|reference|standard|other"}],
    "sample": {"id": "样品编号", "batch": "批次", "source": "来源"},
    "params": [{"name": "参数名", "value": "值", "unit": "单位"}],
    "environment": {"temperature": "温度", "humidity": "湿度", "other": "其他条件"},
    "protocol": {"name": "SOP/协议名称（如有）", "version": "版本（如有）"},
    "steps": ["步骤1"],
    "observations": [{"timestamp": "时间", "type": "visual|measurement|anomaly|note", "content": "观察内容"}],
    "results": "结果摘要",
    "notes": "异常备注",
    "controls": [{"type": "positive|negative|blank|standard", "name": "对照名称", "expectedResult": "预期结果（如有）"}],
    "replicates": 1,
    "qcStatus": "na|pending|passed|failed",
    "source": "文件名",
    "aiInsights": "数据质量评估、实验间关联、改进建议、潜在风险等AI观察",
    "knowledgeTags": ["标签1", "标签2"]
  }]
}`;

export async function parseTextFile(text: string, fileName: string): Promise<string>;
export async function parseTextFile(text: string, fileName: string, template: Template): Promise<string>;
export async function parseTextFile(text: string, fileName: string, template?: Template): Promise<string> {
  const content = text.slice(0, 12000);
  const tpl = template ?? GENERIC_TEMPLATE;
  const prompt = buildExtractPrompt(tpl);

  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: `${prompt}\n\n文件名：${fileName}\n内容：\n${content}`,
    },
  ], 8192);
}

// ===== 带 Token-level 置信度校准的提取 =====

import type { CalibratedResult } from "./confidence";

export async function parseTextFileWithConfidence(
  text: string,
  fileName: string,
): Promise<{ raw: string; calibrated: CalibratedResult | null }> {
  const content = text.slice(0, 12000);
  const { calibratedExtract } = await import("./confidence");

  try {
    const calibrated = await calibratedExtract(MODEL_TEXT, [
      {
        role: "user",
        content: `${EXTRACT_PROMPT}\n\n文件名：${fileName}\n内容：\n${content}`,
      },
    ], 8192);

    return { raw: JSON.stringify(calibrated.data), calibrated };
  } catch (err) {
    console.warn("[parseTextFileWithConfidence] logprobs calibration failed, falling back:", String(err).slice(0, 80));
    // 降级到普通提取
    const raw = await parseTextFile(text, fileName);
    return { raw, calibrated: null };
  }
}

// ===== CSV 预分析引擎 =====

type ColumnAnalysis = {
  name: string;
  type: "number" | "datetime" | "text";
  count: number;
  min?: number;
  max?: number;
  mean?: number;
  trend?: "上升" | "下降" | "稳定" | "波动";
  uniqueCount?: number;
  samples?: string[];
  anomalies?: string[];
};

function analyzeCSV(csvContent: string): {
  headers: string[];
  rowCount: number;
  columns: ColumnAnalysis[];
  summary: string;
} {
  const lines = csvContent.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { headers: [], rowCount: 0, columns: [], summary: "CSV 文件为空或只有一行" };
  }

  let sep = ",";
  const firstLine = lines[0];
  const sepCounts: Record<string, number> = { ",": 0, "\t": 0, ";": 0 };
  for (const s of [",", "\t", ";"]) {
    sepCounts[s] = firstLine.split(s).length;
  }
  const bestSep = Object.entries(sepCounts).sort((a, b) => b[1] - a[1])[0];
  if (bestSep[1] > 1) sep = bestSep[0];

  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells.length >= headers.length) rows.push(cells);
    else if (cells.length > 1) {
      while (cells.length < headers.length) cells.push("");
      rows.push(cells);
    }
  }

  const rowCount = rows.length;

  const columns: ColumnAnalysis[] = headers.map((name, ci) => {
    const values = rows.map((r) => r[ci] ?? "");
    const nonEmpty = values.filter((v) => v !== "" && v !== "-" && v !== "NA");
    const numValues = nonEmpty.map((v) => parseFloat(v)).filter((n) => !isNaN(n));
    const isNumeric = numValues.length > nonEmpty.length * 0.7;

    if (isNumeric) {
      const min = Math.min(...numValues);
      const max = Math.max(...numValues);
      const mean = numValues.reduce((a, b) => a + b, 0) / numValues.length;

      let trend: ColumnAnalysis["trend"] = "稳定";
      const firstHalf = numValues.slice(0, Math.floor(numValues.length / 2));
      const secondHalf = numValues.slice(Math.floor(numValues.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const change = secondAvg - firstAvg;
      const range = max - min;
      if (range > 0) {
        const pctChange = Math.abs(change) / range;
        if (pctChange > 0.3) trend = change > 0 ? "上升" : "下降";
        else if (pctChange > 0.1) trend = "波动";
      }

      return { name, type: "number" as const, count: numValues.length, min, max, mean, trend };
    }

    const unique = [...new Set(nonEmpty)];
    return {
      name,
      type: "text" as const,
      count: nonEmpty.length,
      uniqueCount: unique.length,
      samples: unique.slice(0, 5),
    };
  });

  const parts: string[] = [];
  parts.push(`CSV 文件分析：${rowCount} 行数据，${headers.length} 列\n`);

  for (const col of columns) {
    if (col.type === "number") {
      parts.push(`列 [${col.name}]: 数值型, 范围 ${col.min} ~ ${col.max}, 均值 ${col.mean?.toFixed(2)}, 趋势: ${col.trend}`);
    } else {
      parts.push(`列 [${col.name}]: 文本型, ${col.uniqueCount} 种不同值, 示例: ${col.samples?.join(", ")}`);
    }
  }

  return { headers, rowCount, columns, summary: parts.join("\n") };
}

// ===== CSV 数据解析（带预分析）=====
export async function parseCSV(csvContent: string, fileName: string, template?: Template): Promise<string> {
  const analysis = analyzeCSV(csvContent);
  const rawSample = csvContent.slice(0, 1000);
  const tpl = template ?? GENERIC_TEMPLATE;
  const prompt = buildExtractPrompt(tpl);

  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: `分析这个科研 CSV 数据文件（${fileName}）。

【数据预分析结果】
${analysis.summary}

【原始数据样本（前几行）】
${rawSample}

请根据预分析结果判断实验数据类型，提取可转化为实验卡片的信息。aiInsights 中写明数据质量（是否有缺失/异常）、趋势判断、后续建议。
${prompt}`,
    },
  ], 8192);
}

// ===== 语音转录文本解析 =====
export async function parseTranscript(text: string, fileName: string): Promise<string> {
  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: `${EXTRACT_PROMPT}\n\n这是一段语音转录文本（${fileName}），包含口语化的实验记录。注意口语中可能有隐含信息（语气强调的异常、模糊的时间表述等），请提取并在aiInsights中标注。\n\n${text.slice(0, 10000)}`,
    },
  ], 8192);
}

// ===== AI 补全缺失字段 =====

const AUTOFILL_PROMPT = `你是科研实验专家。根据已有字段，推断并补全以下实验卡片中缺失或明显为占位值的信息。

【规则】
- 已有有效值的字段保持原样，不要改动
- 空字符串、"(AI 推断 · 待确认)"、"(AI 推断型号)" 这类占位符表示缺失，需要推断
- 基于实验名称、目的、设备、样品等已有信息进行合理推断
- 推断结果后面标注 "AI推断" 以便人工复核
- 无法推断的字段保持空字符串
- 注意补充：experimentType、materials（含CAS号/纯度）、instruments（含校准状态）、protocol、hypothesis、conclusion、controls、replicates

【输出格式】纯JSON（不要markdown代码块）：
{"name":"","experimentType":"synthesis|...","date":"","operator":"","purpose":"","background":"","hypothesis":"","conclusion":"","discipline":"","device":{"name":"","model":"","vendor":""},"instruments":[{"name":"","model":"","vendor":""}],"materials":[{"name":"","role":"reactant|..."}],"sample":{"id":"","batch":"","source":""},"params":[{"name":"","value":"","unit":""}],"environment":{"temperature":"","humidity":"","other":""},"protocol":{"name":"","version":""},"steps":[""],"results":"","notes":"","controls":[{"type":"standard|...","name":""}],"replicates":1,"qcStatus":"na|pending|passed|failed","aiInsights":""}`;

export async function autoFillExperiment(
  doc: { name: string; experimentType: string; date: string; operator: string; properties: Record<string, unknown> },
): Promise<string> {
  const input = JSON.stringify({ name: doc.name, experimentType: doc.experimentType, date: doc.date, operator: doc.operator, properties: doc.properties }, null, 2);
  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: `${AUTOFILL_PROMPT}\n\n当前实验卡片：\n${input}`,
    },
  ], 4096);
}

// ===== AI 评估可信度与建议 =====

const EVALUATE_PROMPT = `你是科研实验质量审核专家。评估以下实验卡片的完整性与可信度。

【输出格式】纯JSON（不要markdown代码块）：
{"trustScore":85,"completeness":{"total":24,"filled":20},"issues":[{"field":"字段路径","severity":"high|medium|low","suggestion":"具体建议"}],"strengths":["优点1"],"riskSummary":"一句话风险总结"}`;

export async function evaluateExperimentTrust(experiment: {
  name: string; date: string; operator: string; purpose: string; background: string;
  discipline: string; device: { name: string; model: string; vendor: string };
  sample: { id: string; batch: string; source: string };
  params: Array<{ name: string; value: string; unit: string }>;
  environment: { temperature: string; humidity: string; other: string };
  steps: string[]; results: string; notes: string;
  aiInsights?: string;
}): Promise<string> {
  const input = JSON.stringify(experiment, null, 2);
  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: `${EVALUATE_PROMPT}\n\n实验卡片：\n${input}`,
    },
  ], 2048);
}

// ===== AI 重新解析实验文件 =====

const REPARSE_PROMPT = `你是科研数据治理专家。以下是之前已解析的实验卡片和关联文件的文本内容。请重新分析文件内容，更新实验卡片中可能遗漏或错误的信息。

【规则】
- 保留原有正确的字段值
- 如果文件内容揭示了新信息，补充到对应字段
- 如果发现原有字段与文件内容矛盾，以文件内容为准并标注"🔧修正"
- 特别注意提取：experimentType、materials（CAS号/纯度/批次号）、instruments（序列号/校准日期）、protocol名称、hypothesis、conclusion、质控信息
- aiInsights 中总结本次重新解析的发现

【输出格式】纯JSON，与输入结构一致（不要markdown代码块）。`;

export async function reparseExperimentFiles(
  doc: { name: string; experimentType: string; date: string; operator: string; properties: Record<string, unknown> },
  fileContents: Array<{ name: string; textContent: string }>,
): Promise<string> {
  const expJson = JSON.stringify({ name: doc.name, experimentType: doc.experimentType, date: doc.date, operator: doc.operator, properties: doc.properties }, null, 2);
  const filesText = fileContents
    .map((f) => `=== 文件: ${f.name} ===\n${f.textContent.slice(0, 6000)}`)
    .join("\n\n");

  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: `${REPARSE_PROMPT}\n\n当前实验卡片：\n${expJson}\n\n关联文件内容：\n${filesText}`,
    },
  ], 8192);
}

// ===== 综合解析结果，去重合并为最终实验卡片 =====
export async function mergeResults(
  allResults: Array<{ fileName: string; fileType: string; rawOutput: string }>,
  template?: Template,
): Promise<string> {
  const summary = allResults
    .map((r) => `[${r.fileType}] ${r.fileName}:\n${r.rawOutput.slice(0, 1500)}`)
    .join("\n\n---\n\n");

  const tpl = template ?? GENERIC_TEMPLATE;
  const prompt = buildMergePrompt(tpl, allResults);

  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: prompt,
    },
  ], 4096);
}
