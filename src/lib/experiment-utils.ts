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
  return {
    id: e.id,
    name: sanitizeText(e.name) || "",
    date: sanitizeText(e.date) || null,
    operator: sanitizeText(e.operator) || null,
    purpose: sanitizeText(e.purpose) || null,
    background: sanitizeText(e.background) || null,
    discipline: sanitizeText(e.discipline) || null,
    device_name: e.device.name || null,
    device_model: e.device.model || null,
    device_vendor: e.device.vendor || null,
    sample_id: e.sample.id || null,
    sample_batch: e.sample.batch || null,
    sample_source: e.sample.source || null,
    params: e.params,
    environment: e.environment,
    steps: e.steps,
    results: sanitizeText(e.results) || null,
    notes: sanitizeText(e.notes) || null,
    source: sanitizeText(e.source) || null,
    attached_files: sanitizeJson(e.attachedFiles),
    // v2 columns — 需要先运行 supabase-schema-v2.sql 迁移
    // ai_insights: e.aiInsights || null,
    // last_parsed_at: e.lastParsedAt || null,
    // knowledge_tags: e.knowledgeTags || [],
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
  return dbPatch;
}
