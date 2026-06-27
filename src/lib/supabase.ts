/**
 * Supabase 客户端 — PostgreSQL 云数据库 + pgvector 向量检索
 *
 * 环境变量（待设置）：
 *   VITE_SUPABASE_URL      — Supabase Project URL
 *   VITE_SUPABASE_ANON_KEY  — Supabase anon public key
 */
import { createClient } from "@supabase/supabase-js";
import type { Experiment, AttachedFile } from "./labStore";

// ═══════════════════════════════════════════════════════
// 客户端
// ═══════════════════════════════════════════════════════

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseKey ?? "placeholder-key",
);

export function isSupabaseReady(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}

// ═══════════════════════════════════════════════════════
// DB ↔ TS 映射
// ═══════════════════════════════════════════════════════

/** TypeScript Experiment → 扁平化 DB 行 */
type ExperimentRow = {
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
  created_at: string;
  updated_at: string;
};

function toRow(e: Experiment): ExperimentRow {
  return {
    id: e.id,
    name: e.name,
    date: e.date || null,
    operator: e.operator || null,
    purpose: e.purpose || null,
    background: e.background || null,
    discipline: e.discipline || null,
    device_name: e.device.name || null,
    device_model: e.device.model || null,
    device_vendor: e.device.vendor || null,
    sample_id: e.sample.id || null,
    sample_batch: e.sample.batch || null,
    sample_source: e.sample.source || null,
    params: e.params,
    environment: e.environment,
    steps: e.steps,
    results: e.results || null,
    notes: e.notes || null,
    source: e.source || null,
    attached_files: e.attachedFiles,
    embedding: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function fromRow(r: Record<string, unknown>): Experiment {
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
    lastParsedAt: (r.lastParsedAt as string) ?? null,
    embedding: parseEmbedding(r.embedding),
    aiInsights: (r.ai_insights as string) ?? "",
  };
}

/** pgvector 列可能以字符串 `[0.1,0.2,...]` 返回 */
function parseEmbedding(v: unknown): number[] | null {
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
// 实验 CRUD
// ═══════════════════════════════════════════════════════

export async function fetchExperiments(): Promise<Experiment[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("experiments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Supabase] fetchExperiments error:", error);
    return [];
  }
  return (data as Record<string, unknown>[]).map(fromRow);
}

export async function insertExperiment(exp: Experiment): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const row = toRow(exp);
  const { error } = await supabase.from("experiments").insert(row);
  if (error) {
    console.error("[Supabase] insertExperiment error:", error);
    return false;
  }
  return true;
}

export async function updateExperimentDB(
  id: string,
  patch: Partial<Experiment>,
): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  // 只映射实际更新的字段
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
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

  const { error } = await supabase
    .from("experiments")
    .update(dbPatch)
    .eq("id", id);
  if (error) {
    console.error("[Supabase] updateExperiment error:", error);
    return false;
  }
  return true;
}

