/**
 * AI Server Functions — 代理所有 AI API 调用
 *
 * 这些 createServerFn 的 .handler 代码仅在服务端运行
 * AI_API_KEY 永远不会暴露给浏览器
 *
 * 当前后端: XJTLU AI Gateway → DeepSeek V4 Pro
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerConfig } from "../config.server";

const AI_BASE = "https://aiagent.xjtlu.edu.cn/api/aigw/v1";
const MODEL_CHAT = "d8j2d4r9dhtg6s3fevfg";
const MODEL_VISION = "d95koqj7u3anoctav5sg";
const MODEL_RERANK = "d8efv05lt96sitl7kjcg";
const EMBEDDING_MODEL_ID = "d8egv6v9ohgtar18hvrg";

/** 根据模型自动选择 API Key */
function selectApiKey(model: string): string | undefined {
  const config = getServerConfig();
  if (model === MODEL_VISION) return config.aiVisionKey || config.aiApiKey;
  return config.aiApiKey;
}

/** 原生 fetch — 应用内所有出站 API 均直连（Vercel 生产环境无代理，本地直连可达） */
function apiFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, init);
}

// ═══════════════════════════════════════════════════════
// Chat Completion（文本 / 多模态）
// ═══════════════════════════════════════════════════════

/** 服务端直调实现：供「服务端内部」的嵌套调用（实验复现 / MCP 处理器）使用。
 *  TanStack 服务器函数在服务端内再次调用会丢失 AsyncLocalStorage 上下文，
 *  因此在已知处于服务端运行时的代码路径中，直接调用本函数访问网关。 */
export async function chatCompletionDirect(params: {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const apiKey = selectApiKey(params.model);
  if (!apiKey) {
    console.error("[AI API] apiKey not configured");
    throw new Error("AI 服务暂时不可用，请稍后重试");
  }
  const res = await apiFetch(`${AI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      max_tokens: params.maxTokens ?? 2048,
      temperature: params.temperature ?? 0.3,
      stream: false,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[AI API] ${res.status}: ${errText.slice(0, 500)}`);
    throw new Error("AI 服务暂时不可用，请稍后重试");
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

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
      sanitized: z.boolean().optional().default(false),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = selectApiKey(data.model);
    if (!apiKey) {
      console.error("[AI API] apiKey not configured");
      throw new Error("AI 服务暂时不可用，请稍后重试");
    }

    // ── 服务端脱敏二次校验 ──
    if (!data.sanitized) {
      try {
        const { scanSensitivity } = await import("../sanitizer/detector");
        const text = extractTextForScan(data.messages as Array<{ role: string; content: unknown }>);
        const scan = scanSensitivity(text);

        if (scan.hasSensitive && scan.highRiskCount > 0) {
          console.warn(
            `[Sanitizer:Server] ⚠️ HIGH-RISK data detected in outgoing API call:\n` +
            `  Model: ${data.model}\n` +
            `  High-risk items: ${scan.highRiskCount}\n` +
            `  Summary: ${scan.summary}\n` +
            `  Content length: ${text.length} chars\n` +
            `  First 3 matches: ${scan.matches.slice(0, 3).map(m => `${m.label}("…${m.matched.slice(0, 40)}…")`).join("; ")}`
          );
        } else if (scan.hasSensitive) {
          console.warn(
            `[Sanitizer:Server] Medium/low-risk data in outgoing API call (${scan.matches.length} items). ` +
            `Model: ${data.model}, Content: ${text.length} chars`
          );
        }
      } catch (err) {
        // 脱敏扫描失败不阻塞业务
        console.warn("[Sanitizer:Server] Scan failed:", String(err).slice(0, 100));
      }
    }

    const res = await apiFetch(`${AI_BASE}/chat/completions`, {
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
      console.error(`[AI API] ${res.status}: ${errText.slice(0, 500)}`);
      throw new Error("AI 服务暂时不可用，请稍后重试");
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content ?? "";
  });

// ═══════════════════════════════════════════════════════
// Chat Completion with logprobs — Token-level confidence
// ═══════════════════════════════════════════════════════

export type TokenLogprob = {
  token: string;
  logprob: number;
  top_logprobs?: Array<{ token: string; logprob: number }>;
};

export type LogprobsResult = {
  content: string;
  logprobs: TokenLogprob[] | null;
};

export const chatCompletionWithLogprobs = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      model: z.string(),
      messages: z.array(z.object({
        role: z.string(),
        content: z.unknown(),
      })),
      maxTokens: z.number().optional().default(4096),
      temperature: z.number().optional().default(0.3),
      topLogprobs: z.number().optional().default(3),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = selectApiKey(data.model);
    if (!apiKey) {
      console.error("[AI API] apiKey not configured");
      throw new Error("AI 服务暂时不可用，请稍后重试");
    }

    const res = await apiFetch(`${AI_BASE}/chat/completions`, {
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
        logprobs: true,
        top_logprobs: data.topLogprobs,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[AI API] ${res.status}: ${errText.slice(0, 500)}`);
      throw new Error("AI 服务暂时不可用，请稍后重试");
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: { content?: string };
        logprobs?: { content?: TokenLogprob[] };
      }>;
    };

    return {
      content: json.choices?.[0]?.message?.content ?? "",
      logprobs: json.choices?.[0]?.logprobs?.content ?? null,
    } satisfies LogprobsResult;
  });

// ═══════════════════════════════════════════════════════
// Embedding 生成 — 当前后端不支持，返回空，RAG 降级关键词搜索
// ═══════════════════════════════════════════════════════

export const generateEmbedding = createServerFn({ method: "POST" })
  .inputValidator(z.object({ text: z.string().min(1) }))
  .handler(async ({ data }) => {
    const config = getServerConfig();
    const apiKey = config.aiEmbeddingKey || config.aiApiKey;
    if (!apiKey) {
      console.warn("[Embedding] No embedding key configured");
      return [] as number[];
    }

    try {
      const res = await apiFetch(`${AI_BASE}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL_ID,
          input: [data.text.slice(0, 1500)],
        }),
      });

      if (!res.ok) {
        console.error(`[Embedding] API error ${res.status}`);
        return [] as number[];
      }

      const json = (await res.json()) as {
        data?: Array<{ embedding: number[] }>;
      };
      return json.data?.[0]?.embedding ?? [];
    } catch (err) {
      console.error("[Embedding] call failed:", err);
      return [] as number[];
    }
  });

