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
import type { ReproductionAudit, ReproductionParameter, ReproductionGap } from "./reproduction-audit";
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
  // 获取当前用户 — 未登录返回空
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return [];
  // RLS + 代码双重过滤
  const { data, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("user_id", userId)
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
  if (!uid) return false;

  // 去重：检查同名实验是否已存在
  const { data: existing } = await supabase
    .from("experiments")
    .select("id")
    .eq("name", exp.name)
    .eq("user_id", uid)
    .maybeSingle();
  if (existing) {
    console.log(`[Supabase] 跳过重复实验: "${exp.name}" (已存在: ${(existing as any).id})`);
    return true; // 不算失败，只是跳过
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
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;
  const dbPatch = buildDbPatch(patch);
  const { error } = await supabase
    .from("experiments")
    .update(dbPatch)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    console.error("[Supabase] updateExperiment error:", error);
    return false;
  }
  return true;
}

export async function deleteExperimentDB(id: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;
  const { error } = await supabase.from("experiments").delete().eq("id", id).eq("user_id", userId);
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
  // 获取当前用户 — RLS + 代码双重过滤
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase.rpc("match_experiments", {
    query_embedding: embedding,
    match_threshold: 0.6,
    match_count: limit,
    filter_user_id: userId,
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
// 实验关系（知识图谱边）
// ═══════════════════════════════════════════════════════

export type ExperimentRelation = {
  id: string;
  source_exp_id: string;
  target_exp_id: string;
  relation_type: "sample_shared" | "device_shared" | "semantic_similar" | "temporal" | "operator_shared" | "custom";
  metadata: Record<string, unknown>;
  similarity: number | null;
  created_at: string;
};

export const RELATION_LABELS: Record<ExperimentRelation["relation_type"], string> = {
  sample_shared: "共享样品",
  device_shared: "共享设备",
  semantic_similar: "语义相似",
  temporal: "时序关联",
  operator_shared: "相同操作人",
  custom: "自定义",
};

/** 自动为实验生成关系（共享设备/样品/操作人 + AI 语义） */
export async function autoGenerateRelations(exp: Experiment): Promise<number> {
  if (!isSupabaseReady()) return 0;

  // 获取同用户所有其他实验
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return 0;

  const { data: others } = await supabase
    .from("experiments")
    .select("id, name, device_name, sample_id, operator, discipline")
    .eq("user_id", userId)
    .neq("id", exp.id);

  if (!others || others.length === 0) return 0;

  let count = 0;
  const otherList = others as Array<{ id: string; name: string; device_name: string | null; sample_id: string | null; operator: string | null; discipline: string | null }>;

  for (const other of otherList) {
    // 1. 共享设备
    if (exp.device.name && other.device_name && exp.device.name === other.device_name) {
      const ok = await addExperimentRelation(exp.id, other.id, "device_shared", { device: exp.device.name });
      if (ok) count++;
    }
    // 2. 共享样品
    if (exp.sample.id && other.sample_id && exp.sample.id === other.sample_id) {
      const ok = await addExperimentRelation(exp.id, other.id, "sample_shared", { sample: exp.sample.id });
      if (ok) count++;
    }
    // 3. 相同操作人
    if (exp.operator && other.operator && exp.operator === other.operator) {
      const ok = await addExperimentRelation(exp.id, other.id, "operator_shared", { operator: exp.operator });
      if (ok) count++;
    }
  }
  return count;
}

/** 获取某个实验的所有关系 */
export async function fetchExperimentRelations(expId: string): Promise<ExperimentRelation[]> {
  if (!isSupabaseReady() || !expId) return [];
  const { data, error } = await supabase
    .from("experiment_relations")
    .select("*")
    .or(`source_exp_id.eq.${expId},target_exp_id.eq.${expId}`)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Supabase] fetchRelations error:", error);
    return [];
  }
  return (data as ExperimentRelation[]) ?? [];
}

/** 添加关系 */
export async function addExperimentRelation(
  sourceExpId: string,
  targetExpId: string,
  relationType: ExperimentRelation["relation_type"],
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { error } = await supabase.from("experiment_relations").insert({
    source_exp_id: sourceExpId,
    target_exp_id: targetExpId,
    relation_type: relationType,
    metadata: metadata ?? {},
  });
  if (error) {
    console.error("[Supabase] addRelation error:", error);
    return false;
  }
  return true;
}

/** 删除关系 */
export async function deleteExperimentRelation(relationId: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { error } = await supabase
    .from("experiment_relations")
    .delete()
    .eq("id", relationId);
  if (error) {
    console.error("[Supabase] deleteRelation error:", error);
    return false;
  }
  return true;
}

/** AI 推断实验关系 */
export async function suggestRelations(
  sourceExp: Experiment,
  allExperiments: Experiment[],
): Promise<Array<{ targetId: string; targetName: string; type: ExperimentRelation["relation_type"]; reason: string }>> {
  // 排除自己
  const others = allExperiments.filter((e) => e.id !== sourceExp.id);
  if (others.length === 0) return [];

  const ctx = others.map((e) => ({
    id: e.id,
    name: e.name,
    discipline: e.discipline,
    device: e.device.name,
    sample: e.sample.id,
    operator: e.operator,
    purpose: e.purpose?.slice(0, 80),
  }));

  const prompt = `你是科研知识图谱构建助手。以下是一个实验和候选关联实验列表，请推断它们之间的关系。

【当前实验】
名称: ${sourceExp.name}
学科: ${sourceExp.discipline}
设备: ${sourceExp.device.name}
样品: ${sourceExp.sample.id}
操作人: ${sourceExp.operator}
目的: ${sourceExp.purpose?.slice(0, 100)}

【候选实验】
${JSON.stringify(ctx, null, 2)}

请找出与当前实验有关系的实验（最多5个），关系类型只能是: sample_shared(共享样品), device_shared(共享设备), semantic_similar(语义相似), temporal(时序关联), operator_shared(相同操作人), custom(自定义)

输出纯JSON数组（不要markdown）:
[{"targetId":"...","type":"...","reason":"一句话解释为什么关联"}]`;

  try {
    const { chat } = await import("./siliconflow");
    const raw = await chat("deepseek-ai/DeepSeek-V3", [
      { role: "system", content: "你是科研知识图谱构建助手。输出严格JSON数组。" },
      { role: "user", content: prompt },
    ], 2048);

    // 提取 JSON
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const suggestions = JSON.parse(match[0]);
    return suggestions.map((s: any) => ({
      targetId: s.targetId,
      targetName: others.find((o) => o.id === s.targetId)?.name ?? "",
      type: s.type as ExperimentRelation["relation_type"],
      reason: s.reason || "",
    }));
  } catch (err) {
    console.error("[Supabase] suggestRelations error:", err);
    return [];
  }
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
  // 获取当前用户 — RAG 只搜索该用户的实验
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  const { ragAnswer } = await import("./api/rag.functions");
  return ragAnswer({ data: { question, userId } });
}

// ═══════════════════════════════════════════════════════
// 复现审计 CRUD
// ═══════════════════════════════════════════════════════

/** DB 行格式 */
type AuditRow = {
  id: string;
  user_id: string;
  paper_title: string;
  paper_source: string;
  discipline: string;
  parameters: ReproductionParameter[];
  gaps: ReproductionGap[];
  reproducibility_score: number;
  score_breakdown: string;
  ai_assessment: string;
  critical_risks: string[];
  created_at: string;
  updated_at: string;
};

function auditFromRow(row: AuditRow): ReproductionAudit {
  return {
    id: row.id,
    paperTitle: row.paper_title,
    paperSource: row.paper_source,
    auditedAt: row.created_at,
    parameters: row.parameters ?? [],
    gaps: row.gaps ?? [],
    reproducibilityScore: row.reproducibility_score ?? 0,
    scoreBreakdown: row.score_breakdown ?? "",
    aiAssessment: row.ai_assessment ?? "",
    criticalRisks: row.critical_risks ?? [],
  };
}

/** 保存审计（insert or update）返回审计 id */
export async function saveAudit(
  audit: ReproductionAudit,
  discipline: string = "材料科学",
): Promise<string | null> {
  if (!isSupabaseReady()) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    console.warn("[Audit] saveAudit skipped: no user session");
    return null;
  }

  const row = {
    id: audit.id,
    user_id: userId,
    paper_title: audit.paperTitle,
    paper_source: audit.paperSource,
    discipline,
    parameters: audit.parameters,
    gaps: audit.gaps,
    reproducibility_score: audit.reproducibilityScore,
    score_breakdown: audit.scoreBreakdown,
    ai_assessment: audit.aiAssessment,
    critical_risks: audit.criticalRisks,
  };

  // Upsert: if exists → update, else → insert
  const { data: existing } = await supabase
    .from("reproduction_audits")
    .select("id")
    .eq("id", audit.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("reproduction_audits")
      .update(row)
      .eq("id", audit.id)
      .eq("user_id", userId);
    if (error) {
      console.error("[Audit] update error:", error);
      return null;
    }
    return audit.id;
  }

  const { error } = await supabase
    .from("reproduction_audits")
    .insert(row);
  if (error) {
    console.error("[Audit] insert error:", error);
    return null;
  }
  return audit.id;
}

/** 获取当前用户的所有审计历史（按时间倒序） */
export async function fetchAudits(): Promise<ReproductionAudit[]> {
  if (!isSupabaseReady()) return [];
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("reproduction_audits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Audit] fetchAudits error:", error);
    return [];
  }
  return ((data as AuditRow[]) ?? []).map(auditFromRow);
}

/** 获取单个审计 */
export async function fetchAudit(id: string): Promise<ReproductionAudit | null> {
  if (!isSupabaseReady()) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("reproduction_audits")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    console.error("[Audit] fetchAudit error:", error);
    return null;
  }
  return auditFromRow(data as AuditRow);
}

/** 删除审计 */
export async function deleteAudit(id: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;

  const { error } = await supabase
    .from("reproduction_audits")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    console.error("[Audit] deleteAudit error:", error);
    return false;
  }
  return true;
}
