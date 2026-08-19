/**
 * 团队模式服务端函数 — 创建团队 / 邀请码 / 加入 / 成员管理 / 资产转团队
 *
 * 写操作一律走 service_role（绕过 RLS），并在服务端校验调用者身份与权限。
 * 读操作（我的团队列表、成员名单、团队实验）由客户端经 RLS 直接查询，
 * 见 src/lib/supabase.ts 中的团队相关查询。
 *
 * 权限模型（与 20260816_teams.sql 迁移一致）：
 *   - owner（创建者）/ admin（管理员）：管理成员、生成邀请码、编辑删除全部团队实验
 *   - member（成员）：查看全部团队资产、编辑自己上传的、上传新资产
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuthenticatedUser, getServiceSupabase } from "../supabase-server.server";

/** 生成 8 位邀请码（去掉易混字符 0/O/1/I） */
function makeInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < 8; i++) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

/** 校验调用者是否为团队管理员（owner / admin） */
async function requireTeamAdmin(teamId: string, userId: string): Promise<boolean> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === "owner" || data.role === "admin";
}

/** 团队唯一标识校验（GitHub 组织 login 机制：slug 全局唯一，名称可重复） */
export const checkTeamSlugAvailable = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      slug: z.string().min(3).max(30),
      accessToken: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    await requireAuthenticatedUser(data.accessToken);
    const sb = getServiceSupabase();
    const slug = data.slug.trim().toLowerCase();
    if (!slug) return { available: false };
    const { data: rows } = await sb.from("teams").select("id").eq("slug", slug).limit(1);
    return { available: !rows || rows.length === 0 };
  });

/** 创建团队（调用者自动成为 owner） */
export const createTeam = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(60),
      slug: z
        .string()
        .min(3)
        .max(30)
        .regex(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/i, "标识仅支持小写字母、数字与连字符"),
      institution: z.string().max(120).default(""),
      department: z.string().max(120).default(""),
      discipline: z.string().max(120).default(""),
      researchAreas: z.array(z.string().max(40)).max(10).default([]),
      intro: z.string().max(2000).default(""),
      homepage: z.string().max(200).default(""),
      contactEmail: z.string().max(120).default(""),
      foundedYear: z.number().int().min(1900).max(2100).nullable().default(null),
      accessToken: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUser(data.accessToken);
    const sb = getServiceSupabase();
    // 服务端兜底唯一性（客户端校验之外的最后一道防线；数据库唯一索引兜第二道）
    const slug = data.slug.trim().toLowerCase();
    const { data: sameSlug } = await sb.from("teams").select("id").eq("slug", slug).limit(1);
    if (sameSlug && sameSlug.length > 0) {
      throw new Error("该唯一标识已被使用，请换一个");
    }
    const { data: team, error } = await sb
      .from("teams")
      .insert({
        name: data.name,
        slug,
        institution: data.institution || null,
        department: data.department || null,
        discipline: data.discipline || null,
        research_areas: data.researchAreas ?? [],
        intro: data.intro || null,
        homepage: data.homepage || null,
        contact_email: data.contactEmail || null,
        founded_year: data.foundedYear ?? null,
        created_by: userId,
      })
      .select()
      .single();
    if (error || !team) throw new Error("创建团队失败：" + (error?.message ?? "未知错误"));
    await sb.from("team_members").insert({ team_id: team.id, user_id: userId, role: "owner" });
    return team;
  });

/** 更新团队资料（管理员） */
export const updateTeamProfile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      teamId: z.string().min(1),
      name: z.string().min(1).max(60),
      institution: z.string().max(120).default(""),
      department: z.string().max(120).default(""),
      discipline: z.string().max(120).default(""),
      researchAreas: z.array(z.string().max(40)).max(10).default([]),
      intro: z.string().max(2000).default(""),
      homepage: z.string().max(200).default(""),
      contactEmail: z.string().max(120).default(""),
      accessToken: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUser(data.accessToken);
    if (!(await requireTeamAdmin(data.teamId, userId))) {
      throw new Error("只有管理员可以修改团队资料");
    }
    const sb = getServiceSupabase();
    const { error } = await sb
      .from("teams")
      .update({
        name: data.name,
        institution: data.institution || null,
        department: data.department || null,
        discipline: data.discipline || null,
        research_areas: data.researchAreas ?? [],
        intro: data.intro || null,
        homepage: data.homepage || null,
        contact_email: data.contactEmail || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.teamId);
    if (error) throw new Error("更新失败：" + error.message);
    return { ok: true };
  });

/** 成员更新自己在团队内的身份（PI/博士后/博士生…） */
export const updateMyTeamProfile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      teamId: z.string().min(1),
      roleTitle: z.string().max(60).default(""),
      accessToken: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUser(data.accessToken);
    const sb = getServiceSupabase();
    const { data: me } = await sb
      .from("team_members")
      .select("role")
      .eq("team_id", data.teamId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!me) throw new Error("你不在该团队中");
    const { error } = await sb
      .from("team_members")
      .update({ role_title: data.roleTitle || null })
      .eq("team_id", data.teamId)
      .eq("user_id", userId);
    if (error) throw new Error("更新失败：" + error.message);
    return { ok: true };
  });

