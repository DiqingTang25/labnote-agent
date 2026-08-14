/**
 * Server-side Decomposition — 服务端 AI 拆解
 *
 * 核心：拆解在服务端运行，不受客户端页面切换影响。
 * 客户端发起请求后即可导航离开，服务端完成拆解后自动存入 Supabase。
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuthenticatedUser } from "../supabase-server.server";

export const decomposeOnServer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      paperTitle: z.string(),
      paperDoi: z.string().default(""),
      methodsText: z.string().min(1),
      discipline: z.string().default("材料科学"),
      accessToken: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUser(data.accessToken);
    // 动态 import — 仅在服务端加载重依赖
    const [{ decomposePaperMethods }] = await Promise.all([import("../paper-decomposer")]);

    const result = await decomposePaperMethods(
      data.paperTitle,
      data.paperDoi,
      data.methodsText,
      data.discipline,
      undefined, // 无进度回调（服务端不需要）
    );

    // 保存到 Supabase（使用 service_role key）
    try {
      const { getServiceSupabase } = await import("../supabase-server.server");
      const sb = getServiceSupabase();

      // 表 id 列为 UUID 类型：插入合法 UUID（result.id 为字符串，直接插入会报
      // invalid input syntax for type uuid 导致保存失败）
      const auditRowId = crypto.randomUUID();
      const { error } = await sb.from("reproduction_audits").insert({
        id: auditRowId,
        user_id: userId,
        paper_title: result.paperTitle,
        paper_source: result.paperSource,
        discipline: data.discipline,
        parameters: result.parameters,
        gaps: result.gaps,
        reproducibility_score: result.reproducibilityScore,
        score_breakdown: result.scoreBreakdown,
        ai_assessment: result.aiAssessment,
        critical_risks: result.criticalRisks,
      });

      if (error) {
        console.error("[Decompose] Supabase save error:", error);
        return {
          auditId: auditRowId,
          paramCount: result.parameters.length,
          gapCount: result.gaps.length,
          saved: false,
          error: `保存失败: ${error.message}`,
        };
      }

      return {
        auditId: auditRowId,
        paramCount: result.parameters.length,
        gapCount: result.gaps.length,
        saved: true,
      };
    } catch (err) {
      console.error("[Decompose] save exception:", err);
      return {
        auditId: result.id, // 保存未执行，回退原始 id 供前端 pending 键使用
        paramCount: result.parameters.length,
        gapCount: result.gaps.length,
        saved: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
