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
import type { ExperimentDoc } from "./labStore";
import type {
  ReproductionAudit,
  ReproductionParameter,
  ReproductionGap,
} from "./reproduction-audit";
import { toRow, fromRow, buildDbPatch } from "./experiment-utils";
import type { ExperimentRow } from "./experiment-utils";
import { getString, flattenProperties } from "./property-utils";

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
  get(_, prop) {
    return (getSupabase() as any)[prop];
  },
});

export function isSupabaseReady(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}

// ═══════════════════════════════════════════════════════
// 实验 CRUD
// ═══════════════════════════════════════════════════════

export async function fetchExperiments(): Promise<ExperimentDoc[]> {
  if (!isSupabaseReady()) return [];
  // 获取当前用户 — 未登录返回空
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return [];
  // 不按 user_id 过滤：RLS 返回「个人 + 所在团队」的全部可见实验，
  // 由 labStore 按当前工作空间（个人/团队）在内存中过滤展示。
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
  exp: ExperimentDoc,
  userId?: string,
  approvalStatus: "approved" | "pending" = "approved",
): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  // 如果没有提供 userId，尝试从 session 获取
  let uid = userId;
  if (!uid) {
    const { data: sessionData } = await supabase.auth.getSession();
    uid = sessionData.session?.user?.id;
  }
  if (!uid) return false;

  // 科研场景允许同名实验（如不同日期的重复实验），不做去重跳过——
  // 静默跳过会导致用户数据丢失。仅记录同名提示。
  const { data: sameName } = await supabase
    .from("experiments")
    .select("id")
    .eq("name", exp.name)
    .eq("user_id", uid)
    .maybeSingle();
  if (sameName) {
    console.log(`[Supabase] 提示: 存在同名实验 "${exp.name}"，仍继续插入新记录`);
  }

  const row = { ...toRow(exp, uid), approval_status: approvalStatus };
  const { error } = await supabase.from("experiments").insert(row);
  if (error) {
    console.error("[Supabase] insertExperiment error:", error);
    return false;
  }
  return true;
}

export async function updateExperimentDB(
  id: string,
  patch: Partial<ExperimentDoc>,
): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;
  const dbPatch = buildDbPatch(patch);
  // 不按 user_id 过滤：RLS 决定权限（本人可改自己的；团队管理员可改团队内全部）
  // select("id") 回读受影响行：UPDATE 匹配 0 行时不再假装成功
  const { data: updatedRows, error } = await supabase
    .from("experiments")
    .update(dbPatch)
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("[Supabase] updateExperiment error:", error);
    return false;
  }
  return (updatedRows?.length ?? 0) > 0;
}

