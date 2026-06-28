/**
 * AI Server Functions — 代理所有 SiliconFlow API 调用
 *
 * 这些 createServerFn 的 .handler 代码仅在服务端运行
 * SF_API_KEY 永远不会暴露给浏览器
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerConfig } from "../config.server";

const SF_BASE = "https://api.siliconflow.cn/v1";

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

    const res = await fetch(`${SF_BASE}/chat/completions`, {
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

    const res = await fetch(`${SF_BASE}/embeddings`, {
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
