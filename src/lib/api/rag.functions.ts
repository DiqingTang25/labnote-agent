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
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServiceSupabase();

    // 1. 生成问题的 embedding
    const qVec = await generateEmbedding({ data: { text: data.question } });
    if (!Array.isArray(qVec) || qVec.length === 0) return [];

    // 2. pgvector RPC 相似度搜索（user_id 隔离）
    const { data: similar, error } = await supabase.rpc("match_experiments", {
      query_embedding: qVec,
      match_threshold: 0.6,
      match_count: data.limit,
      filter_user_id: data.userId ?? null,
    });

    if (error || !similar || !Array.isArray(similar)) return [];

    const simList = similar as Array<{ id: string; name: string; similarity: number }>;

    // 3. 拉取完整实验数据
    const ids = simList.map((s) => s.id);
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

    const simMap = new Map(simList.map((s) => [s.id, s.similarity]));

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

const RAG_SYSTEM_PROMPT = `你是 LabNote Agent，一个科研实验数据治理助手。
你的回答必须基于提供的实验记录上下文，不要编造数据。
如果上下文中没有相关信息，诚实告知用户"知识库中暂无相关记录"。
回答用中文，简洁专业，标注引用的实验名称和日期。`;

export const ragAnswer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      question: z.string().min(1),
      userId: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    // 1. 向量检索 Top-3 相关实验（按用户隔离）
    const contexts = await ragSearch({
      data: { question: data.question, limit: 3, userId: data.userId },
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

    // 3. 调 DeepSeek-V3 生成回答
    const prompt = `基于以下实验记录回答用户问题。\n\n实验记录：\n${contextBlock}\n\n用户问题：${data.question}\n\n请用2-4句话回答，并引用相关实验名称。`;

    let answer: string;
    try {
      answer = await chatCompletion({
        data: {
          model: "deepseek-ai/DeepSeek-V3",
          messages: [
            { role: "system", content: RAG_SYSTEM_PROMPT },
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