export async function deleteExperimentDB(id: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;
  // RLS 决定权限：本人可删自己的；团队管理员可删团队内全部
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

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: userId,
      name: p.name,
      org: p.org,
      discipline: p.discipline,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
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
 * 为实验生成 embedding 并写入 DB（整卡 embedding + 分块 embedding）
 * 分块 embedding 用于精确检索
 */
export async function embedExperiment(expId: string): Promise<void> {
  if (!isSupabaseReady()) return;

  const { data } = await supabase.from("experiments").select("*").eq("id", expId).maybeSingle();

  if (!data) return;

  const r = data as Record<string, unknown>;
  const props = (r.properties as Record<string, unknown>) ?? {};

  // Build semantic text from all properties (flat)
  const flatEntries = flattenProperties(props as import("./exp-core").DocProperties);
  const semanticText = [
    r.name,
    r.operator,
    r.experiment_type,
    ...flatEntries.map((e) => `${e.path}: ${e.value}`),
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 8000); // Trim to avoid oversized embeddings

  // 整卡 embedding（向后兼容 + fallback），带内容哈希缓存
  if (semanticText.trim()) {
    const { contentHash, getCachedEmbedding, setCachedEmbedding } = await import("./rag-cache");
    const hash = contentHash(semanticText);
    const cached = getCachedEmbedding(expId, hash);

    if (cached) {
      await supabase
        .from("experiments")
        .update({ embedding: cached, updated_at: new Date().toISOString() })
        .eq("id", expId);
    } else {
      const { generateEmbedding } = await import("./api/ai.functions");
      const vec = await generateEmbedding({ data: { text: semanticText } });

      if (Array.isArray(vec) && vec.length > 0) {
        await supabase
          .from("experiments")
          .update({ embedding: vec, updated_at: new Date().toISOString() })
          .eq("id", expId);
        setCachedEmbedding(expId, hash, vec);
      }
    }
  }

  // 分块 embedding
  await embedExperimentChunks(expId);
}

// ═══════════════════════════════════════════════════════
// 分块 embedding CRUD
// ═══════════════════════════════════════════════════════

async function embedExperimentChunks(expId: string): Promise<void> {
  if (!isSupabaseReady()) return;

  // 获取完整实验数据用于分块
  const { data } = await supabase.from("experiments").select("*").eq("id", expId).maybeSingle();

  if (!data) return;

  const { splitExperimentIntoChunks } = await import("./experiment-utils");
  const { GENERIC_TEMPLATE } = await import("./templates/presets");
  const exp = fromRow(data as Record<string, unknown>);
  const chunks = splitExperimentIntoChunks(exp, GENERIC_TEMPLATE);

  if (chunks.length === 0) return;

  // 批量生成 embedding
  const { generateEmbeddings } = await import("./api/ai.functions");
  const texts = chunks.map((c) => c.content);
  const vecs = await generateEmbeddings({ data: { texts } });

  if (!Array.isArray(vecs) || vecs.length === 0) return;

  // 获取 user_id
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return;

  // 删除旧 chunks
  await supabase.from("experiment_chunks").delete().eq("experiment_id", expId);

  // 插入新 chunks
  const rows = chunks.map((c, i) => ({
    experiment_id: expId,
    user_id: userId,
    chunk_type: c.chunkType,
    content: c.content,
    embedding: vecs[i] ?? null,
  }));

  const { error } = await supabase.from("experiment_chunks").insert(rows);
  if (error) {
    console.error("[Supabase] chunk insert error:", error);
  }
}

/** 查询指定实验的所有 chunks */
export async function fetchExperimentChunks(
  expId: string,
): Promise<Array<{ chunkType: string; content: string }>> {
  if (!isSupabaseReady()) return [];
  const { data } = await supabase
    .from("experiment_chunks")
    .select("chunk_type, content")
    .eq("experiment_id", expId)
    .order("chunk_type");
  return (
    (data as Array<{ chunk_type: string; content: string }>)?.map((r) => ({
      chunkType: r.chunk_type,
      content: r.content,
    })) ?? []
  );
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
  relation_type:
    | "sample_shared"
    | "device_shared"
    | "semantic_similar"
    | "temporal"
    | "operator_shared"
    | "custom";
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
export async function autoGenerateRelations(exp: ExperimentDoc): Promise<number> {
  if (!isSupabaseReady()) return 0;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return 0;

  const { data: others } = await supabase
    .from("experiments")
    .select("id, name, operator, properties")
    .eq("user_id", userId)
    .neq("id", exp.id);

  if (!others || others.length === 0) return 0;

  const expDevice = getString(exp.properties, "device.name");
  const expSample = getString(exp.properties, "sample.id");

  let count = 0;

  for (const other of others) {
    const op = other as Record<string, unknown>;
    const otherProps = (op.properties as Record<string, unknown>) ?? {};
    const otherDevice = (otherProps["device"] as Record<string, unknown>)?.["name"] as
      | string
      | undefined;
    const otherSample = (otherProps["sample"] as Record<string, unknown>)?.["id"] as
      | string
      | undefined;

    // 1. 共享设备
    if (expDevice && otherDevice && expDevice === otherDevice) {
      const ok = await addExperimentRelation(exp.id, op.id as string, "device_shared", {
        device: expDevice,
      });
      if (ok) count++;
    }
    // 2. 共享样品
    if (expSample && otherSample && expSample === otherSample) {
      const ok = await addExperimentRelation(exp.id, op.id as string, "sample_shared", {
        sample: expSample,
      });
      if (ok) count++;
    }
    // 3. 相同操作人
    if (exp.operator && op.operator && exp.operator === op.operator) {
      const ok = await addExperimentRelation(exp.id, op.id as string, "operator_shared", {
        operator: exp.operator,
      });
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

/** 获取当前用户所有实验的关系（图谱用） */
export async function fetchAllRelations(): Promise<ExperimentRelation[]> {
  if (!isSupabaseReady()) return [];
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return [];

  // 获取用户所有实验 ID
  const { data: exps } = await supabase.from("experiments").select("id").eq("user_id", userId);
  if (!exps || exps.length === 0) return [];

  const expIds = (exps as Array<{ id: string }>).map((e) => e.id);

  // 查询所有涉及这些实验的关系
  const { data, error } = await supabase
    .from("experiment_relations")
    .select("*")
    .in("source_exp_id", expIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Supabase] fetchAllRelations error:", error);
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
  const { error } = await supabase.from("experiment_relations").delete().eq("id", relationId);
  if (error) {
    console.error("[Supabase] deleteRelation error:", error);
    return false;
  }
  return true;
}

/** AI 推断实验关系 */
export async function suggestRelations(
  sourceExp: ExperimentDoc,
  allExperiments: ExperimentDoc[],
): Promise<
  Array<{
    targetId: string;
    targetName: string;
    type: ExperimentRelation["relation_type"];
    reason: string;
  }>
> {
  const others = allExperiments.filter((e) => e.id !== sourceExp.id);
  if (others.length === 0) return [];

  const srcDevice = getString(sourceExp.properties, "device.name");
  const srcSample = getString(sourceExp.properties, "sample.id");
  const srcPurpose = getString(sourceExp.properties, "purpose");
  const srcDiscipline = getString(sourceExp.properties, "discipline");

  const ctx = others.map((e) => ({
    id: e.id,
    name: e.name,
    discipline: getString(e.properties, "discipline"),
    device: getString(e.properties, "device.name"),
    sample: getString(e.properties, "sample.id"),
    operator: e.operator,
    purpose: getString(e.properties, "purpose").slice(0, 80),
  }));

  const prompt = `你是科研知识图谱构建助手。以下是一个实验和候选关联实验列表，请推断它们之间的关系。

【当前实验】
名称: ${sourceExp.name}
学科: ${srcDiscipline}
设备: ${srcDevice}
样品: ${srcSample}
操作人: ${sourceExp.operator}
目的: ${srcPurpose.slice(0, 100)}

【候选实验】
${JSON.stringify(ctx, null, 2)}

请找出与当前实验有关系的实验（最多5个），关系类型只能是: sample_shared(共享样品), device_shared(共享设备), semantic_similar(语义相似), temporal(时序关联), operator_shared(相同操作人), custom(自定义)

输出纯JSON数组（不要markdown）:
[{"targetId":"...","type":"...","reason":"一句话解释为什么关联"}]`;

  try {
    const { chat, MODEL_TEXT } = await import("./deepseek");
    const raw = await chat(
      MODEL_TEXT,
      [
        { role: "system", content: "你是科研知识图谱构建助手。输出严格JSON数组。" },
        { role: "user", content: prompt },
      ],
      2048,
    );

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
  chunkType?: string;
  snippet?: string;
};

/**
 * 真实 RAG：question → embedding → pgvector → DeepSeek-V3
 * 全部由 server functions 处理（API key 在服务端）
 */
export async function ragAnswerReal(
  question: string,
  selectedIds?: string[],
  history?: Array<{ role: "user" | "assistant"; content: string }>,
  teamId?: string | null,
): Promise<{ answer: string; sources: RagSource[] }> {
  // 获取当前用户 — 个人模式搜本人实验；团队模式搜团队范围
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("未登录或登录已过期");
  const { ragAnswer } = await import("./api/rag.functions");
  return ragAnswer({ data: { question, accessToken, teamId: teamId ?? null, selectedIds, history } });
}

/**
 * 流式 RAG：question → embedding → pgvector → DeepSeek-V3 (SSE)
 * 返回原始 Response 对象，由调用方读取 ReadableStream
 * 失败时调用方应 fallback 到 ragAnswerReal
 */
export async function ragAnswerRealStream(
  question: string,
  selectedIds?: string[],
  history?: Array<{ role: "user" | "assistant"; content: string }>,
  teamId?: string | null,
): Promise<Response> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("未登录或登录已过期");
  const { ragAnswerStream } = await import("./api/rag.functions");
  // TanStack createServerFn 类型推断不知道返回值是 Response（运行时通过 x-tss-raw header 透传）
  return ragAnswerStream({
    data: { question, accessToken, teamId: teamId ?? null, selectedIds, history },
  }) as unknown as Response;
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

  const { error } = await supabase.from("reproduction_audits").insert(row);
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

// ═══════════════════════════════════════════════════════
// 反馈闭环 — 👍👎
// ═══════════════════════════════════════════════════════

export async function submitFeedback(params: {
  question: string;
  answer: string;
  sources: RagSource[];
  rating: "up" | "down";
}): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;

  const { error } = await supabase.from("rag_feedback").insert({
    user_id: userId,
    question: params.question,
    answer: params.answer,
    sources: params.sources,
    rating: params.rating,
  });

  if (error) {
    console.error("[Feedback] submit error:", error);
    return false;
  }
  return true;
}

/** 通用用户反馈（Bug/功能建议/其他）
 *  复用 rag_feedback 表（question=标题, answer=描述, sources=类型, rating=general） */
export async function submitGeneralFeedback(params: {
  type: "bug" | "feature" | "other";
  title: string;
  description: string;
}): Promise<boolean> {
  if (isSupabaseReady()) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (userId) {
      const { error } = await supabase.from("rag_feedback").insert({
        user_id: userId,
        question: `[${params.type}] ${params.title}`,
        answer: params.description,
        sources: [{ type: params.type, submittedAt: new Date().toISOString() }],
        rating: "general",
      });
      if (!error) return true;
      console.warn("[Feedback] rag_feedback insert failed:", error.message);
    }
  }

  // fallback：localStorage
  try {
    const raw = localStorage.getItem("labnote:general_feedback");
    const list = raw ? JSON.parse(raw) : [];
    list.push({
      id: "fb_" + Math.random().toString(36).slice(2, 9),
      type: params.type,
      title: params.title,
      description: params.description,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("labnote:general_feedback", JSON.stringify(list.slice(-100)));
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════
// 团队模式 — 客户端查询（读走 RLS，写受管理员策略约束）
// ═══════════════════════════════════════════════════════

export type TeamRow = {
  id: string;
  name: string;
  slug: string | null;
  institution: string | null;
  department: string | null;
  discipline: string | null;
  research_areas: string[] | null;
  intro: string | null;
  homepage: string | null;
  contact_email: string | null;
  founded_year: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TeamMemberRow = {
  team_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  role_title: string | null;
  joined_at: string;
  email?: string | null;
};

export type TeamAchievement = {
  id: string;
  team_id: string;
  type: "publication" | "patent" | "award" | "conference";
  title: string;
  venue: string | null;
  detail: string | null;
  year: number | null;
  link: string | null;
  created_by: string;
  created_at: string;
};

export type TeamProject = {
  id: string;
  team_id: string;
  title: string;
  status: "ongoing" | "completed";
  funding_source: string | null;
  grant_no: string | null;
  lead_user_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
};

export type TeamAnnouncement = {
  id: string;
  team_id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_by: string;
  created_at: string;
};

/** 我加入的所有团队（含我的角色与身份） */
export async function fetchMyTeams(): Promise<{ team: TeamRow; role: string; roleTitle: string | null }[]> {
  if (!isSupabaseReady()) return [];
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, role, role_title, teams(*)")
    .eq("user_id", userId);
  if (error) {
    console.error("[Supabase] fetchMyTeams error:", error);
    return [];
  }
  return ((data as unknown[]) ?? []).map((row: any) => ({
    team: row.teams as TeamRow,
    role: row.role as string,
    roleTitle: row.role_title as string | null,
  }));
}

/** 团队成员名单（含 profile 姓名） */
export async function fetchTeamMembers(teamId: string): Promise<TeamMemberRow[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, user_id, role, role_title, joined_at")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });
  if (error) {
    console.error("[Supabase] fetchTeamMembers error:", error);
    return [];
  }
  return (data as TeamMemberRow[]) ?? [];
}

/** 成员的登录邮箱（用于名单展示；通过 profiles 兜底） */
export async function fetchMemberEmails(userIds: string[]): Promise<Record<string, string>> {
  if (!isSupabaseReady() || userIds.length === 0) return {};
  // profiles 表存有登录邮箱快照；无则回退 user id 前缀
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email")
    .in("user_id", userIds);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const row of data as { user_id: string; email: string | null }[]) {
    if (row.email) map[row.user_id] = row.email;
  }
  return map;
}

export async function fetchTeamAchievements(teamId: string): Promise<TeamAchievement[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("team_achievements")
    .select("*")
    .eq("team_id", teamId)
    .order("year", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Supabase] fetchTeamAchievements error:", error);
    return [];
  }
  return (data as TeamAchievement[]) ?? [];
}

export async function insertTeamAchievement(a: Omit<TeamAchievement, "id" | "created_at" | "created_by">): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;
  const { error } = await supabase.from("team_achievements").insert({ ...a, created_by: userId });
  if (error) {
    console.error("[Supabase] insertTeamAchievement error:", error);
    return false;
  }
  return true;
}

export async function deleteTeamAchievement(id: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { error } = await supabase.from("team_achievements").delete().eq("id", id);
  if (error) {
    console.error("[Supabase] deleteTeamAchievement error:", error);
    return false;
  }
  return true;
}

export async function fetchTeamProjects(teamId: string): Promise<TeamProject[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("team_projects")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Supabase] fetchTeamProjects error:", error);
    return [];
  }
  return (data as TeamProject[]) ?? [];
}

export async function insertTeamProject(p: Omit<TeamProject, "id" | "created_at" | "created_by">): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;
  const { error } = await supabase.from("team_projects").insert({ ...p, created_by: userId });
  if (error) {
    console.error("[Supabase] insertTeamProject error:", error);
    return false;
  }
  return true;
}

export async function deleteTeamProject(id: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { error } = await supabase.from("team_projects").delete().eq("id", id);
  if (error) {
    console.error("[Supabase] deleteTeamProject error:", error);
    return false;
  }
  return true;
}

export async function fetchTeamAnnouncements(teamId: string): Promise<TeamAnnouncement[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("team_announcements")
    .select("*")
    .eq("team_id", teamId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Supabase] fetchTeamAnnouncements error:", error);
    return [];
  }
  return (data as TeamAnnouncement[]) ?? [];
}

export async function insertTeamAnnouncement(a: Omit<TeamAnnouncement, "id" | "created_at" | "created_by">): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;
  const { error } = await supabase.from("team_announcements").insert({ ...a, created_by: userId });
  if (error) {
    console.error("[Supabase] insertTeamAnnouncement error:", error);
    return false;
  }
  return true;
}

export async function deleteTeamAnnouncement(id: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { error } = await supabase.from("team_announcements").delete().eq("id", id);
  if (error) {
    console.error("[Supabase] deleteTeamAnnouncement error:", error);
    return false;
  }
  return true;
}

/* ═══════════════ 团队模板 ═══════════════ */

export type TeamTemplateRow = {
  id: string;
  name: string;
  experiment_type: string;
  domain: string;
  version: number;
  field_groups: unknown;
  is_preset: boolean;
  team_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/** 团队模板列表（RLS：templates_read 策略，仅团队成员可见） */
export async function fetchTeamTemplates(teamId: string): Promise<TeamTemplateRow[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[Supabase] fetchTeamTemplates error:", error);
    return [];
  }
  return (data as TeamTemplateRow[]) ?? [];
}

/** 新建团队模板（RLS：templates_team_admin，仅团队管理员可写） */
export async function insertTeamTemplate(t: {
  team_id: string;
  name: string;
  experiment_type: string;
  domain: string;
  field_groups: unknown;
}): Promise<TeamTemplateRow | null> {
  if (!isSupabaseReady()) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;
  const id = "tpl_team_" + Math.random().toString(36).slice(2, 10);
  const { data, error } = await supabase
    .from("templates")
    .insert({
      id,
      name: t.name,
      experiment_type: t.experiment_type,
      domain: t.domain,
      version: 1,
      field_groups: t.field_groups,
      is_preset: false,
      created_by: userId,
      team_id: t.team_id,
    })
    .select()
    .single();
  if (error) {
    console.error("[Supabase] insertTeamTemplate error:", error);
    return null;
  }
  return data as TeamTemplateRow;
}

/** 更新团队模板（RLS：templates_team_admin，仅团队管理员可写） */
export async function updateTeamTemplate(
  id: string,
  patch: { name?: string; experiment_type?: string; domain?: string; field_groups?: unknown },
): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { error } = await supabase
    .from("templates")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[Supabase] updateTeamTemplate error:", error);
    return false;
  }
  return true;
}

