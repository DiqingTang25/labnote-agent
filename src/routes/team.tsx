import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "../lib/auth-context";
import { useLab } from "../lib/labStore";
import { RequireAuth } from "../lib/auth-guard";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Building2, Users, Trophy, FolderKanban, Megaphone, Activity, LayoutTemplate,
  Plus, Trash2, Shield, ShieldCheck, Copy, KeyRound, LogOut,
  FileText, Award, ScrollText, Presentation, GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateInviteCode,
  updateMemberRole,
  removeMember,
  updateTeamProfile,
  updateMyTeamProfile,
  leaveTeam,
} from "../lib/api/teams.functions";
import {
  fetchTeamMembers,
  fetchTeamAchievements,
  insertTeamAchievement,
  deleteTeamAchievement,
  fetchTeamProjects,
  insertTeamProject,
  deleteTeamProject,
  fetchTeamAnnouncements,
  insertTeamAnnouncement,
  deleteTeamAnnouncement,
  supabase,
  type TeamAchievement,
  type TeamProject,
  type TeamAnnouncement,
} from "../lib/supabase";
import { TeamTemplatesTab } from "../components/TeamTemplatesTab";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "团队管理 – LabNote Agent" },
      { name: "description", content: "课题组协作：团队概况、成员、成果、项目与公告。" },
    ],
  }),
  component: TeamPage,
});

const ACH_TYPE: Record<TeamAchievement["type"], { label: string; icon: typeof FileText }> = {
  publication: { label: "论文", icon: FileText },
  patent: { label: "专利", icon: ScrollText },
  award: { label: "获奖", icon: Trophy },
  conference: { label: "会议", icon: Presentation },
};

type TabKey = "overview" | "members" | "achievements" | "projects" | "announcements" | "activity" | "templates";