export async function deleteExperimentDB(id: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { error } = await supabase.from("experiments").delete().eq("id", id);
  if (error) {
    console.error("[Supabase] deleteExperiment error:", error);
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════
// 用户配置
// ═══════════════════════════════════════════════════════

export type ProfileRow = {
  id: string;
  name: string | null;
  org: string | null;
  discipline: string | null;
};

export async function fetchProfile(): Promise<ProfileRow | null> {
  if (!isSupabaseReady()) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileRow;
}

export async function upsertProfile(p: {
  name: string;
  org: string;
  discipline: string;
}): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { error } = await supabase.from("profiles").upsert({
    id: "default",
    name: p.name,
    org: p.org,
    discipline: p.discipline,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[Supabase] upsertProfile error:", error);
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════
// Embedding (SiliconFlow BAAI/bge-large-zh-v1.5)
// ═══════════════════════════════════════════════════════

const EMBEDDING_MODEL = "BAAI/bge-large-zh-v1.5";

/**
 * 调用 SiliconFlow Embedding API 生成 1024 维向量
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = import.meta.env.VITE_SF_API_KEY;
  if (!apiKey || !text.trim()) return [];

  try {
    const res = await fetch("https://api.siliconflow.cn/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: [text.slice(0, 512)], // bge-large 最大 512 tokens
      }),
    });
    const json = (await res.json()) as {
      data?: Array<{ embedding: number[] }>;
    };
    return json.data?.[0]?.embedding ?? [];
  } catch (err) {
    console.error("[Embedding] generate error:", err);
    return [];
  }
}

/**
 * 为实验生成 embedding 并写入 DB
 * 拼接 name + purpose + results + steps 作为语义文本
 */
export async function embedExperiment(expId: string): Promise<void> {
  if (!isSupabaseReady()) return;

  const { data } = await supabase
    .from("experiments")
    .select("name, purpose, results, steps")
    .eq("id", expId)
    .maybeSingle();

  if (!data) return;

  const r = data as { name?: string; purpose?: string; results?: string; steps?: unknown };
  const stepsText = Array.isArray(r.steps) ? (r.steps as string[]).join(" ") : "";
  const semanticText = [r.name, r.purpose, r.results, stepsText]
    .filter(Boolean)
    .join(" ");

  if (!semanticText.trim()) return;

  const vec = await generateEmbedding(semanticText);
  if (vec.length === 0) return;

  await supabase
    .from("experiments")
    .update({ embedding: vec, updated_at: new Date().toISOString() })
    .eq("id", expId);
}

// ═══════════════════════════════════════════════════════
// 语义相似度查询 (pgvector)
// ═══════════════════════════════════════════════════════

/**
 * 找到与给定向量最相似的 Top-K 实验
 */
export async function findSimilarExperiments(
  embedding: number[],
  excludeId?: string,
  limit = 5,
): Promise<Array<{ id: string; name: string; similarity: number }>> {
  if (!isSupabaseReady() || embedding.length === 0) return [];

  const { data, error } = await supabase.rpc("match_experiments", {
    query_embedding: embedding,
    match_threshold: 0.6,
    match_count: limit,
  });

  if (error) {
    console.error("[Supabase] findSimilar error:", error);
    return [];
  }

  return (
    (data as Array<{ id: string; name: string; similarity: number }>)
      ?.filter((d) => d.id !== excludeId)
      .slice(0, limit) ?? []
  );
}

/**
 * RAG 问答：问题 → embedding → pgvector 检索 → 返回 Top-K 上下文
 */
export async function ragSearch(
  question: string,
  limit = 3,
): Promise<Array<{ id: string; name: string; text: string; similarity: number }>> {
  const qVec = await generateEmbedding(question);
  if (qVec.length === 0) return [];

  const similar = await findSimilarExperiments(qVec, undefined, limit);
  if (similar.length === 0) return [];

  // 拉完整实验信息拼接上下文
  const { data } = await supabase
    .from("experiments")
    .select("id, name, purpose, results, steps, params")
    .in(
      "id",
      similar.map((s) => s.id),
    );

  if (!data) return [];

  const rows = data as Array<{
    id: string;
    name: string;
    purpose?: string;
    results?: string;
    steps?: unknown;
    params?: unknown;
  }>;

  const simMap = new Map(similar.map((s) => [s.id, s.similarity]));

  return rows.map((r) => {
    const stepsText = Array.isArray(r.steps)
      ? (r.steps as string[]).join("; ")
      : "";
    const paramsText = Array.isArray(r.params)
      ? (r.params as Array<{ name: string; value: string; unit: string }>)
          .map((p) => `${p.name ?? ""}: ${p.value ?? ""}${p.unit ?? ""}`)
          .join(", ")
      : "";
    const text = [r.purpose, r.results, stepsText, paramsText]
      .filter(Boolean)
      .join(" | ");
    return {
      id: r.id,
      name: r.name,
      text: text.slice(0, 1000),
      similarity: simMap.get(r.id) ?? 0,
    };
  });
}

// ═══════════════════════════════════════════════════════
// 真实 RAG 问答 (pgvector + DeepSeek-V3)
// ═══════════════════════════════════════════════════════

export type RagSource = {
  doc: string;
  page: string;
  confidence: string;
  link: string;
};

const RAG_SYSTEM_PROMPT = `你是 LabNote Agent，一个科研实验数据治理助手。
你的回答必须基于提供的实验记录上下文，不要编造数据。
如果上下文中没有相关信息，诚实告知用户"知识库中暂无相关记录"。
回答用中文，简洁专业，标注引用的实验名称和日期。`;

/**
 * 真实 RAG：question → embedding → pgvector → context → DeepSeek-V3
 */
export async function ragAnswerReal(
  question: string,
): Promise<{ answer: string; sources: RagSource[] }> {
  // 1. 向量检索 Top-3 相关实验
  const contexts = await ragSearch(question, 3);

  if (contexts.length === 0) {
    return {
      answer: "知识库中暂无与您问题相关的实验记录。建议：① 先上传实验数据 ② 使用更具体的关键词 ③ 直接在实验卡片中搜索。",
      sources: [],
    };
  }

  // 2. 拼接上下文
  const contextBlock = contexts
    .map(
      (c, i) =>
        `[实验${i + 1}] ${c.name}\n内容：${c.text}\n相似度：${(c.similarity * 100).toFixed(0)}%`,
    )
    .join("\n\n");

  // 3. 调 DeepSeek-V3 生成回答
  const prompt = `基于以下实验记录回答用户问题。\n\n实验记录：\n${contextBlock}\n\n用户问题：${question}\n\n请用2-4句话回答，并引用相关实验名称。`;

  let answer: string;
  try {
    const { chat } = await import("./siliconflow");
    answer = await chat(
      "deepseek-ai/DeepSeek-V3",
      [
        { role: "system", content: RAG_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      512,
    );
  } catch (err) {
    console.error("[RAG] LLM call failed:", err);
    // 回退：直接返回检索结果
    answer =
      `检索到 ${contexts.length} 条相关实验（LLM 暂时不可用）：\n` +
      contexts.map((c) => `• ${c.name}（相似度 ${(c.similarity * 100).toFixed(0)}%）`).join("\n");
  }

  // 4. 构建来源
  const sources: RagSource[] = contexts.map((c) => ({
    doc: c.name,
    page: "实验卡片",
    confidence: `${(c.similarity * 100).toFixed(0)}%`,
    link: `/workbench?id=${c.id}`,
  }));

  return { answer, sources };
}