/** 删除团队模板（RLS：templates_team_admin，仅团队管理员可写） */
export async function deleteTeamTemplate(id: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) {
    console.error("[Supabase] deleteTeamTemplate error:", error);
    return false;
  }
  return true;
}

/* ═══════════════ 邀请记录 ═══════════════ */

export type TeamInviteRow = {
  id: string;
  team_id: string;
  code: string;
  created_by: string;
  expires_at: string | null;
  created_at: string;
};

/** 团队邀请记录（RLS：成员可见） */
export async function fetchTeamInvites(teamId: string): Promise<TeamInviteRow[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("team_invites")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Supabase] fetchTeamInvites error:", error);
    return [];
  }
  return (data as TeamInviteRow[]) ?? [];
}

/** 撤销邀请（RLS：仅管理员） */
export async function revokeTeamInvite(id: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { error } = await supabase.from("team_invites").delete().eq("id", id);
  if (error) {
    console.error("[Supabase] revokeTeamInvite error:", error);
    return false;
  }
  return true;
}

/* ═══════════════ 实验评论 ═══════════════ */

export type ExperimentCommentRow = {
  id: string;
  experiment_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

/** 实验评论（RLS：能看实验就能看评论） */
export async function fetchComments(experimentId: string): Promise<ExperimentCommentRow[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("experiment_comments")
    .select("*")
    .eq("experiment_id", experimentId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[Supabase] fetchComments error:", error);
    return [];
  }
  return (data as ExperimentCommentRow[]) ?? [];
}

export async function insertComment(experimentId: string, content: string): Promise<ExperimentCommentRow | null> {
  if (!isSupabaseReady()) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from("experiment_comments")
    .insert({ experiment_id: experimentId, user_id: userId, content })
    .select()
    .single();
  if (error) {
    console.error("[Supabase] insertComment error:", error);
    return null;
  }
  return data as ExperimentCommentRow;
}

export async function deleteComment(id: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { error } = await supabase.from("experiment_comments").delete().eq("id", id);
  if (error) {
    console.error("[Supabase] deleteComment error:", error);
    return false;
  }
  return true;
}

/* ═══════════════ 通知 ═══════════════ */

export type NotificationRow = {
  id: string;
  user_id: string;
  team_id: string | null;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

export async function fetchNotifications(): Promise<NotificationRow[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    console.error("[Supabase] fetchNotifications error:", error);
    return [];
  }
  return (data as NotificationRow[]) ?? [];
}

export async function markNotificationRead(id: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  return !error;
}

export async function markAllNotificationsRead(): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { error } = await supabase.from("notifications").update({ read: true }).eq("read", false);
  return !error;
}

/** 待审核实验（RLS：管理员见全队待审核；成员见自己待审核） */
export async function fetchPendingTeamExperiments(teamId: string): Promise<{ id: string; name: string; operator: string; created_at: string }[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("experiments")
    .select("id, name, operator, created_at")
    .eq("team_id", teamId)
    .eq("approval_status", "pending")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Supabase] fetchPendingTeamExperiments error:", error);
    return [];
  }
  return (data as { id: string; name: string; operator: string; created_at: string }[]) ?? [];
}