/** 生成邀请码（管理员，7 天有效） */
export const generateInviteCode = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      teamId: z.string().min(1),
      accessToken: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUser(data.accessToken);
    if (!(await requireTeamAdmin(data.teamId, userId))) {
      throw new Error("只有管理员可以生成邀请码");
    }
    const sb = getServiceSupabase();
    const code = makeInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await sb.from("team_invites").insert({
      team_id: data.teamId,
      code,
      created_by: userId,
      expires_at: expiresAt,
    });
    if (error) throw new Error("生成邀请码失败：" + error.message);
    return { code, expiresAt };
  });

/** 通过邀请码加入团队 */
export const joinTeamByCode = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(1),
      accessToken: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUser(data.accessToken);
    const sb = getServiceSupabase();
    const { data: invite, error } = await sb
      .from("team_invites")
      .select("id, team_id, expires_at")
      .eq("code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (error || !invite) throw new Error("邀请码无效");
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      throw new Error("邀请码已过期");
    }
    const { data: existing } = await sb
      .from("team_members")
      .select("role")
      .eq("team_id", invite.team_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) throw new Error("你已经是该团队成员");
    const { error: joinErr } = await sb
      .from("team_members")
      .insert({ team_id: invite.team_id, user_id: userId, role: "member" });
    if (joinErr) throw new Error("加入失败：" + joinErr.message);
    const { data: team } = await sb.from("teams").select("*").eq("id", invite.team_id).single();
    return team;
  });

/** 调整成员角色（管理员；owner 不可被修改） */
export const updateMemberRole = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      teamId: z.string().min(1),
      memberUserId: z.string().min(1),
      role: z.enum(["admin", "member"]),
      accessToken: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUser(data.accessToken);
    if (!(await requireTeamAdmin(data.teamId, userId))) {
      throw new Error("只有管理员可以调整成员角色");
    }
    const sb = getServiceSupabase();
    const { data: target } = await sb
      .from("team_members")
      .select("role")
      .eq("team_id", data.teamId)
      .eq("user_id", data.memberUserId)
      .maybeSingle();
    if (!target) throw new Error("成员不存在");
    if (target.role === "owner") throw new Error("不能修改团队创建者的角色");
    const { error } = await sb
      .from("team_members")
      .update({ role: data.role })
      .eq("team_id", data.teamId)
      .eq("user_id", data.memberUserId);
    if (error) throw new Error("更新失败：" + error.message);
    return { ok: true };
  });

/** 移除成员（管理员；owner 与本人不可被移除） */
export const removeMember = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      teamId: z.string().min(1),
      memberUserId: z.string().min(1),
      accessToken: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUser(data.accessToken);
    if (!(await requireTeamAdmin(data.teamId, userId))) {
      throw new Error("只有管理员可以移除成员");
    }
    if (data.memberUserId === userId) throw new Error("不能移除自己，请创建者操作");
    const sb = getServiceSupabase();
    const { data: target } = await sb
      .from("team_members")
      .select("role")
      .eq("team_id", data.teamId)
      .eq("user_id", data.memberUserId)
      .maybeSingle();
    if (!target) throw new Error("成员不存在");
    if (target.role === "owner") throw new Error("不能移除团队创建者");
    const { error } = await sb
      .from("team_members")
      .delete()
      .eq("team_id", data.teamId)
      .eq("user_id", data.memberUserId);
    if (error) throw new Error("移除失败：" + error.message);
    return { ok: true };
  });

/** 主动退出团队（owner 不可退出） */
export const leaveTeam = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      teamId: z.string().min(1),
      accessToken: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUser(data.accessToken);
    const sb = getServiceSupabase();
    const { data: me } = await sb
      .from("team_members")
      .select("role")
      .eq("team_id", data.teamId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!me) throw new Error("你不在该团队中");
    if (me.role === "owner") throw new Error("创建者不能退出，请先解散团队或移交");
    const { error } = await sb
      .from("team_members")
      .delete()
      .eq("team_id", data.teamId)
      .eq("user_id", userId);
    if (error) throw new Error("退出失败：" + error.message);
    return { ok: true };
  });

/**
 * 个人资产转入团队（或转回个人：teamId 传 null）
 * 限制：只能转移自己上传的实验；转入团队时必须已是该团队成员。
 */
export const moveExperimentToTeam = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      experimentId: z.string().min(1),
      teamId: z.string().nullable(),
      accessToken: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUser(data.accessToken);
    const sb = getServiceSupabase();
    const { data: exp } = await sb
      .from("experiments")
      .select("user_id")
      .eq("id", data.experimentId)
      .maybeSingle();
    if (!exp) throw new Error("实验不存在");
    if (exp.user_id !== userId) throw new Error("只能转移自己上传的实验");
    if (data.teamId !== null) {
      const { data: membership } = await sb
        .from("team_members")
        .select("role")
        .eq("team_id", data.teamId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!membership) throw new Error("你不是该团队成员，无法转入");
    }
    const { error } = await sb
      .from("experiments")
      .update({ team_id: data.teamId })
      .eq("id", data.experimentId);
    if (error) throw new Error("转移失败：" + error.message);
    return { ok: true };
  });