function TeamPage() {
  const { session } = useAuth();
  const { workspace, myTeams, myRole, visibleExperiments, setWorkspace, requestGate } = useLab();
  const [tab, setTab] = useState<TabKey>("overview");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<{ user_id: string; role: string; role_title: string | null; joined_at: string; name: string; email: string | null }[]>([]);
  const [achievements, setAchievements] = useState<TeamAchievement[]>([]);
  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [announcements, setAnnouncements] = useState<TeamAnnouncement[]>([]);

  const team = useMemo(
    () => myTeams.find((t) => t.team.id === teamId)?.team,
    [myTeams, teamId],
  );
  const isAdmin = myRole === "owner" || myRole === "admin";
  const accessToken = session?.access_token ?? "";

  // 当前团队 = 工作空间团队；没有则取第一个加入的团队
  useEffect(() => {
    if (workspace.mode === "team" && workspace.teamId) {
      setTeamId(workspace.teamId);
    } else if (myTeams.length > 0) {
      setTeamId(myTeams[0].team.id);
    } else {
      setTeamId(null);
    }
  }, [workspace, myTeams]);

  const loadMembers = async () => {
    if (!teamId) return;
    const rows = await fetchTeamMembers(teamId);
    const ids = rows.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, email")
      .in("user_id", ids);
    const map = new Map<string, { name: string; email: string | null }>();
    for (const p of (profiles ?? []) as { user_id: string; name: string | null; email: string | null }[]) {
      map.set(p.user_id, { name: p.name ?? "", email: p.email });
    }
    setMembers(
      rows.map((m) => {
        const p = map.get(m.user_id);
        return {
          ...m,
          name: p?.name || p?.email?.split("@")[0] || "成员",
          email: p?.email ?? null,
        };
      }),
    );
  };

  const loadAll = async () => {
    if (!teamId) return;
    const [a, p, n] = await Promise.all([
      fetchTeamAchievements(teamId),
      fetchTeamProjects(teamId),
      fetchTeamAnnouncements(teamId),
    ]);
    setAchievements(a);
    setProjects(p);
    setAnnouncements(n);
    await loadMembers();
  };

  useEffect(() => {
    loadAll();
  }, [teamId]);

  if (!teamId || !team) {
    return (
      <RequireAuth>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <Building2 size={40} className="mx-auto text-primary" />
          <h1 className="mt-4 text-xl font-semibold">还没有加入任何团队</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            创建课题组与成员共享实验资产，或输入管理员分享的邀请码加入已有团队。
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => requestGate("create")}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary/90"
            >
              <Plus size={14} /> 创建团队
            </button>
            <button
              onClick={() => requestGate("join")}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-secondary"
            >
              <KeyRound size={14} /> 输入邀请码加入
            </button>
          </div>
        </div>
      </RequireAuth>
    );
  }

  const tabs: { key: TabKey; label: string; icon: typeof Users }[] = [
    { key: "overview", label: "概况", icon: Building2 },
    { key: "members", label: "成员", icon: Users },
    { key: "achievements", label: "成果墙", icon: Trophy },
    { key: "projects", label: "项目", icon: FolderKanban },
    { key: "announcements", label: "公告", icon: Megaphone },
    { key: "activity", label: "动态", icon: Activity },
    { key: "templates", label: "模板", icon: LayoutTemplate },
  ];

  const teamExps = visibleExperiments.filter((e) => e.teamId === teamId);

  return (
    <RequireAuth>
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* 团队头部 */}
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              {team.name}
              {team.slug && (
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-normal text-muted-foreground">
                  @{team.slug}
                </span>
              )}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {[team.institution, team.department, team.discipline].filter(Boolean).join(" · ") || "课题组 / 实验室"}
              {team.founded_year ? ` · 成立于 ${team.founded_year}` : ""}
              {isAdmin ? " · 管理员" : myRole === "member" ? " · 成员" : ""}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {(team.research_areas ?? []).slice(0, 4).map((a) => (
              <span key={a} className="rounded-full bg-primary-soft px-3 py-1 text-xs text-primary">
                {a}
              </span>
            ))}
          </div>
        </div>

        {/* Tab 栏 */}
        <div className="mt-6 flex flex-wrap gap-1 border-b border-border pb-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm transition ${
                tab === t.key
                  ? "border border-border border-b-transparent bg-background text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "overview" && (
            <OverviewTab
              team={team}
              isAdmin={isAdmin}
              accessToken={accessToken}
              members={members}
              achievements={achievements}
              projects={projects}
              teamExps={teamExps}
            />
          )}
          {tab === "members" && (
            <MembersTab
              members={members}
              isAdmin={isAdmin}
              accessToken={accessToken}
              teamId={teamId}
              myUserId={session?.user?.id ?? ""}
              onChanged={loadAll}
            />
          )}
          {tab === "achievements" && (
            <AchievementsTab
              achievements={achievements}
              isAdmin={isAdmin}
              teamId={teamId}
              onChanged={loadAll}
            />
          )}
          {tab === "projects" && (
            <ProjectsTab
              projects={projects}
              isAdmin={isAdmin}
              teamId={teamId}
              onChanged={loadAll}
            />
          )}
          {tab === "announcements" && (
            <AnnouncementsTab
              announcements={announcements}
              isAdmin={isAdmin}
              teamId={teamId}
              onChanged={loadAll}
            />
          )}
          {tab === "activity" && (
            <ActivityTab teamExps={teamExps} members={members} teamName={team.name} />
          )}
          {tab === "templates" && (
            <TeamTemplatesTab teamId={teamId} isAdmin={isAdmin} />
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

/* ═══════════════ 概况 ═══════════════ */

function OverviewTab(props: {
  team: NonNullable<ReturnType<typeof useLab>["myTeams"][number]["team"]>;
  isAdmin: boolean;
  accessToken: string;
  members: { name: string }[];
  achievements: TeamAchievement[];
  projects: TeamProject[];
  teamExps: ReturnType<typeof useLab>["visibleExperiments"];
}) {
  const { team, isAdmin, accessToken, members, achievements, projects, teamExps } = props;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: team.name,
    institution: team.institution ?? "",
    department: team.department ?? "",
    discipline: team.discipline ?? "",
    areas: (team.research_areas ?? []).join("、"),
    intro: team.intro ?? "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      await updateTeamProfile({
        data: {
          teamId: team.id,
          name: form.name.trim(),
          institution: form.institution.trim(),
          department: form.department.trim(),
          discipline: form.discipline.trim(),
          researchAreas: form.areas.split(/[,，、;；]/).map((s) => s.trim()).filter(Boolean),
          intro: form.intro.trim(),
          accessToken,
        },
      });
      toast.success("团队资料已更新");
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "更新失败");
    } finally {
      setBusy(false);
    }
  };

  const stats = [
    { label: "成员", value: members.length },
    { label: "团队实验", value: teamExps.length },
    { label: "成果", value: achievements.length },
    { label: "项目", value: projects.length },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card-soft p-5 lg:col-span-2">
        {!editing ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">团队概况</h2>
              {isAdmin && (
                <button onClick={() => setEditing(true)} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary transition">
                  编辑资料
                </button>
              )}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div><span className="text-muted-foreground">所属机构：</span>{team.institution || "未填写"}</div>
              <div><span className="text-muted-foreground">挂靠学院：</span>{team.department || "未填写"}</div>
              <div><span className="text-muted-foreground">学科：</span>{team.discipline || "未填写"}</div>
              <div><span className="text-muted-foreground">研究方向：</span>{(team.research_areas ?? []).join(" · ") || "未填写"}</div>
              {team.homepage && (
                <div><span className="text-muted-foreground">官网：</span>{team.homepage}</div>
              )}
              {team.contact_email && (
                <div><span className="text-muted-foreground">联系邮箱：</span>{team.contact_email}</div>
              )}
            </div>
            <div className="mt-4 rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground whitespace-pre-wrap">
              {team.intro || "暂无团队简介——管理员可在「编辑资料」中补充。"}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold mb-3">编辑团队资料</h2>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="团队名称 *" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
              <div className="grid grid-cols-2 gap-3">
                <input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="所属机构" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="挂靠学院" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} placeholder="学科" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
                <input value={form.areas} onChange={(e) => setForm({ ...form, areas: e.target.value })} placeholder="研究方向（逗号分隔）" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
              </div>
              <textarea value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} placeholder="团队简介" rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60 resize-none" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditing(false)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary transition">取消</button>
              <button onClick={submit} disabled={busy} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50">
                {busy ? "保存中…" : "保存"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="card-soft p-4 text-center">
              <div className="text-2xl font-bold text-primary">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="card-soft p-4">
          <div className="text-xs font-medium text-muted-foreground mb-2">团队资产说明</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            团队模式下，工作台、关系图谱与知识问答自动覆盖全团队实验——成员上传的每一份资料，都是团队可复用的资产。
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ 成员 ═══════════════ */

function MembersTab(props: {
  members: { user_id: string; role: string; role_title: string | null; joined_at: string; name: string; email: string | null }[];
  isAdmin: boolean;
  accessToken: string;
  teamId: string;
  myUserId: string;
  onChanged: () => void;
}) {
  const { members, isAdmin, accessToken, teamId, myUserId, onChanged } = props;
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [myTitle, setMyTitle] = useState("");

  useEffect(() => {
    const me = members.find((m) => m.user_id === myUserId);
    setMyTitle(me?.role_title ?? "");
  }, [members, myUserId]);

  const genInvite = async () => {
    setBusy(true);
    try {
      const r = await generateInviteCode({ data: { teamId, accessToken } });
      setInvite(r);
      toast.success("邀请码已生成，7 天内有效");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "生成失败");
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async () => {
    if (!invite) return;
    const text = `加入 LabNote 团队：邀请码 ${invite.code}（打开 https://labnote.tech 登录后输入）`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("邀请信息已复制，可粘贴发给同事");
    } catch {
      toast.error("复制失败，请手动复制邀请码");
    }
  };

  const setRole = async (memberUserId: string, role: "admin" | "member") => {
    try {
      await updateMemberRole({ data: { teamId, memberUserId, role, accessToken } });
      toast.success(role === "admin" ? "已设为管理员" : "已设为成员");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败");
    }
  };

  const kick = async (memberUserId: string) => {
    try {
      await removeMember({ data: { teamId, memberUserId, accessToken } });
      toast.success("已移除成员");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败");
    }
  };

  const saveMyTitle = async () => {
    try {
      await updateMyTeamProfile({ data: { teamId, roleTitle: myTitle, accessToken } });
      toast.success("身份已更新");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    }
  };

  const roleBadge = (role: string) =>
    role === "owner"
      ? { text: "创建者", cls: "bg-primary text-primary-foreground" }
      : role === "admin"
        ? { text: "管理员", cls: "bg-primary-soft text-primary" }
        : { text: "成员", cls: "bg-secondary text-muted-foreground" };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="card-soft flex flex-wrap items-center gap-3 p-4">
          <div className="flex items-center gap-2 text-sm">
            <KeyRound size={15} className="text-primary" />
            邀请成员：
          </div>
          {invite ? (
            <>
              <span className="rounded-lg bg-secondary px-3 py-1.5 font-mono text-sm tracking-[0.2em]">{invite.code}</span>
              <span className="text-xs text-muted-foreground">7 天内有效</span>
              <button onClick={copyInvite} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary transition">
                <Copy size={12} /> 复制邀请信息
              </button>
            </>
          ) : (
            <button onClick={genInvite} disabled={busy} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50">
              {busy ? "生成中…" : "生成邀请码"}
            </button>
          )}
        </div>
      )}

      <div className="card-soft p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">成员名单（{members.length}）</h2>
          <span className="text-xs text-muted-foreground">点击自己的「身份」可填写：PI / 博士后 / 博士生…</span>
        </div>
        <div className="mt-3 divide-y divide-border">
          {members.map((m) => {
            const badge = roleBadge(m.role);
            const isMe = m.user_id === myUserId;
            return (
              <div key={m.user_id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                  {m.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {m.name}
                    {isMe && <span className="text-xs text-muted-foreground">（我）</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${badge.cls}`}>{badge.text}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.email || m.user_id.slice(0, 8)} · 加入于 {new Date(m.joined_at).toLocaleDateString("zh-CN")}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {isMe ? (
                    <>
                      <input
                        value={myTitle}
                        onChange={(e) => setMyTitle(e.target.value)}
                        placeholder="我的身份（如：博士生）"
                        className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary/60 w-36"
                      />
                      <button onClick={saveMyTitle} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary transition">保存</button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">{m.role_title || "未填写身份"}</span>
                  )}
                  {isAdmin && m.role === "member" && (
                    <button onClick={() => setRole(m.user_id, "admin")} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary transition">
                      <Shield size={12} /> 设为管理员
                    </button>
                  )}
                  {isAdmin && m.role === "admin" && (
                    <button onClick={() => setRole(m.user_id, "member")} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary transition">
                      <ShieldCheck size={12} /> 设为成员
                    </button>
                  )}
                  {isAdmin && m.role !== "owner" && (
                    <button onClick={() => kick(m.user_id)} className="flex items-center gap-1 rounded-lg border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition">
                      <Trash2 size={12} /> 移除
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!isAdmin && (
        <div className="card-soft p-4">
          <h2 className="text-sm font-semibold">退出团队</h2>
          <p className="mt-1 text-xs text-muted-foreground">退出后不再看到团队资产，你上传的团队实验仍保留在团队中。</p>
          <button
            onClick={async () => {
              try {
                await leaveTeam({ data: { teamId, accessToken } });
                toast.success("已退出团队");
                window.location.reload();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "退出失败");
              }
            }}
            className="mt-3 flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition"
          >
            <LogOut size={12} /> 退出团队
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ 成果墙 ═══════════════ */

function AchievementsTab(props: {
  achievements: TeamAchievement[];
  isAdmin: boolean;
  teamId: string;
  onChanged: () => void;
}) {
  const { achievements, isAdmin, teamId, onChanged } = props;
  const [filter, setFilter] = useState<TeamAchievement["type"] | "all">("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: "publication" as TeamAchievement["type"], title: "", venue: "", detail: "", year: "", link: "" });
  const [busy, setBusy] = useState(false);

  const list = achievements.filter((a) => filter === "all" || a.type === filter);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      const ok = await insertTeamAchievement({
        team_id: teamId,
        type: form.type,
        title: form.title.trim(),
        venue: form.venue.trim() || null,
        detail: form.detail.trim() || null,
        year: form.year ? Number(form.year) : null,
        link: form.link.trim() || null,
      });
      if (!ok) throw new Error("添加失败");
      toast.success("已添加到成果墙");
      setAdding(false);
      setForm({ type: "publication", title: "", venue: "", detail: "", year: "", link: "" });
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "添加失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "publication", "patent", "award", "conference"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full px-3 py-1 text-xs transition ${filter === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            {t === "all" ? "全部" : ACH_TYPE[t].label}
          </button>
        ))}
        {isAdmin && (
          <button onClick={() => setAdding(!adding)} className="ml-auto flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition">
            <Plus size={12} /> 添加成果
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={submit} className="card-soft space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {(["publication", "patent", "award", "conference"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className={`rounded-full px-3 py-1 text-xs transition ${form.type === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
              >
                {ACH_TYPE[t].label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="名称 *（论文题名 / 奖项名称…）" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
            <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="刊物 / 专利号 / 会议名称" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
            <input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="补充（作者 / 年卷期 / 等级…）" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="年份" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
              <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="原文链接（可选）" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary transition">取消</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50">{busy ? "添加中…" : "添加"}</button>
          </div>
        </form>
      )}

      <div className="card-soft divide-y divide-border p-2">
        {list.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">暂无成果记录</p>}
        {list.map((a) => {
          const meta = ACH_TYPE[a.type];
          return (
            <div key={a.id} className="flex items-center gap-3 px-2 py-3">
              <span className={`rounded-lg p-2 ${a.type === "award" ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground"}`}>
                <meta.icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {a.link ? (
                    <a href={a.link} target="_blank" rel="noreferrer" className="hover:text-primary truncate">{a.title}</a>
                  ) : (
                    <span className="truncate">{a.title}</span>
                  )}
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{meta.label}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {[a.year ? String(a.year) : "", a.venue, a.detail].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={async () => {
                    await deleteTeamAchievement(a.id);
                    toast.success("已删除");
                    onChanged();
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive transition"
                  aria-label="删除"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════ 项目 ═══════════════ */

function ProjectsTab(props: {
  projects: TeamProject[];
  isAdmin: boolean;
  teamId: string;
  onChanged: () => void;
}) {
  const { projects, isAdmin, teamId, onChanged } = props;
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", status: "ongoing" as "ongoing" | "completed", funding: "", grantNo: "", started: "", ended: "", description: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      const ok = await insertTeamProject({
        team_id: teamId,
        title: form.title.trim(),
        status: form.status,
        funding_source: form.funding.trim() || null,
        grant_no: form.grantNo.trim() || null,
        started_at: form.started.trim() || null,
        ended_at: form.ended.trim() || null,
        description: form.description.trim() || null,
        lead_user_id: null,
      });
      if (!ok) throw new Error("添加失败");
      toast.success("项目已添加");
      setAdding(false);
      setForm({ title: "", status: "ongoing", funding: "", grantNo: "", started: "", ended: "", description: "" });
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "添加失败");
    } finally {
      setBusy(false);
    }
  };

  const renderGroup = (status: "ongoing" | "completed", label: string) => {
    const list = projects.filter((p) => p.status === status);
    return (
      <div className="card-soft p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <GraduationCap size={15} className={status === "ongoing" ? "text-primary" : "text-muted-foreground"} />
          {label}（{list.length}）
        </h2>
        <div className="mt-3 divide-y divide-border">
          {list.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">暂无{label}</p>}
          {list.map((p) => (
            <div key={p.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{p.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {[p.funding_source, p.grant_no, p.started_at && p.ended_at ? `${p.started_at}–${p.ended_at}` : p.started_at || p.ended_at].filter(Boolean).join(" · ") || "—"}
                </div>
                {p.description && <div className="mt-1 text-xs text-muted-foreground">{p.description}</div>}
              </div>
              {isAdmin && (
                <button
                  onClick={async () => {
                    await deleteTeamProject(p.id);
                    toast.success("已删除");
                    onChanged();
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive transition"
                  aria-label="删除"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <button onClick={() => setAdding(!adding)} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition">
            <Plus size={12} /> 添加项目
          </button>
        </div>
      )}
      {adding && (
        <form onSubmit={submit} className="card-soft space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {(["ongoing", "completed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm({ ...form, status: s })}
                className={`rounded-full px-3 py-1 text-xs transition ${form.status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
              >
                {s === "ongoing" ? "进行中" : "已结项"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="项目名称 *" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
            <input value={form.funding} onChange={(e) => setForm({ ...form, funding: e.target.value })} placeholder="经费来源 / 批准部门" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
            <input value={form.grantNo} onChange={(e) => setForm({ ...form, grantNo: e.target.value })} placeholder="项目编号（可选）" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.started} onChange={(e) => setForm({ ...form, started: e.target.value })} placeholder="开始（如 2026-01）" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
              <input value={form.ended} onChange={(e) => setForm({ ...form, ended: e.target.value })} placeholder="结束（如 2027-12）" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
            </div>
          </div>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="项目简介（可选）" rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60 resize-none" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary transition">取消</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50">{busy ? "添加中…" : "添加"}</button>
          </div>
        </form>
      )}
      {renderGroup("ongoing", "正在进行的任务")}
      {renderGroup("completed", "已结项的任务")}
    </div>
  );
}

/* ═══════════════ 公告 ═══════════════ */

function AnnouncementsTab(props: {
  announcements: TeamAnnouncement[];
  isAdmin: boolean;
  teamId: string;
  onChanged: () => void;
}) {
  const { announcements, isAdmin, teamId, onChanged } = props;
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", pinned: false });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setBusy(true);
    try {
      const ok = await insertTeamAnnouncement({
        team_id: teamId,
        title: form.title.trim(),
        content: form.content.trim(),
        pinned: form.pinned,
      });
      if (!ok) throw new Error("发布失败");
      toast.success("公告已发布");
      setAdding(false);
      setForm({ title: "", content: "", pinned: false });
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "发布失败");
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <button onClick={() => setAdding(!adding)} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition">
            <Plus size={12} /> 发布公告
          </button>
        </div>
      )}
      {adding && (
        <form onSubmit={submit} className="card-soft space-y-3 p-4">
          <div className="flex items-center gap-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="公告标题 *" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60" />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
              置顶
            </label>
          </div>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="公告内容 *（近期发展、组会通知…）" rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60 resize-none" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary transition">取消</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50">{busy ? "发布中…" : "发布"}</button>
          </div>
        </form>
      )}
      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="card-soft p-8 text-center text-sm text-muted-foreground">暂无公告</div>
        )}
        {sorted.map((a) => (
          <div key={a.id} className={`card-soft p-4 ${a.pinned ? "border-primary/40" : ""}`}>
            <div className="flex items-center gap-2">
              {a.pinned && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] text-primary">置顶</span>}
              <h3 className="text-sm font-semibold">{a.title}</h3>
              <span className="ml-auto text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("zh-CN")}</span>
              {isAdmin && (
                <button
                  onClick={async () => {
                    await deleteTeamAnnouncement(a.id);
                    toast.success("已删除");
                    onChanged();
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive transition"
                  aria-label="删除"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ 动态 ═══════════════ */

function ActivityTab(props: {
  teamExps: ReturnType<typeof useLab>["visibleExperiments"];
  members: { user_id: string; name: string; joined_at: string }[];
  teamName: string;
}) {
  const { teamExps, members, teamName } = props;
  const nameOf = (userId: string) => members.find((m) => m.user_id === userId)?.name ?? "成员";

  const events = [
    ...teamExps.slice(0, 12).map((e) => ({
      id: e.id,
      time: e.updatedAt || e.createdAt,
      text: `${nameOf(e.userId)} 上传了实验「${e.name}」`,
      kind: "exp",
    })),
    ...members.map((m) => ({
      id: "m-" + m.user_id,
      time: m.joined_at,
      text: `${m.name} 加入了 ${teamName}`,
      kind: "member",
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 20);

  return (
    <div className="card-soft p-4">
      <h2 className="text-sm font-semibold">团队动态</h2>
      <p className="mt-1 text-xs text-muted-foreground">谁上传了什么、谁加入了团队——知识的积累过程，实时可见。</p>
      <div className="mt-4 divide-y divide-border">
        {events.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">暂无动态</p>}
        {events.map((ev) => (
          <div key={ev.id} className="flex items-center gap-3 py-3">
            <span className={`h-2 w-2 shrink-0 rounded-full ${ev.kind === "exp" ? "bg-primary" : "bg-muted-foreground/40"}`} />
            <span className="min-w-0 flex-1 truncate text-sm">{ev.text}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{new Date(ev.time).toLocaleDateString("zh-CN")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
