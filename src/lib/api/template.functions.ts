/**
 * 模板服务端函数 — Supabase templates 表 CRUD
 */

import { createServerFn } from "@tanstack/react-start";
import { getServiceSupabase } from "../supabase-server.server";
import type { Template } from "../exp-core";

// ═══════════════════════════════════════════════════════
// 获取所有模板（预设 + 用户自建）
// ═══════════════════════════════════════════════════════

export const fetchTemplates = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("is_preset", { ascending: false })
    .order("name");

  if (error) {
    console.error("[Templates] fetchTemplates error:", error.message);
    return [];
  }

  return (data as Array<{
    id: string;
    name: string;
    experiment_type: string;
    domain: string;
    version: number;
    field_groups: unknown;
    is_preset: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  }>).map((r) => ({
    id: r.id,
    name: r.name,
    experimentType: r.experiment_type,
    domain: r.domain,
    version: r.version,
    fieldGroups: r.field_groups as Template["fieldGroups"],
    isPreset: r.is_preset,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
});

// ═══════════════════════════════════════════════════════
// 获取单个模板
// ═══════════════════════════════════════════════════════

export const fetchTemplate = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      console.error("[Templates] fetchTemplate error:", error?.message);
      return null;
    }

    const r = data as Record<string, unknown>;
    return {
      id: r.id as string,
      name: r.name as string,
      experimentType: r.experiment_type as string,
      domain: r.domain as string,
      version: r.version as number,
      fieldGroups: r.field_groups as Template["fieldGroups"],
      isPreset: r.is_preset as boolean,
      createdBy: r.created_by as string | null,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  });

// ═══════════════════════════════════════════════════════
// 保存用户自定义模板
// ═══════════════════════════════════════════════════════

export const saveUserTemplate = createServerFn({ method: "POST" })
  .validator((tpl: {
    id: string;
    name: string;
    experimentType: string;
    domain: string;
    fieldGroups: Template["fieldGroups"];
    createdBy: string;
  }) => tpl)
  .handler(async ({ data: tpl }) => {
    const supabase = getServiceSupabase();
    const { error } = await supabase.from("templates").upsert({
      id: tpl.id,
      name: tpl.name,
      experiment_type: tpl.experimentType,
      domain: tpl.domain,
      version: 1,
      field_groups: tpl.fieldGroups,
      is_preset: false,
      created_by: tpl.createdBy,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[Templates] saveUserTemplate error:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  });

// ═══════════════════════════════════════════════════════
// 播种预设模板（幂等 — INSERT ON CONFLICT DO NOTHING）
// ═══════════════════════════════════════════════════════

export const seedPresetTemplates = createServerFn({ method: "POST" })
  .validator((templates: Array<{
    id: string;
    name: string;
    experimentType: string;
    domain: string;
    version: number;
    fieldGroups: Template["fieldGroups"];
  }>) => templates)
  .handler(async ({ data: templates }) => {
    const supabase = getServiceSupabase();
    const rows = templates.map((t) => ({
      id: t.id,
      name: t.name,
      experiment_type: t.experimentType,
      domain: t.domain,
      version: t.version,
      field_groups: t.fieldGroups,
      is_preset: true,
      created_by: null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("templates")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: false });

    if (error) {
      console.error("[Templates] seedPresetTemplates error:", error.message);
      return { success: false, error: error.message, count: 0 };
    }
    return { success: true, count: rows.length };
  });
