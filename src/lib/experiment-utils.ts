/**
 * 实验数据映射工具 — toRow / fromRow / parseEmbedding
 *
 * 纯函数，无副作用，无 import.meta.env 访问
 * 可被服务端 server functions 和客户端代码共同导入
 */
import type { Experiment, AttachedFile } from "./labStore";

// ═══════════════════════════════════════════════════════
// DB 行类型
// ═══════════════════════════════════════════════════════

export type ExperimentRow = {
  id: string;
  name: string;
  date: string | null;
  operator: string | null;
  purpose: string | null;
  background: string | null;
  discipline: string | null;
  device_name: string | null;
  device_model: string | null;
  device_vendor: string | null;
  sample_id: string | null;
  sample_batch: string | null;
  sample_source: string | null;
  params: unknown;
  environment: unknown;
  steps: unknown;
  results: string | null;
  notes: string | null;
  source: string | null;
  attached_files: unknown;
  ai_insights: string | null;
  last_parsed_at: string | null;
  knowledge_tags: string[] | null;
  search_text: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
};

// ═══════════════════════════════════════════════════════
// 数据清理（防 PostgreSQL 22P05 错误）
// ═══════════════════════════════════════════════════════

/** 移除 null 字节和无效 Unicode 转义，防止 PG 报错 */
function sanitizeText(s: string | null | undefined): string | null {
  if (!s) return s ?? null;
  return s.replace(/\x00/g, "").replace(/\\u0000/g, "");
}

function sanitizeJson(v: unknown): unknown {
  if (!v) return v;
  try {
    const json = JSON.stringify(v);
    const cleaned = json.replace(/\\u0000/g, "").replace(/\x00/g, "");
    return JSON.parse(cleaned);
  } catch {
    return v;
  }
}

// ═══════════════════════════════════════════════════════
// Experiment → 扁平化 DB 行
// ═══════════════════════════════════════════════════════

export function toRow(e: Experiment, userId?: string): ExperimentRow {
  const _st = [e.name, e.purpose, e.results, e.notes, e.device.name, e.device.model, e.sample.id, e.operator, e.discipline].filter(Boolean).join(" ") || null;
  return {
    id: e.id,
    name: sanitizeText(e.name) || "",
    date: sanitizeText(e.date) || null,
    operator: sanitizeText(e.operator) || null,
    purpose: sanitizeText(e.purpose) || null,
    background: sanitizeText(e.background) || null,
    discipline: sanitizeText(e.discipline) || null,
    device_name: sanitizeText(e.device.name) || null,
    device_model: sanitizeText(e.device.model) || null,
    device_vendor: sanitizeText(e.device.vendor) || null,
    sample_id: sanitizeText(e.sample.id) || null,
    sample_batch: sanitizeText(e.sample.batch) || null,
    sample_source: sanitizeText(e.sample.source) || null,
    params: e.params,
    environment: e.environment,
    steps: e.steps,
    results: sanitizeText(e.results) || null,
    notes: sanitizeText(e.notes) || null,
    source: sanitizeText(e.source) || null,
    attached_files: sanitizeJson(e.attachedFiles),
    ai_insights: sanitizeText(e.aiInsights) || null,
    last_parsed_at: e.lastParsedAt || null,
    knowledge_tags: e.knowledgeTags || [],
    search_text: _st,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: userId ?? null,
  };
}

// ═══════════════════════════════════════════════════════
// DB 行 → Experiment
// ═══════════════════════════════════════════════════════

export function fromRow(r: Record<string, unknown>): Experiment {
  return {
    id: r.id as string,
    name: r.name as string,
    date: (r.date as string) ?? "",
    operator: (r.operator as string) ?? "",
    purpose: (r.purpose as string) ?? "",
    background: (r.background as string) ?? "",
    discipline: (r.discipline as string) ?? "材料科学",
    device: {
      name: (r.device_name as string) ?? "",
      model: (r.device_model as string) ?? "",
      vendor: (r.device_vendor as string) ?? "",
    },
    sample: {
      id: (r.sample_id as string) ?? "",
      batch: (r.sample_batch as string) ?? "",
      source: (r.sample_source as string) ?? "",
    },
    params: (r.params as Experiment["params"]) ?? [],
    environment: (r.environment as Experiment["environment"]) ?? {
      temperature: "",
      humidity: "",
      other: "",
    },
    steps: (r.steps as string[]) ?? [],
    results: (r.results as string) ?? "",
    notes: (r.notes as string) ?? "",
    source: (r.source as string) ?? "",
    attachedFiles: (r.attached_files as AttachedFile[]) ?? [],
    lastParsedAt: (r.last_parsed_at as string) ?? (r.lastParsedAt as string) ?? null,
    embedding: parseEmbedding(r.embedding),
    aiInsights: (r.ai_insights as string) ?? "",
    knowledgeTags: (r.knowledge_tags as string[]) ?? [],
  };
}

// ═══════════════════════════════════════════════════════
// pgvector embedding 解析
// ═══════════════════════════════════════════════════════

