/**
 * 实验数据映射工具 — ExperimentDoc ↔ DB Row
 *
 * 零硬编码字段。8 个核心索引列直接映射，其余全部通过 properties JSONB 存储。
 * RAG chunking 由模板 fieldGroups 驱动，不再硬编码 5 种 chunk。
 */

import type { ExperimentDoc, AttachedFile, DocProperties, Template } from "./exp-core";
import { flattenProperties, stripEmpty } from "./property-utils";

// ═══════════════════════════════════════════════════════
// DB 行类型 — 仅 8 核心列 + JSONB 列
// ═══════════════════════════════════════════════════════

export type ExperimentRow = {
  id: string;
  name: string;
  experiment_type: string;
  date: string;
  operator: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  version: number;
  // Dynamic
  properties: unknown;       // JSONB — all experiment data
  files: unknown;             // JSONB — attached files metadata
  // AI
  ai_insights: string | null;
  knowledge_tags: string[] | null;
  last_parsed_at: string | null;
  embedding: unknown;         // VECTOR(1024)
  search_text: string | null; // FTS index
  source: string | null;
};

// ═══════════════════════════════════════════════════════
// Sanitize helpers
// ═══════════════════════════════════════════════════════

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
// ExperimentDoc → DB Row
// ═══════════════════════════════════════════════════════

export function toRow(e: ExperimentDoc, userId?: string): ExperimentRow {
  // 从 properties 动态提取所有文本值用于全文检索
  const textValues: string[] = [e.name, e.operator, e.experimentType];
  function collectTexts(obj: Record<string, unknown>, prefix: string) {
    for (const [k, v] of Object.entries(obj)) {
      if (k === "_meta") continue;
      if (typeof v === "string" && v.length > 0) textValues.push(v);
      else if (typeof v === "number") textValues.push(String(v));
      else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        collectTexts(v as Record<string, unknown>, k);
      }
    }
  }
  collectTexts(e.properties, "");
  const _st = textValues.join(" ") || null;

  return {
    id: e.id,
    name: sanitizeText(e.name) || "",
    experiment_type: e.experimentType || "other",
    date: sanitizeText(e.date) || "",
    operator: sanitizeText(e.operator) || "",
    user_id: userId ?? e.userId ?? null,
    created_at: e.createdAt || new Date().toISOString(),
    updated_at: e.updatedAt || new Date().toISOString(),
    version: e.version ?? 1,
    properties: sanitizeJson(stripEmpty(e.properties)),
    files: sanitizeJson(e.attachedFiles),
    ai_insights: sanitizeText(e.aiInsights) || null,
    knowledge_tags: e.knowledgeTags || [],
    last_parsed_at: e.lastParsedAt || null,
    embedding: null, // handled by embedExperiment() separately
    search_text: _st,
    source: sanitizeText(
      (e.properties as Record<string, unknown>)?.["source"] as string
    ) || "LabNote",
  };
}

