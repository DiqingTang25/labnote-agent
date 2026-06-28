/**
 * AI Server Functions — 代理所有 SiliconFlow API 调用
 *
 * 这些 createServerFn 的 .handler 代码仅在服务端运行
 * SF_API_KEY 永远不会暴露给浏览器
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerConfig } from "../config.server";
import { getProxiedFetch } from "../proxy-fetch.server";

const SF_BASE = "https://api.siliconflow.cn/v1";

/** Fetch with optional HTTP proxy support */
function apiFetch(url: string, init: RequestInit): Promise<Response> {
  return getProxiedFetch()(url, init);
}

// ═══════════════════════════════════════════════════════
// Chat Completion（文本 / 多模态）
// ═══════════════════════════════════════════════════════

export const chatCompletion = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      model: z.string(),
      messages: z.array(z.object({
        role: z.string(),
        content: z.unknown(),
      })),
      maxTokens: z.number().optional().default(2048),
      temperature: z.number().optional().default(0.3),
    }),
  )
  .handler(async ({ data }) => {
    const config = getServerConfig();
    const apiKey = config.sfApiKey;
    if (!apiKey) throw new Error("SF_API_KEY not configured");

    const res = await apiFetch(`${SF_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: data.model,
        messages: data.messages,
        max_tokens: data.maxTokens,
        temperature: data.temperature,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SiliconFlow API ${res.status}: ${errText.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content ?? "";
  });

// ═══════════════════════════════════════════════════════
// Embedding 生成（BAAI/bge-large-zh-v1.5, 1024-dim）
// ═══════════════════════════════════════════════════════

const EMBEDDING_MODEL = "BAAI/bge-large-zh-v1.5";

export const generateEmbedding = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      text: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const config = getServerConfig();
    const apiKey = config.sfApiKey;
    if (!apiKey) return [] as number[];

    const res = await apiFetch(`${SF_BASE}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: [data.text.slice(0, 1500)],
      }),
    });

    const json = (await res.json()) as {
      data?: Array<{ embedding: number[] }>;
    };
    return json.data?.[0]?.embedding ?? [];
  });

// ═══════════════════════════════════════════════════════
// 批量 Embedding 生成（多 chunk 一次调用）
// ═══════════════════════════════════════════════════════

export const generateEmbeddings = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      texts: z.array(z.string().min(1)).max(16),
    }),
  )
  .handler(async ({ data }) => {
    const config = getServerConfig();
    const apiKey = config.sfApiKey;
    if (!apiKey) return [] as number[][];

    const res = await apiFetch(`${SF_BASE}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: data.texts.map((t) => t.slice(0, 1500)),
      }),
    });

    const json = (await res.json()) as {
      data?: Array<{ embedding: number[] }>;
    };
    return (json.data ?? []).map((d) => d.embedding);
  });

// ═══════════════════════════════════════════════════════
// Reranker — 交叉编码器精排
// ═══════════════════════════════════════════════════════

const RERANK_MODEL = "BAAI/bge-reranker-v2-m3";

export const rerank = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      query: z.string().min(1),
      documents: z.array(z.string().min(1)).max(50),
      topN: z.number().optional().default(3),
    }),
  )
  .handler(async ({ data }) => {
    const config = getServerConfig();
    const apiKey = config.sfApiKey;
    if (!apiKey) return [] as Array<{ index: number; score: number }>;

    try {
      const res = await apiFetch(`${SF_BASE}/rerank`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: RERANK_MODEL,
          query: data.query,
          documents: data.documents,
          top_n: data.topN,
          return_documents: false,
        }),
      });

      if (!res.ok) {
        console.error(`[Rerank] API error ${res.status}:`, await res.text().catch(() => ""));
        return [];
      }

      const json = (await res.json()) as {
        results?: Array<{ index: number; relevance_score: number }>;
      };
      return (json.results ?? []).map((r) => ({
        index: r.index,
        score: r.relevance_score,
      }));
    } catch (err) {
      console.error("[Rerank] call failed:", err);
      return [];
    }
  });

// ═══════════════════════════════════════════════════════
// Query 改写 — 模糊问题 → 精确检索词
// ═══════════════════════════════════════════════════════

const QUERY_REWRITE_PROMPT = `你是科研检索专家。将用户的模糊问题改写为精确的检索关键词。
规则：
1. 提取核心概念：材料名、参数名、设备名、实验方法等
2. 将代词（"上次""那个"）替换为历史中的具体实体
3. 输出纯关键词+简短描述，不超过50字
4. 不要回答问题，只输出检索词

示例：
输入："上次那个铁的降解率最佳条件？" + 历史中提到了"Fe₃O₄光催化"
输出：Fe₃O₄ 光催化 降解率 最佳条件 参数`;

export const rewriteQuery = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      question: z.string().min(1),
      history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).optional(),
    }),
  )
  .handler(async ({ data }) => {
    // 简单问题不需要改写
    if (data.question.length > 50 && !data.history?.length) {
      return data.question;
    }

    const config = getServerConfig();
    const apiKey = config.sfApiKey;
    if (!apiKey) return data.question;

    // 构建上下文：最近历史
    let context = "";
    if (data.history?.length) {
      context = "\n对话历史：\n" + data.history.slice(-4)
        .map((h) => `${h.role === "user" ? "用户" : "助手"}: ${h.content.slice(0, 200)}`)
        .join("\n");
    }

    try {
      const res = await apiFetch(`${SF_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-ai/DeepSeek-V3",
          messages: [
            { role: "system", content: QUERY_REWRITE_PROMPT },
            { role: "user", content: `用户问题：${data.question}${context}` },
          ],
          max_tokens: 100,
          temperature: 0.1,
        }),
      });

      if (!res.ok) return data.question;

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rewritten = json.choices?.[0]?.message?.content?.trim();
      return rewritten || data.question;
    } catch {
      return data.question; // 失败静默降级
    }
  });
