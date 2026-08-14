/**
 * RAG Server Functions — 语义检索 + AI 问答
 *
 * 完整 RAG 管道：问题 → embedding → pgvector 搜索 → DeepSeek-V3 生成
 * 全部在服务端执行，API 密钥不暴露
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServiceSupabase, requireAuthenticatedUser } from "../supabase-server.server";
import { generateEmbeddingDirect, chatCompletionDirect, rewriteQueryDirect, rerankDirect } from "./ai.functions";
import { getServerConfig } from "../config.server";
import { fromRow } from "../experiment-utils";

// ═══════════════════════════════════════════════════════
// RAG 语义搜索
// ═══════════════════════════════════════════════════════

export const ragSearch = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      question: z.string().min(1),
      limit: z.number().optional().default(3),
      accessToken: z.string().min(1),
      selectedIds: z.array(z.string()).optional(),
      history: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          }),
        )
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServiceSupabase();
    const userId = await requireAuthenticatedUser(data.accessToken);

    // 1. Query 改写：模糊问题 → 精确检索词（失败静默降级）
    const searchQuery = await rewriteQueryDirect({
      question: data.question,
      history: data.history,
    });

    // 2. 生成改写后问题的 embedding（不可用时降级关键词搜索）
    const qVec = await generateEmbeddingDirect(searchQuery);
    const hasEmbedding = Array.isArray(qVec) && qVec.length > 0;

    let simMap = new Map<
      string,
      { name: string; similarity: number; bestChunk: string; chunkType: string }
    >();

    if (hasEmbedding) {
      // 2a. 尝试 chunk 级向量搜索
      const { data: chunkSimilar, error: chunkErr } = await supabase.rpc(
        "match_experiment_chunks",
        {
          query_embedding: qVec,
          match_threshold: 0.55,
          match_count: 20,
          filter_user_id: userId,
          filter_ids: data.selectedIds ?? null,
        },
      );

      if (!chunkErr && Array.isArray(chunkSimilar) && chunkSimilar.length > 0) {
        const chunkList = chunkSimilar as Array<{
          experiment_id: string;
          experiment_name: string;
          chunk_type: string;
          chunk_content: string;
          similarity: number;
        }>;
        for (const c of chunkList) {
          const existing = simMap.get(c.experiment_id);
          if (!existing || c.similarity > existing.similarity) {
            simMap.set(c.experiment_id, {
              name: c.experiment_name,
              similarity: c.similarity,
              bestChunk: c.chunk_content,
              chunkType: c.chunk_type,
            });
          }
        }
      }

      // 2b. Fallback: 混合搜索（语义 + 关键词 BM25）
      if (simMap.size === 0) {
        const { data: hybrid } = await supabase.rpc("hybrid_search_experiments", {
          query_text: searchQuery,
          query_embedding: qVec,
          match_threshold: 0.5,
          match_count: data.limit * 4,
          semantic_weight: 0.7,
          keyword_weight: 0.3,
          filter_user_id: userId,
          filter_ids: data.selectedIds ?? null,
        });

        if (Array.isArray(hybrid)) {
          const hList = hybrid as Array<{
            id: string;
            name: string;
            similarity: number;
            keyword_score: number;
            hybrid_score: number;
          }>;
          for (const h of hList) {
            simMap.set(h.id, {
              name: h.name,
              similarity: h.hybrid_score,
              bestChunk: h.keyword_score > 0 ? `关键词匹配: ${searchQuery}` : "",
              chunkType: h.keyword_score > 0 ? "keyword" : "",
            });
          }
        }
      }
    } else {
      // 无 Embedding — 纯关键词 ILIKE 搜索
      console.warn("[RAG] Embedding unavailable, using keyword-only search");
      const terms = searchQuery.split(/\s+/).filter((t) => t.length > 0);
      if (terms.length > 0) {
        const { data: keywordResults } = await supabase
          .from("experiments")
          .select("id, name, properties")
          .eq("user_id", userId)
          .or(
            terms
              .map(
                (term) =>
                  `name.ilike.%${term}%,properties->>purpose.ilike.%${term}%,properties->>results.ilike.%${term}%`,
              )
              .join(","),
          )
          .limit(data.limit * 3);

        if (Array.isArray(keywordResults)) {
          for (const r of keywordResults as Array<{
            id: string;
            name: string;
            properties?: Record<string, unknown>;
          }>) {
            const props = r.properties ?? {};
            const purpose = (props["purpose"] as string) ?? "";
            const results = (props["results"] as string) ?? "";
            const snippet = [purpose, results].filter(Boolean).join(" | ").slice(0, 200);
            simMap.set(r.id, {
              name: r.name,
              similarity: 0.5,
              bestChunk: snippet || JSON.stringify(props).slice(0, 200),
              chunkType: "keyword",
            });
          }
        }
      }
    }

    if (simMap.size === 0) return [];

    // 2c. Reranker 精排（候选 > limit 时启用，失败静默降级）
    if (simMap.size > data.limit) {
      try {
        const entries = [...simMap.entries()];
        // 构建文档: 实验名 + 最佳匹配 chunk
        const documents = entries.map(([, info]) =>
          `${info.name}: ${info.bestChunk || ""}`.slice(0, 1000),
        );
        const reranked = await rerankDirect({
          query: data.question,
          documents,
          topN: data.limit,
        });

        if (Array.isArray(reranked) && reranked.length > 0) {
          // 用 reranker 得分替换 similarity
          const rerankMap = new Map<
            string,
            { name: string; similarity: number; bestChunk: string; chunkType: string }
          >();
          for (const r of reranked) {
            const entry = entries[r.index];
            if (entry) {
              rerankMap.set(entry[0], {
                ...entry[1],
                similarity: r.score, // reranker 得分覆盖向量相似度
              });
            }
          }
          simMap = rerankMap;
        }
      } catch (err) {
        console.warn("[RAG] Reranker failed, using vector scores:", err);
        // 降级：继续用向量/混合搜索分数
      }
    }

    // 3. 取 top-N 个实验，拉取完整数据
    const topEntries = [...simMap.entries()]
      .sort((a, b) => b[1].similarity - a[1].similarity)
      .slice(0, data.limit);

    const ids = topEntries.map(([id]) => id);
    const { data: full } = await supabase
      .from("experiments")
      .select("id, name, properties")
      .in("id", ids);

    if (!full) return [];

    const rows = full as Array<{
      id: string;
      name: string;
      properties?: Record<string, unknown> | null;
    }>;

    // 按原始相似度排序
    const idOrder = new Map(ids.map((id, i) => [id, i]));

    return rows
      .map((r) => {
        const props = (r.properties as Record<string, unknown>) ?? {};
        const purpose = (props["purpose"] as string) ?? "";
        const results = (props["results"] as string) ?? "";
        const steps = props["steps"] as string[] | undefined;
        const stepsText = Array.isArray(steps) ? steps.join("; ") : "";
        const params = props["params"] as
          | Array<{ name: string; value: string; unit: string }>
          | undefined;
        const paramsText = Array.isArray(params)
          ? params.map((p) => `${p.name ?? ""}: ${p.value ?? ""}${p.unit ?? ""}`).join(", ")
          : "";
        const fullText = [purpose, results, stepsText, paramsText].filter(Boolean).join(" | ");
        // 如果有 chunk 精准匹配，优先用 chunk 内容
        const info = simMap.get(r.id);
        const chunkText = info?.bestChunk ?? "";
        const text = chunkText || fullText.slice(0, 8000);
        return {
          id: r.id,
          name: r.name,
          text: text.slice(0, 8000),
          similarity: info?.similarity ?? 0,
          chunkType: info?.chunkType ?? "",
        };
      })
      .sort((a, b) => (idOrder.get(a.id) ?? 99) - (idOrder.get(b.id) ?? 99));
  });

// ═══════════════════════════════════════════════════════
// RAG 完整问答
// ═══════════════════════════════════════════════════════

export type RagSource = {
  doc: string;
  page: string;
  confidence: string;
  link: string;
  chunkType?: string;
  snippet?: string;
};

const CHUNK_LABELS: Record<string, string> = {
  meta: "基本信息",
  purpose: "实验目的",
  device_sample: "设备/样品",
  params_steps: "参数/步骤",
  results: "结果/洞察",
  keyword: "关键词匹配",
};

export type HistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

const RAG_SYSTEM_PROMPT = `你是 LabNote Agent，一个科研实验数据治理助手。
你的回答必须基于提供的实验记录上下文，不要编造数据。
如果上下文中没有相关信息，诚实告知用户"知识库中暂无相关记录"。
回答用中文，简洁专业，标注引用的实验名称和日期。`;

export const ragAnswer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      question: z.string().min(1),
      accessToken: z.string().min(1),
      selectedIds: z.array(z.string()).optional(),
      history: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          }),
        )
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    // 1. 向量检索 Top-3 相关实验（按用户隔离 + 可选卡片边界）
    const contexts = await ragSearch({
      data: {
        question: data.question,
        limit: 3,
        accessToken: data.accessToken,
        selectedIds: data.selectedIds,
        history: data.history,
      },
    });

    if (!Array.isArray(contexts) || contexts.length === 0) {
      return {
        answer:
          "知识库中暂无与您问题相关的实验记录。建议：① 先上传实验数据 ② 使用更具体的关键词 ③ 直接在实验卡片中搜索。",
        sources: [] as RagSource[],
      };
    }

    // 2. 拼接上下文
    const contextBlock = contexts
      .map(
        (c, i) =>
          `[实验${i + 1}] ${c.name}\n内容：${c.text}\n相似度：${(c.similarity * 100).toFixed(0)}%`,
      )
      .join("\n\n");

    // 3. 调 DeepSeek-V3 生成回答（含对话历史 + LLM 响应缓存）
    const prompt = `基于以下实验记录回答用户问题。\n\n实验记录：\n${contextBlock}\n\n用户问题：${data.question}\n\n请用2-4句话回答，并引用相关实验名称。`;

    // 构建 messages：system + 历史（最近 N 轮）+ 当前问题
    const historyMessages = (data.history ?? []).slice(-6).map((h) => ({
      role: h.role,
      content: h.role === "assistant" ? h.content.slice(0, 300) : h.content,
    }));

    let answer: string;
    try {
      // LLM 响应缓存检查
      const {
        contentHash: _ch,
        getCachedAnswer: _gca,
        setCachedAnswer: _sca,
      } = await import("../rag-cache");
      const ctxHash = _ch(contextBlock + (data.history ? JSON.stringify(data.history) : ""));
      const cached = _gca(data.question, ctxHash);
      if (cached) {
        answer = cached.answer;
      } else {
        // 直连网关：ragAnswerReal/Stream 本身是服务器函数，
        // 嵌套调用 chatCompletion（server fn）会丢失 AsyncLocalStorage 上下文
        answer = await chatCompletionDirect({
          model: MODEL_ID,
          messages: [
            { role: "system", content: RAG_SYSTEM_PROMPT },
            ...historyMessages,
            { role: "user", content: prompt },
          ],
          maxTokens: 512,
        });
        // 写入缓存
        const sourcesForCache = contexts.map((c) => {
          const ct = (c as any).chunkType as string | undefined;
          return {
            doc: c.name,
            page: ct ? `实验卡片 · ${CHUNK_LABELS[ct] || ct}` : "实验卡片",
            confidence: `${(c.similarity * 100).toFixed(0)}%`,
            link: `/workbench?id=${c.id}`,
            chunkType: ct,
            snippet: ct ? c.text.slice(0, 180) : undefined,
          };
        });
        _sca(data.question, ctxHash, answer, sourcesForCache as any);
      }
    } catch (err) {
      console.error("[RAG] LLM call failed:", err);
      answer =
        `检索到 ${contexts.length} 条相关实验（LLM 暂时不可用）：\n` +
        contexts.map((c) => `• ${c.name}（相似度 ${(c.similarity * 100).toFixed(0)}%）`).join("\n");
    }

    // 4. 构建来源（含 chunk 级精确定位）
    const sources: RagSource[] = contexts.map((c) => {
      const ct = (c as any).chunkType as string | undefined;
      return {
        doc: c.name,
        page: ct ? `实验卡片 · ${CHUNK_LABELS[ct] || ct}` : "实验卡片",
        confidence: `${(c.similarity * 100).toFixed(0)}%`,
        link: `/workbench?id=${c.id}`,
        chunkType: ct,
        snippet: ct ? c.text.slice(0, 180) : undefined,
      };
    });

    return { answer, sources };
  });

// ═══════════════════════════════════════════════════════
// RAG 流式问答（SSE）
// ═══════════════════════════════════════════════════════

const AI_BASE = "https://aiagent.xjtlu.edu.cn/api/aigw/v1";
const MODEL_ID = "d8j2d4r9dhtg6s3fevfg";

function apiFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, init);
}

export const ragAnswerStream = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      question: z.string().min(1),
      accessToken: z.string().min(1),
      selectedIds: z.array(z.string()).optional(),
      history: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          }),
        )
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    // 1. RAG 检索（复用 ragSearch）
    const contexts = await ragSearch({
      data: {
        question: data.question,
        limit: 3,
        accessToken: data.accessToken,
        selectedIds: data.selectedIds,
        history: data.history,
      },
    });

    let sources: RagSource[] = [];
    let contextBlock = "";

    if (Array.isArray(contexts) && contexts.length > 0) {
      sources = contexts.map((c) => {
        const ct = (c as any).chunkType as string | undefined;
        return {
          doc: c.name,
          page: ct ? `实验卡片 · ${CHUNK_LABELS[ct] || ct}` : "实验卡片",
          confidence: `${(c.similarity * 100).toFixed(0)}%`,
          link: `/workbench?id=${c.id}`,
          chunkType: ct,
          snippet: ct ? c.text.slice(0, 180) : undefined,
        };
      });

      contextBlock = contexts
        .map(
          (c, i) =>
            `[实验${i + 1}] ${c.name}\n内容：${c.text}\n相似度：${(c.similarity * 100).toFixed(0)}%`,
        )
        .join("\n\n");
    }

    // 2. 构建 prompt + 对话历史
    const prompt = contextBlock
      ? `基于以下实验记录回答用户问题。\n\n实验记录：\n${contextBlock}\n\n用户问题：${data.question}\n\n请用2-4句话回答，并引用相关实验名称。`
      : data.question;

    const historyMessages = (data.history ?? []).slice(-6).map((h) => ({
      role: h.role,
      content: h.role === "assistant" ? h.content.slice(0, 300) : h.content,
    }));

    const config = getServerConfig();
    const apiKey = config.aiApiKey;
    if (!apiKey) throw new Error("AI_API_KEY not configured");

    const encoder = new TextEncoder();

    // 3. 无上下文时直接返回非流式响应
    if (!contextBlock) {
      const body = JSON.stringify({
        type: "done",
        answer:
          "知识库中暂无与您问题相关的实验记录。建议：① 先上传实验数据 ② 使用更具体的关键词 ③ 直接在实验卡片中搜索。",
        sources: [],
      });
      return new Response(
        encoder.encode(
          `data: ${JSON.stringify({ type: "sources", sources: [] })}\n\ndata: ${JSON.stringify({ type: "token", content: "知识库中暂无与您问题相关的实验记录。" })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`,
        ),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "x-tss-raw": "true",
          },
        },
      );
    }

    // 4. 调用 AI API 流式接口
    let sfRes: Response;
    try {
      sfRes = await apiFetch(`${AI_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_ID,
          messages: [
            { role: "system", content: RAG_SYSTEM_PROMPT },
            ...historyMessages,
            { role: "user", content: prompt },
          ],
          max_tokens: 512,
          temperature: 0.3,
          stream: true,
        }),
      });
    } catch (err) {
      // Network error: return error SSE
      const errMsg = err instanceof Error ? err.message : "网络请求失败";
      return new Response(
        encoder.encode(
          `data: ${JSON.stringify({ type: "error", message: errMsg })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`,
        ),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "x-tss-raw": "true",
          },
        },
      );
    }

    if (!sfRes.ok) {
      const errText = await sfRes.text().catch(() => "");
      return new Response(
        encoder.encode(
          `data: ${JSON.stringify({ type: "error", message: `API ${sfRes.status}: ${errText.slice(0, 200)}` })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`,
        ),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "x-tss-raw": "true",
          },
        },
      );
    }

    // 5. 构建 SSE 流：先发 sources，再 pipe AI token 流
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // 先写 sources 事件
    writer.write(encoder.encode(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`));

    // 异步 pipe AI API SSE stream
    const sfReader = sfRes.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    (async () => {
      try {
        while (true) {
          const { done, value } = await sfReader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed?.choices?.[0]?.delta?.content;
                if (content) {
                  writer.write(
                    encoder.encode(`data: ${JSON.stringify({ type: "token", content })}\n\n`),
                  );
                }
              } catch {
                // Skip malformed SSE lines
              }
            }
          }
        }
        // 处理 buffer 中剩余的行
        if (
          buffer.startsWith("data: ") &&
          buffer.slice(6).trim() &&
          buffer.slice(6).trim() !== "[DONE]"
        ) {
          try {
            const parsed = JSON.parse(buffer.slice(6).trim());
            const content = parsed?.choices?.[0]?.delta?.content;
            if (content) {
              writer.write(
                encoder.encode(`data: ${JSON.stringify({ type: "token", content })}\n\n`),
              );
            }
          } catch {
            /* skip */
          }
        }
        writer.write(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      } catch (err) {
        writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: "流中断" })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`,
          ),
        );
      } finally {
        try {
          await writer.close();
        } catch {
          /* already closed */
        }
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "x-tss-raw": "true",
      },
    });
  });
