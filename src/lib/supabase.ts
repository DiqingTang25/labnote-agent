/**
 * Supabase 客户端 — PostgreSQL 云数据库 + pgvector 向量检索
 *
 * 使用 @supabase/ssr 的 createBrowserClient，自动附加 auth token
 * RLS 策略确保用户只能访问自己的数据
 *
 * AI 调用（embedding / RAG）已迁移到 server functions：
 *   - generateEmbedding → src/lib/api/ai.functions.ts
 *   - ragSearch / ragAnswer  → src/lib/api/rag.functions.ts
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Experiment } from "./labStore";
import { toRow, fromRow, buildDbPatch } from "./experiment-utils";
import type { ExperimentRow } from "./experiment-utils";

export type { ExperimentRow };
export { toRow, fromRow, parseEmbedding } from "./experiment-utils";

// ═══════════════════════════════════════════════════════
// 客户端
// ═══════════════════════════════════════════════════════

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Lazy init：SSR 期间避免访问浏览器 API
let _supabase: ReturnType<typeof createBrowserClient> | null = null;

function getSupabase() {
  if (typeof window === "undefined") {
    // SSR：返回占位客户端
    return createBrowserClient(
      supabaseUrl ?? "https://placeholder.supabase.co",
      supabaseKey ?? "placeholder-key",
    );
  }
  if (!_supabase) {
    _supabase = createBrowserClient(
      supabaseUrl ?? "https://placeholder.supabase.co",
      supabaseKey ?? "placeholder-key",
    );
  }
  return _supabase;
}

export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_, prop) { return (getSupabase() as any)[prop]; },
});

export function isSupabaseReady(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
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

export async function insertExperiment(
  exp: Experiment,
  userId?: string,
): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  // 如果没有提供 userId，尝试从 session 获取
  let uid = userId;
  if (!uid) {
    const { data: sessionData } = await supabase.auth.getSession();
    uid = sessionData.session?.user?.id;
  }
  const row = toRow(exp, uid);
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
  const dbPatch = buildDbPatch(patch);
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
  user_id?: string | null;
};

export async function fetchProfile(): Promise<ProfileRow | null> {
  if (!isSupabaseReady()) return null;

  // 获取当前用户
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
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

  // 获取当前用户
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;

  const { error } = await supabase.from("profiles").upsert({
    user_id: userId,
    name: p.name,
    org: p.org,
    discipline: p.discipline,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) {
    console.error("[Supabase] upsertProfile error:", error);
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════
// Embedding — 调用服务端 server function
// ═══════════════════════════════════════════════════════

/**
 * 为实验生成 embedding 并写入 DB
 * embedding 生成通过 server function（API key 不暴露）
 */
export async function embedExperiment(expId: string): Promise<void> {
  if (!isSupabaseReady()) return;

  const { data } = await supabase
    .from("experiments")
    .select("name, purpose, results, steps")
    .eq("id", expId)
    .maybeSingle();

  if (!data) return;

  const r = data as {
    name?: string;
    purpose?: string;
    results?: string;
    steps?: unknown;
  };
  const stepsText = Array.isArray(r.steps)
    ? (r.steps as string[]).join(" ")
    : "";
  const semanticText = [r.name, r.purpose, r.results, stepsText]
    .filter(Boolean)
    .join(" ");

  if (!semanticText.trim()) return;

  // 通过 server function 生成 embedding（API key 在服务端）
  const { generateEmbedding } = await import("./api/ai.functions");
  const vec = await generateEmbedding({ data: { text: semanticText } });

  if (!Array.isArray(vec) || vec.length === 0) return;

  await supabase
    .from("experiments")
    .update({ embedding: vec, updated_at: new Date().toISOString() })
    .eq("id", expId);
}

// ═══════════════════════════════════════════════════════
// 语义相似度查询
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
    filter_user_id: null,
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

// ═══════════════════════════════════════════════════════
// RAG 问答 — 委托给 server functions
// ═══════════════════════════════════════════════════════

export type RagSource = {
  doc: string;
  page: string;
  confidence: string;
  link: string;
};

/**
 * 真实 RAG：question → embedding → pgvector → DeepSeek-V3
 * 全部由 server functions 处理（API key 在服务端）
 */
export async function ragAnswerReal(
  question: string,
): Promise<{ answer: string; sources: RagSource[] }> {
  const { ragAnswer } = await import("./api/rag.functions");
  return ragAnswer({ data: { question } });
}