export const generateEmbeddings = createServerFn({ method: "POST" })
  .inputValidator(z.object({ texts: z.array(z.string().min(1)).max(16) }))
  .handler(async ({ data }) => {
    const config = getServerConfig();
    const apiKey = config.aiEmbeddingKey || config.aiApiKey;
    if (!apiKey) {
      console.warn("[Embedding] No embedding key configured");
      return [] as number[][];
    }

    try {
      const res = await apiFetch(`${AI_BASE}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL_ID,
          input: data.texts.map((t) => t.slice(0, 1500)),
        }),
      });

      if (!res.ok) {
        console.error(`[Embedding] API error ${res.status}`);
        return [] as number[][];
      }

      const json = (await res.json()) as {
        data?: Array<{ embedding: number[] }>;
      };
      return (json.data ?? []).map((d) => d.embedding);
    } catch (err) {
      console.error("[Embedding] call failed:", err);
      return [] as number[][];
    }
  });

// ═══════════════════════════════════════════════════════
// Reranker — Qwen3-Reranker-8B 交叉编码器精排
// ═══════════════════════════════════════════════════════

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
    const apiKey = config.aiRerankKey || config.aiApiKey;
    if (!apiKey) {
      console.warn("[Rerank] No rerank key configured");
      return [] as Array<{ index: number; score: number }>;
    }

    try {
      const res = await apiFetch(`${AI_BASE}/rerank`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_RERANK,
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
    const apiKey = config.aiApiKey;
    if (!apiKey) return data.question;

    // 构建上下文：最近历史
    let context = "";
    if (data.history?.length) {
      context = "\n对话历史：\n" + data.history.slice(-4)
        .map((h) => `${h.role === "user" ? "用户" : "助手"}: ${h.content.slice(0, 200)}`)
        .join("\n");
    }

    try {
      const res = await apiFetch(`${AI_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_CHAT,
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

// ═══════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════

/** 从 messages 中提取纯文本用于脱敏扫描 */
function extractTextForScan(messages: Array<{ role: string; content: unknown }>): string {
  const parts: string[] = [];
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      parts.push(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content as Array<{ type?: string; text?: string; image_url?: unknown }>) {
        if (block.type === "text" && block.text) {
          parts.push(block.text);
        }
      }
    }
  }
  return parts.join("\n");
}