/** pgvector 列可能以字符串 `[0.1,0.2,...]` 返回 */
export function parseEmbedding(v: unknown): number[] | null {
  if (Array.isArray(v)) return v as number[];
  if (typeof v === "string") {
    try {
      const arr = JSON.parse(v);
      return Array.isArray(arr) ? arr : null;
    } catch {
      return null;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════
// 构建 DB patch（仅更新提供的字段）
// ═══════════════════════════════════════════════════════

export function buildDbPatch(patch: Partial<Experiment>): Record<string, unknown> {
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.date !== undefined) dbPatch.date = patch.date;
  if (patch.operator !== undefined) dbPatch.operator = patch.operator;
  if (patch.purpose !== undefined) dbPatch.purpose = patch.purpose;
  if (patch.background !== undefined) dbPatch.background = patch.background;
  if (patch.discipline !== undefined) dbPatch.discipline = patch.discipline;
  if (patch.device) {
    if (patch.device.name !== undefined) dbPatch.device_name = patch.device.name;
    if (patch.device.model !== undefined) dbPatch.device_model = patch.device.model;
    if (patch.device.vendor !== undefined) dbPatch.device_vendor = patch.device.vendor;
  }
  if (patch.sample) {
    if (patch.sample.id !== undefined) dbPatch.sample_id = patch.sample.id;
    if (patch.sample.batch !== undefined) dbPatch.sample_batch = patch.sample.batch;
    if (patch.sample.source !== undefined) dbPatch.sample_source = patch.sample.source;
  }
  if (patch.params !== undefined) dbPatch.params = patch.params;
  if (patch.environment !== undefined) dbPatch.environment = patch.environment;
  if (patch.steps !== undefined) dbPatch.steps = patch.steps;
  if (patch.results !== undefined) dbPatch.results = patch.results;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes;
  if (patch.attachedFiles !== undefined) dbPatch.attached_files = patch.attachedFiles;
  if (patch.aiInsights !== undefined) dbPatch.ai_insights = patch.aiInsights;
  if (patch.lastParsedAt !== undefined) dbPatch.last_parsed_at = patch.lastParsedAt;
  if (patch.knowledgeTags !== undefined) dbPatch.knowledge_tags = patch.knowledgeTags;

  // 任一文本字段变更时重建 search_text（混合检索用）
  const textFields = ["name", "purpose", "results", "notes", "operator", "discipline"];
  const hasTextField = textFields.some((k) => (patch as any)[k] !== undefined)
    || patch.device !== undefined
    || patch.sample !== undefined;
  if (hasTextField) {
    const parts = [
      patch.name, patch.purpose, patch.results, patch.notes,
      patch.device?.name, patch.device?.model,
      patch.sample?.id, patch.operator, patch.discipline,
    ].filter(Boolean);
    if (parts.length > 0) dbPatch.search_text = parts.join(" ");
  }

  return dbPatch;
}

// ═══════════════════════════════════════════════════════
// 语义分块 — 将 Experiment 拆为 5 个独立 chunk
// ═══════════════════════════════════════════════════════

export type ExperimentChunk = {
  chunkType: "meta" | "purpose" | "device_sample" | "params_steps" | "results";
  content: string;
};

export function splitExperimentIntoChunks(exp: Experiment): ExperimentChunk[] {
  const chunks: ExperimentChunk[] = [];

  // chunk 1: meta — 谁、什么时候、什么学科
  const metaParts = [
    exp.name,
    exp.date ? `日期: ${exp.date}` : "",
    exp.operator ? `操作人: ${exp.operator}` : "",
    exp.discipline ? `学科: ${exp.discipline}` : "",
  ].filter(Boolean);
  if (metaParts.length > 0) {
    chunks.push({ chunkType: "meta", content: metaParts.join("; ") });
  }

  // chunk 2: purpose — 为什么做
  const purposeParts = [
    exp.purpose ? `目的: ${exp.purpose}` : "",
    exp.background ? `背景: ${exp.background}` : "",
  ].filter(Boolean);
  if (purposeParts.length > 0) {
    chunks.push({ chunkType: "purpose", content: purposeParts.join("; ") });
  }

  // chunk 3: device_sample — 用什么设备和样品
  const dsParts = [
    exp.device.name ? `设备: ${exp.device.name}` : "",
    exp.device.model ? `型号: ${exp.device.model}` : "",
    exp.device.vendor ? `厂家: ${exp.device.vendor}` : "",
    exp.sample.id ? `样品编号: ${exp.sample.id}` : "",
    exp.sample.batch ? `批次: ${exp.sample.batch}` : "",
    exp.sample.source ? `来源: ${exp.sample.source}` : "",
  ].filter(Boolean);
  if (dsParts.length > 0) {
    chunks.push({ chunkType: "device_sample", content: dsParts.join("; ") });
  }

  // chunk 4: params_steps — 实验参数和操作步骤
  const paramsText = exp.params
    .filter((p) => p.name)
    .map((p) => `${p.name}: ${p.value}${p.unit ? " " + p.unit : ""}`)
    .join(", ");
  const stepsText = exp.steps
    .filter((s) => s)
    .map((s, i) => `步骤${i + 1}: ${s}`)
    .join("; ");
  const psParts = [
    paramsText ? `参数: ${paramsText}` : "",
    stepsText ? `步骤: ${stepsText}` : "",
  ].filter(Boolean);
  if (psParts.length > 0) {
    chunks.push({ chunkType: "params_steps", content: psParts.join("; ") });
  }

  // chunk 5: results — 结果和 AI 洞察
  const resultParts = [
    exp.results ? `结果: ${exp.results}` : "",
    exp.notes ? `备注: ${exp.notes}` : "",
    exp.aiInsights ? `AI洞察: ${exp.aiInsights}` : "",
  ].filter(Boolean);
  if (resultParts.length > 0) {
    chunks.push({ chunkType: "results", content: resultParts.join("; ") });
  }

  return chunks;
}
