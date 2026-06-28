/**
 * RAG Server Functions — 语义检索 + AI 问答
 *
 * 完整 RAG 管道：问题 → embedding → pgvector 搜索 → DeepSeek-V3 生成
 * 全部在服务端执行，API 密钥不暴露
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServiceSupabase } from "../supabase-server.server";
import { generateEmbedding, chatCompletion } from "./ai.functions";
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
      userId: z.string().optional().nullable(),
      selectedIds: z.array(z.string()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServiceSupabase();

    // 1. 生成问题的 embedding
    const qVec = await generateEmbedding({ data: { text: data.question } });
    if (!Array.isArray(qVec) || qVec.length === 0) return [];

    // 2. 优先用 chunk 级搜索（精确匹配字段），失败 fallback 到整卡搜索
    let simMap = new Map<string, { name: string; similarity: number; bestChunk: string }>();

    // 2a. 尝试 chunk 级向量搜索
    const { data: chunkSimilar, error: chunkErr } = await supabase.rpc(
      "match_experiment_chunks",
      {
        query_embedding: qVec,
        match_threshold: 0.55, // 稍低阈值，chunk 粒度更细
        match_count: 20, // 多召回一些，后续按实验去重
        filter_user_id: data.userId ?? null,
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
      // 按 experiment_id 去重，取最佳匹配 chunk
      for (const c of chunkList) {
        const existing = simMap.get(c.experiment_id);
        if (!existing || c.similarity > existing.similarity) {
          simMap.set(c.experiment_id, {
            name: c.experiment_name,
            similarity: c.similarity,
            bestChunk: `[${c.chunk_type}] ${c.chunk_content}`,
          });
        }
      }
    }

    // 2b. Fallback: 混合搜索（语义 + 关键词 BM25）
    if (simMap.size === 0) {
      const { data: hybrid } = await supabase.rpc("hybrid_search_experiments", {
        query_text: data.question,
        query_embedding: qVec,
        match_threshold: 0.5,
        match_count: data.limit * 4,
        semantic_weight: 0.7,
        keyword_weight: 0.3,
        filter_user_id: data.userId ?? null,
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
            bestChunk: h.keyword_score > 0 ? `关键词匹配: ${data.question}` : "",
          });
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
        const { rerank } = await import("./ai.functions");
        const reranked = await rerank({
          data: { query: data.question, documents, topN: data.limit },
        });

        if (Array.isArray(reranked) && reranked.length > 0) {
          // 用 reranker 得分替换 similarity
          const rerankMap = new Map<string, { name: string; similarity: number; bestChunk: string }>();
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
      .select("id, name, purpose, results, steps, params")
      .in("id", ids);

    if (!full) return [];

    const rows = full as Array<{
      id: string;
      name: string;
      purpose?: string;
      results?: string;
      steps?: unknown;
      params?: unknown;
    }>;

    // 按原始相似度排序
    const idOrder = new Map(ids.map((id, i) => [id, i]));

    return rows
      .map((r) => {
        const stepsText = Array.isArray(r.steps)
          ? (r.steps as string[]).join("; ")
          : "";
        const paramsText = Array.isArray(r.params)
          ? (r.params as Array<{ name: string; value: string; unit: string }>)
              .map((p) => `${p.name ?? ""}: ${p.value ?? ""}${p.unit ?? ""}`)
              .join(", ")
          : "";
        const fullText = [r.purpose, r.results, stepsText, paramsText]
          .filter(Boolean)
          .join(" | ");
        // 如果有 chunk 精准匹配，优先用 chunk 内容
        const chunkText = simMap.get(r.id)?.bestChunk ?? "";
        const text = chunkText || fullText.slice(0, 8000);
        return {
          id: r.id,
          name: r.name,
          text: text.slice(0, 8000),
          similarity: simMap.get(r.id)?.similarity ?? 0,
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
      userId: z.string().optional().nullable(),
      selectedIds: z.array(z.string()).optional(),
      history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).optional(),
    }),
  )
  .handler(async ({ data }) => {
    // 1. 向量检索 Top-3 相关实验（按用户隔离 + 可选卡片边界）
    const contexts = await ragSearch({
      data: { question: data.question, limit: 3, userId: data.userId, selectedIds: data.selectedIds },
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

    // 3. 调 DeepSeek-V3 生成回答（含对话历史）
    const prompt = `基于以下实验记录回答用户问题。\n\n实验记录：\n${contextBlock}\n\n用户问题：${data.question}\n\n请用2-4句话回答，并引用相关实验名称。`;

    // 构建 messages：system + 历史（最近 N 轮）+ 当前问题
    const historyMessages = (data.history ?? []).slice(-6).map((h) => ({
      role: h.role,
      content: h.role === "assistant" ? h.content.slice(0, 300) : h.content,
    }));

    let answer: string;
    try {
      answer = await chatCompletion({
        data: {
          model: "deepseek-ai/DeepSeek-V3",
          messages: [
            { role: "system", content: RAG_SYSTEM_PROMPT },
            ...historyMessages,
            { role: "user", content: prompt },
          ],
          maxTokens: 512,
        },
      });
    } catch (err) {
      console.error("[RAG] LLM call failed:", err);
      answer =
        `检索到 ${contexts.length} 条相关实验（LLM 暂时不可用）：\n` +
        contexts
          .map((c) => `• ${c.name}（相似度 ${(c.similarity * 100).toFixed(0)}%）`)
          .join("\n");
    }

    // 4. 构建来源
    const sources: RagSource[] = contexts.map((c) => ({
      doc: c.name,
      page: "实验卡片",
      confidence: `${(c.similarity * 100).toFixed(0)}%`,
      link: `/workbench?id=${c.id}`,
    }));

    return { answer, sources };
  });

// ═══════════════════════════════════════════════════════
// RAG 流式问答（SSE）
// ═══════════════════════════════════════════════════════

const SF_BASE = "https://api.siliconflow.cn/v1";

export const ragAnswerStream = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      question: z.string().min(1),
      userId: z.string().optional().nullable(),
      selectedIds: z.array(z.string()).optional(),
      history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).optional(),
    }),
  )
  .handler(async ({ data }) => {
    // 1. RAG 检索（复用 ragSearch）
    const contexts = await ragSearch({
      data: { question: data.question, limit: 3, userId: data.userId, selectedIds: data.selectedIds },
    });

    let sources: RagSource[] = [];
    let contextBlock = "";

    if (Array.isArray(contexts) && contexts.length > 0) {
      sources = contexts.map((c) => ({
        doc: c.name,
        page: "实验卡片",
        confidence: `${(c.similarity * 100).toFixed(0)}%`,
        link: `/workbench?id=${c.id}`,
      }));

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
    const apiKey = config.sfApiKey;
    if (!apiKey) throw new Error("SF_API_KEY not configured");

    const encoder = new TextEncoder();

    // 3. 无上下文时直接返回非流式响应
    if (!contextBlock) {
      const body = JSON.stringify({
        type: "done",
        answer: "知识库中暂无与您问题相关的实验记录。建议：① 先上传实验数据 ② 使用更具体的关键词 ③ 直接在实验卡片中搜索。",
        sources: [],
      });
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: "sources", sources: [] })}\n\ndata: ${JSON.stringify({ type: "token", content: "知识库中暂无与您问题相关的实验记录。" })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "x-tss-raw": "true",
          },
        },
      );
    }

    // 4. 调用 SiliconFlow 流式 API
    let sfRes: Response;
    try {
      sfRes = await fetch(`${SF_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-ai/DeepSeek-V3",
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
          `data: ${JSON.stringify({ type: "error", message: errMsg })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`
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
          `data: ${JSON.stringify({ type: "error", message: `API ${sfRes.status}: ${errText.slice(0, 200)}` })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`
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

    // 5. 构建 SSE 流：先发 sources，再 pipe SiliconFlow token 流
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // 先写 sources 事件
    writer.write(
      encoder.encode(
        `data: ${JSON.stringify({ type: "sources", sources })}\n\n`
      )
    );

    // 异步 pipe SiliconFlow SSE stream
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
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "token", content })}\n\n`
                    )
                  );
                }
              } catch {
                // Skip malformed SSE lines
              }
            }
          }
        }
        // 处理 buffer 中剩余的行
        if (buffer.startsWith("data: ") && buffer.slice(6).trim() && buffer.slice(6).trim() !== "[DONE]") {
          try {
            const parsed = JSON.parse(buffer.slice(6).trim());
            const content = parsed?.choices?.[0]?.delta?.content;
            if (content) {
              writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "token", content })}\n\n`
                )
              );
            }
          } catch { /* skip */ }
        }
        writer.write(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );
      } catch (err) {
        writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: "流中断" })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`
          )
        );
      } finally {
        try { await writer.close(); } catch { /* already closed */ }
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "x-tss-raw": "true",
      },
    });
  });
