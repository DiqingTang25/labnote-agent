/**
 * AI 响应 JSON 提取器 — 零硬编码字段版本
 *
 * 铁律：AI 返回什么就保留什么，绝不丢弃数据。
 * 无法归入已知结构的字段全部进入 properties.extra。
 */

import type { ExperimentDoc, DocProperties } from "./exp-core";
import { createBlankDoc } from "./exp-core";
import type { Template } from "./exp-core";

// ═══════════════════════════════════════════════════════
// JSON 提取 — 鲁棒的多策略解析
// ═══════════════════════════════════════════════════════

export function extractJSON<T = unknown>(text: string): T {
  if (!text || !text.trim()) {
    throw new Error("Empty AI response");
  }

  const trimmed = text.trim();

  // 策略 1: 直接解析
  try { return JSON.parse(trimmed) as T; } catch { /* continue */ }

  // 策略 2: 剥去 markdown 代码块
  const fenceRegex = /```(?:json|javascript|js|text)?\s*\n?([\s\S]*?)\n?```/g;
  let match = fenceRegex.exec(trimmed);
  while (match) {
    try { return JSON.parse(match[1].trim()) as T; } catch { /* try next */ }
    match = fenceRegex.exec(trimmed);
  }

  // 策略 3: 找最外层 { ... }
  const objStart = trimmed.indexOf("{");
  const objEnd = trimmed.lastIndexOf("}");
  if (objStart !== -1 && objEnd > objStart) {
    try { return JSON.parse(trimmed.slice(objStart, objEnd + 1)) as T; } catch { /* continue */ }
  }

  // 策略 4: 找最外层 [ ... ]
  const arrStart = trimmed.indexOf("[");
  const arrEnd = trimmed.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd > arrStart) {
    try { return JSON.parse(trimmed.slice(arrStart, arrEnd + 1)) as T; } catch { /* continue */ }
  }

  // 策略 5: "experiments": [...] 包装
  const expMatch = trimmed.match(/"experiments"\s*:\s*\[[\s\S]*?\]/);
  if (expMatch) {
    try { return JSON.parse(`{${expMatch[0]}}`) as T; } catch { /* continue */ }
  }

  // 策略 6: 修复常见 JSON 错误
  try {
    const fixed = trimmed
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/'/g, '"');
    return JSON.parse(fixed) as T;
  } catch { /* continue */ }

  throw new Error(`Could not extract JSON from AI response. First 200 chars: ${trimmed.slice(0, 200)}`);
}

// ═══════════════════════════════════════════════════════
// 实验卡片解析 — 零硬编码
// ═══════════════════════════════════════════════════════

/**
 * 从 API 原始响应中解析实验卡片数组
 * 保留 AI 返回的所有字段
 */
export function parseAPIResponse(
  rawOutput: string,
  _fileName: string,
  template?: Template,
): Partial<ExperimentDoc>[] {
  const data = extractJSON<unknown>(rawOutput);

  // { experiments: [...] }
  if (data && typeof data === "object" && "experiments" in (data as Record<string, unknown>)) {
    const arr = (data as Record<string, unknown>).experiments;
    if (Array.isArray(arr)) return arr.map((item) => asPartialDoc(item, template));
  }

  // [ {...}, {...} ]
  if (Array.isArray(data)) {
    return data.map((item) => asPartialDoc(item, template));
  }

  // 单个对象
  if (data && typeof data === "object") {
    return [asPartialDoc(data, template)];
  }

  return [];
}

/**
 * 通用字段提取 — 零硬编码
 *
 * AI 返回什么就保留什么。无法归入已知结构的字段放入 extra。
 */
