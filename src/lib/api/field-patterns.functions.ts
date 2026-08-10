/**
 * field_patterns 服务端函数 — Supabase field_patterns 表操作
 *
 * 统计刷新使用 service_role key（可读取所有用户数据做跨用户统计）
 */

import { createServerFn } from "@tanstack/react-start";
import { getServiceSupabase, requireAuthenticatedUser } from "../supabase-server.server";

/**
 * 刷新 field_patterns — 统计实验类型下所有字段的出现频率
 * 在每次实验保存后由 labStore 防抖调用
 */
export const refreshFieldPatterns = createServerFn({ method: "POST" })
  .inputValidator((accessToken: string) => accessToken)
  .handler(async ({ data: accessToken }) => {
    await requireAuthenticatedUser(accessToken);
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    // 1. 按 experiment_type 分组，提取每个实验的 properties 中扁平化字段
    // 用 SQL 做聚合更高效
    const { data, error } = await supabase.rpc("refresh_field_patterns_v1");

    if (error) {
      // RPC 不存在时降级：在客户端用 computePatterns
      console.warn("[field_patterns] RPC refresh_field_patterns_v1 not found:", error.message);
      return { success: false, error: error.message, method: "rpc" };
    }

    return { success: true, updatedAt: now, data };
  });

/**
 * 获取指定实验类型的 field_patterns
 */
export const fetchFieldPatterns = createServerFn({ method: "GET" })
  .inputValidator((experimentType: string) => experimentType)
  .handler(async ({ data: experimentType }) => {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("field_patterns")
      .select("*")
      .eq("experiment_type", experimentType)
      .order("occurrence_rate", { ascending: false });

    if (error) {
      console.error("[field_patterns] fetchFieldPatterns error:", error.message);
      return [];
    }

    return (data as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      experimentType: r.experiment_type as string,
      fieldPath: r.field_path as string,
      occurrenceCount: r.occurrence_count as number,
      occurrenceRate: r.occurrence_rate as number,
      valueType: r.value_type as string,
      valueStats: JSON.parse(JSON.stringify(r.value_stats ?? {})) as Record<
        string,
        string | number | boolean | null | string[]
      >,
      coOccurring: r.co_occurring as string[],
      updatedAt: r.updated_at as string,
    }));
  });