function getPropStr(props: DocProperties, path: string): string {
  const parts = path.split(".");
  let current: unknown = props;
  for (const p of parts) {
    if (!current || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[p];
  }
  if (typeof current === "string") return current;
  if (typeof current === "number") return String(current);
  return "";
}

// ═══════════════════════════════════════════════════════
// DB Row → ExperimentDoc
// ═══════════════════════════════════════════════════════

export function fromRow(r: Record<string, unknown>): ExperimentDoc {
  return {
    id: r.id as string,
    name: r.name as string,
    experimentType: (r.experiment_type as string) || "other",
    date: (r.date as string) ?? "",
    operator: (r.operator as string) ?? "",
    userId: (r.user_id as string) ?? "",
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    updatedAt: (r.updated_at as string) ?? new Date().toISOString(),
    version: (r.version as number) ?? 1,
    properties: (r.properties as DocProperties) ?? {},
    attachedFiles: (r.files as AttachedFile[]) ?? (r.attached_files as AttachedFile[]) ?? [],
    aiInsights: (r.ai_insights as string) ?? (r.aiInsights as string) ?? "",
    knowledgeTags: (r.knowledge_tags as string[]) ?? (r.knowledgeTags as string[]) ?? [],
    lastParsedAt: (r.last_parsed_at as string) ?? (r.lastParsedAt as string) ?? null,
    embedding: parseEmbedding(r.embedding),
  };
}

// ═══════════════════════════════════════════════════════
// pgvector embedding parse
// ═══════════════════════════════════════════════════════

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
// Build DB patch — only updates changed fields
// ═══════════════════════════════════════════════════════

export function buildDbPatch(
  patch: Partial<ExperimentDoc>,
): Record<string, unknown> {
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Core columns
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.experimentType !== undefined) dbPatch.experiment_type = patch.experimentType;
  if (patch.date !== undefined) dbPatch.date = patch.date;
  if (patch.operator !== undefined) dbPatch.operator = patch.operator;
  if (patch.version !== undefined) dbPatch.version = patch.version;

  // JSONB — whole-object replace for properties and files
  if (patch.properties !== undefined) {
    dbPatch.properties = sanitizeJson(stripEmpty(patch.properties));
  }
  if (patch.attachedFiles !== undefined) {
    dbPatch.files = sanitizeJson(patch.attachedFiles);
  }

  // AI metadata
  if (patch.aiInsights !== undefined) dbPatch.ai_insights = patch.aiInsights;
  if (patch.knowledgeTags !== undefined) dbPatch.knowledge_tags = patch.knowledgeTags;
  if (patch.lastParsedAt !== undefined) dbPatch.last_parsed_at = patch.lastParsedAt;

  // Rebuild search_text dynamically from all properties
  if (patch.name !== undefined || patch.operator !== undefined || patch.properties !== undefined) {
    const textValues: string[] = [patch.name, patch.operator].filter(Boolean) as string[];
    if (patch.properties) {
      function collect(obj: Record<string, unknown>) {
        for (const [k, v] of Object.entries(obj)) {
          if (k === "_meta") continue;
          if (typeof v === "string" && v.length > 0) textValues.push(v);
          else if (typeof v === "number") textValues.push(String(v));
          else if (typeof v === "object" && v !== null && !Array.isArray(v)) collect(v as Record<string, unknown>);
        }
      }
      collect(patch.properties as Record<string, unknown>);
    }
    if (textValues.length > 0) dbPatch.search_text = textValues.join(" ");
  }

  return dbPatch;
}

// ═══════════════════════════════════════════════════════
// RAG Chunking — template fieldGroups 驱动
// ═══════════════════════════════════════════════════════

export type ExperimentChunk = {
  chunkType: string;
  content: string;
};

/**
 * 按模板 fieldGroups 拆分实验为 RAG chunks
 * 每个 group 生成一个 chunk，extra 单独一个 chunk
 */
export function splitExperimentIntoChunks(
  doc: ExperimentDoc,
  template?: Template,
): ExperimentChunk[] {
  const chunks: ExperimentChunk[] = [];

  // Meta chunk
  const metaParts = [
    doc.name,
    `日期: ${doc.date}`,
    `操作人: ${doc.operator}`,
    `类型: ${doc.experimentType}`,
  ];
  chunks.push({ chunkType: "meta", content: metaParts.join("; ") });

  // Template groups
  if (template) {
    for (const group of template.fieldGroups) {
      const lines: string[] = [];
      for (const field of group.fields) {
        const val = getPropStr(doc.properties, field.path);
        if (val) lines.push(`${field.label}: ${val}`);
      }

      // Also include any nested properties in this group
      const prefix = group.id + ".";
      for (const [key, val] of Object.entries(doc.properties)) {
        if (key.startsWith(prefix)) {
          lines.push(`${key}: ${JSON.stringify(val)}`);
        }
      }

      if (lines.length > 0) {
        chunks.push({
          chunkType: group.chunkType ?? "group",
          content: `[${group.label}] ${lines.join("; ")}`,
        });
      }
    }
  }

  // Extra chunk — all unclassified data
  const extra = doc.properties["extra"] as Record<string, unknown> | undefined;
  if (extra && Object.keys(extra).length > 0) {
    const extraLines = Object.entries(extra).map(
      ([k, v]) => `${k}: ${JSON.stringify(v)}`,
    );
    chunks.push({
      chunkType: "extra",
      content: `[未归类数据] ${extraLines.join("; ")}`,
    });
  }

  // AI insights
  if (doc.aiInsights) {
    chunks.push({
      chunkType: "results",
      content: `[AI洞察] ${doc.aiInsights}`,
    });
  }

  return chunks;
}