function asPartialDoc(
  item: unknown,
  template?: Template,
): Partial<ExperimentDoc> {
  if (!item || typeof item !== "object") return {};

  const obj = item as Record<string, unknown>;

  // Core fields
  const name = asString(obj.name);
  const experimentType = asString(obj.experimentType) || template?.experimentType || "other";
  const date = asString(obj.date);
  const operator = asString(obj.operator);

  // Properties — AI 返回的整个 properties 对象原样保留
  let properties: DocProperties = {};

  if (obj.properties && typeof obj.properties === "object" && !Array.isArray(obj.properties)) {
    properties = deepSanitize(obj.properties as Record<string, unknown>);
  } else {
    // AI 可能把字段放在顶层而不是 properties 内 — 全部合并进 properties
    const coreKeys = new Set(["name", "experimentType", "date", "operator", "aiInsights", "knowledgeTags", "attachedFiles"]);
    const rawProps: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (!coreKeys.has(key)) {
        rawProps[key] = val;
      }
    }
    properties = deepSanitize(rawProps);

    // 如果有模板但没有 template 元数据，标记
    if (template) {
      (properties as Record<string, unknown>)._meta = {
        templateId: template.id,
        templateVersion: template.version,
      };
    }
  }

  // 确保 extra 存在且不为空
  if (!properties.extra) {
    properties = { ...properties, extra: {} } as DocProperties;
  }

  // AI insights
  const aiInsights = asString(obj.aiInsights) || asString(obj.ai_insights) || "";

  // Knowledge tags
  const knowledgeTags: string[] = Array.isArray(obj.knowledgeTags)
    ? obj.knowledgeTags.map((t: unknown) => asString(t)).filter(Boolean)
    : Array.isArray((obj as any).knowledge_tags)
      ? (obj as any).knowledge_tags.map((t: unknown) => asString(t)).filter(Boolean)
      : [];

  return {
    name,
    experimentType,
    date,
    operator,
    properties,
    aiInsights,
    knowledgeTags,
  };
}

/**
 * 深度 sanitize — 递归清理 null bytes + 保留所有嵌套结构
 */
function deepSanitize(obj: Record<string, unknown>): DocProperties {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) {
      result[key] = null;
    } else if (typeof val === "string") {
      result[key] = val.replace(/\x00/g, "").replace(/\\u0000/g, "");
    } else if (Array.isArray(val)) {
      result[key] = val.map((item) =>
        typeof item === "object" && item !== null
          ? deepSanitize(item as Record<string, unknown>)
          : typeof item === "string"
            ? item.replace(/\x00/g, "").replace(/\\u0000/g, "")
            : item,
      );
    } else if (typeof val === "object") {
      result[key] = deepSanitize(val as Record<string, unknown>);
    } else {
      result[key] = val;
    }
  }
  return result as DocProperties;
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return String(v);
  return "";
}

// ═══════════════════════════════════════════════════════
// 归一化 — 填充完整 ExperimentDoc
// ═══════════════════════════════════════════════════════

let _idCounter = 0;

function newExpId(): string {
  _idCounter++;
  return `exp_${Date.now().toString(36)}${_idCounter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * 将 AI 解析的部分结果归一化为完整的 ExperimentDoc
 * 核心字段（name/date/operator/experimentType）优先级：raw → defaults
 * properties 全部保留，只额外确保 extra 桶存在
 */
export function normalizeExperiment(
  raw: Partial<ExperimentDoc>,
  defaults?: Partial<ExperimentDoc>,
): ExperimentDoc {
  const now = new Date().toISOString();
  const dateStr = now.slice(0, 16).replace("T", " ");

  const props: DocProperties = {
    extra: {},
    ...(raw.properties || {}),
  };

  // Ensure extra exists
  if (!props.extra) (props as Record<string, unknown>).extra = {};

  return {
    id: defaults?.id ?? raw.id ?? newExpId(),
    name: raw.name || defaults?.name || "未命名实验",
    experimentType: raw.experimentType || defaults?.experimentType || "other",
    date: raw.date || defaults?.date || dateStr,
    operator: raw.operator || defaults?.operator || "",
    userId: defaults?.userId ?? raw.userId ?? "",
    createdAt: defaults?.createdAt ?? raw.createdAt ?? now,
    updatedAt: defaults?.updatedAt ?? raw.updatedAt ?? now,
    version: raw.version ?? defaults?.version ?? 1,
    properties: props,
    attachedFiles: raw.attachedFiles || defaults?.attachedFiles || [],
    aiInsights: raw.aiInsights || defaults?.aiInsights || "",
    knowledgeTags: raw.knowledgeTags || defaults?.knowledgeTags || [],
    lastParsedAt: raw.lastParsedAt ?? defaults?.lastParsedAt ?? null,
    embedding: raw.embedding ?? defaults?.embedding ?? null,
  };
}
