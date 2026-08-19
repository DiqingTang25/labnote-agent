/**
 * 根路由：注入 AuthProvider + LabProvider + 顶部导航
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { FlaskConical, Home, Network, HelpCircle, Settings, Search, Beaker, ListChecks, BookOpen, Layers, FileText, Mail, Package, User, LogOut, LogIn, ArrowRight, Users, Building2, X, KeyRound, Info, ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../components/ui/tooltip";
import { createTeam, joinTeamByCode, checkTeamSlugAvailable } from "../lib/api/teams.functions";
import { suggestInstitutions } from "../lib/institutions";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { LabProvider, useLab } from "../lib/labStore";
import { getString } from "../lib/property-utils";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { Toaster } from "sonner";
import { AIAgent } from "../components/AIAgent";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-muted-foreground">页面未找到</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          返回首页
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">页面加载失败</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          重试
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LabNote Agent – 科研数据治理与实验复现 AI Agent" },
      { name: "description", content: "让每一次实验都成为可复用的科研资产。多源数据采集、智能清洗、复现实验与 RAG 知识问答。" },
      { property: "og:title", content: "LabNote Agent – 科研数据治理与实验复现 AI Agent" },
      { name: "twitter:title", content: "LabNote Agent – 科研数据治理与实验复现 AI Agent" },
      { property: "og:description", content: "让每一次实验都成为可复用的科研资产。多源数据采集、智能清洗、复现实验与 RAG 知识问答。" },
      { name: "twitter:description", content: "让每一次实验都成为可复用的科研资产。多源数据采集、智能清洗、复现实验与 RAG 知识问答。" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bcdfd8ab-3aa2-4b72-ae09-6b808bd44534/id-preview-18a71f3d--e3c37d0c-76c3-4f7c-bc94-50e4081f0385.lovable.app-1780213454771.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bcdfd8ab-3aa2-4b72-ae09-6b808bd44534/id-preview-18a71f3d--e3c37d0c-76c3-4f7c-bc94-50e4081f0385.lovable.app-1780213454771.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LabProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <main className="flex-1"><Outlet /></main>
              <Footer />
            </div>
          </div>
          <WorkspaceGate />
          <Toaster position="top-right" richColors />
          <AIAgent />
        </LabProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/** 左侧导航栏（桌面端）— 多页面科研工具采用竖排左栏，避免顶栏拥挤 */
function Sidebar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { workspace, setWorkspace, myTeams } = useLab();
  const currentTeam = workspace.mode === "team" && workspace.teamId
    ? myTeams.find((t) => t.team.id === workspace.teamId)?.team
    : undefined;

  return (
    <>
      <aside className="no-print sticky top-0 z-30 hidden h-screen w-44 shrink-0 flex-col border-r border-border bg-background md:flex">
        {/* 品牌 */}
        <Link to="/" className="flex items-center gap-2 px-3 pb-4 pt-5">
          <span className="brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white">
            <FlaskConical size={16} />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">LabNote Agent</div>
            <div className="truncate text-[10px] text-muted-foreground">科研数据治理 · 实验复现</div>
          </div>
        </Link>

        {/* 工作空间切换器 */}
        {user && myTeams.length > 0 && (
          <div className="px-2.5 pb-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft/40 px-3 py-2 text-left text-xs font-medium text-primary hover:bg-primary-soft transition">
                  {workspace.mode === "team" ? <Building2 size={14} /> : <User size={14} />}
                  <span className="min-w-0 flex-1 truncate">
                    {workspace.mode === "team" ? currentTeam?.name ?? "团队" : "个人"}
                  </span>
                  <ChevronDown size={12} className="text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">切换工作空间</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setWorkspace({ mode: "personal", teamId: null })}>
                  <User size={14} className="mr-2" />
                  个人空间{workspace.mode === "personal" ? "（当前）" : ""}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {myTeams.map((t) => (
                  <DropdownMenuItem key={t.team.id} onClick={() => setWorkspace({ mode: "team", teamId: t.team.id })}>
                    <Building2 size={14} className="mr-2" />
                    {t.team.name}
                    {workspace.mode === "team" && workspace.teamId === t.team.id ? "（当前）" : ""}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/team" className="cursor-pointer">
                    <Settings size={14} className="mr-2" />
                    团队管理
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* 导航 */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-2">
          <NavItem to="/" icon={<Home size={15} />}>首页</NavItem>
          <NavItem to="/workbench" icon={<Beaker size={15} />}>工作台</NavItem>
          <NavItem to="/compare" icon={<Layers size={15} />}>治理对比</NavItem>
          <NavItem to="/checklist" icon={<ListChecks size={15} />}>实验复现</NavItem>
          <NavItem to="/graph" icon={<Network size={15} />}>关系图谱</NavItem>
          <NavItem to="/assets" icon={<Package size={15} />}>实验资产</NavItem>
          <NavItem to="/paper" icon={<BookOpen size={15} />}>论文辅助</NavItem>
          <NavItem to="/team" icon={<Users size={15} />}>团队</NavItem>
          <NavItem to="/help" icon={<HelpCircle size={15} />}>帮助</NavItem>
        </nav>

        {/* 搜索 + 用户 */}
        <div className="space-y-1 border-t border-border p-2.5">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/70 transition hover:bg-secondary hover:text-foreground"
          >
            <Search size={15} /> 全局搜索
          </button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/70 transition hover:bg-secondary hover:text-foreground" aria-label="用户菜单">
                  <User size={15} />
                  <span className="min-w-0 flex-1 truncate text-left">{user.email}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings size={14} className="mr-2" />
                    设置
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut size={14} className="mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/login"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm bg-primary text-primary-foreground transition hover:bg-primary/90"
            >
              <LogIn size={15} /> 登录
            </Link>
          )}
        </div>
      </aside>

      {/* 移动端顶栏（左栏隐藏时兜底） */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
        <Link to="/" className="flex items-center gap-2">
          <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white">
            <FlaskConical size={16} />
          </span>
          <span className="text-sm font-semibold">LabNote Agent</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-lg p-2 hover:bg-secondary transition" aria-label="用户菜单">
                  <User size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-muted-foreground truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings size={14} className="mr-2" />
                    设置
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut size={14} className="mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login" className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition">
              <LogIn size={14} />
              登录
            </Link>
          )}
        </div>
      </header>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "bg-primary-soft text-primary" }}
      activeOptions={{ exact: to === "/" }}
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-foreground/70 transition hover:bg-secondary hover:text-foreground"
    >
      {icon}{children}
    </Link>
  );
}

function GlobalSearch({ onClose }: { onClose: () => void }) {
  const { visibleExperiments: experiments } = useLab();
  const [q, setQ] = useState("");
  const results = experiments.filter((e) => {
    if (!q.trim()) return false;
    const hay = (e.name + getString(e.properties, "sample.id") + getString(e.properties, "device.name") + e.date + e.operator).toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div className="card-soft w-full max-w-xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Search size={16} className="text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索实验名称、样品编号、设备名称…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <kbd className="text-xs text-muted-foreground">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-auto mt-2">
          {q && results.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">无匹配结果</p>}
          {results.map((e) => (
            <Link
              key={e.id}
              to="/workbench"
              search={{ id: e.id }}
              onClick={onClose}
              className="block rounded-lg p-3 hover:bg-secondary"
            >
              <div className="text-sm font-medium">{e.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {e.date} · {e.operator} · {getString(e.properties, "sample.id") || "无样品编号"} · {getString(e.properties, "device.name") || "未指定设备"}
              </div>
            </Link>
          ))}
          {!q && <p className="text-xs text-muted-foreground p-4 text-center">输入关键词开始检索</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * 工作空间选择门 — 登录后首次使用必选：
 * 个人模式 / 创建课题组 / 输入邀请码加入
 * 选择结果写入 localStorage（labnote:ws_chosen），此后不再弹出
 */
/** 字段解释——悬停信息图标按需展示，不把说明文字塞进表单（GitHub/Supabase 模式） */
function FieldInfo({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground/60 transition hover:text-primary">
          <Info size={12} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-[11px] leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

/** 必填标记——悬停 * 显示填写指示（只解释，不举例子） */
function RequiredMark({ tip }: { tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help text-destructive">*</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-[11px] leading-relaxed">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

/** 创建团队分步（一屏一个字段，Slack / Supabase 模式）
 *  字段来源：教育部重点实验室规范（教技司[2015]155号）+ 国内外课题组主页惯例
 *  ——依托单位 / 负责人 / 研究方向 / 简介 / 成立信息 / 联系方式；
 *  唯一标识 slug 采用 GitHub 组织 login 机制（全局唯一，名称可重复） */
const CREATE_STEPS = [
  { key: "name", label: "团队名称", required: true, placeholder: "", tip: "团队的展示名称，将出现在团队主页与成员工作空间中；可与其他团队重名，创建后可在团队页修改" },
  { key: "slug", label: "唯一标识", required: true, placeholder: "小写字母、数字与连字符", tip: "团队的唯一身份标识（类似 GitHub 组织名），用于团队检索与后续功能扩展；创建后不可修改" },
  { key: "institution", label: "所属机构", required: false, placeholder: "", tip: "团队依托的大学或科研机构，用于团队主页对外展示" },
  { key: "department", label: "挂靠学院 / 院系", required: false, placeholder: "", tip: "团队挂靠的学院或院系，按重点实验室公开信息规范展示" },
  { key: "discipline", label: "学科", required: false, placeholder: "", tip: "团队所属学科门类，可输入或从常用学科中选择" },
  { key: "areas", label: "研究方向", required: false, placeholder: "", tip: "团队主要研究方向，将展示为团队主页标签，并用于团队知识问答的范围理解" },
  { key: "foundedYear", label: "成立年份", required: false, placeholder: "", tip: "团队成立的年份，按重点实验室概况惯例展示" },
  { key: "intro", label: "团队简介", required: false, placeholder: "", tip: "一段话介绍团队定位与研究目标，展示在团队主页" },
  { key: "contactEmail", label: "联系邮箱", required: false, placeholder: "", tip: "团队对外的联系邮箱，展示在团队主页" },
] as const;

/** 常用学科（覆盖干湿实验工科 / 生物 / 医学 / 物理 / 电子与芯片等，可自由输入） */
const DISCIPLINES = [
  "材料科学与工程", "化学", "化学工程", "生命科学", "生物学", "生物医学工程",
  "基础医学", "临床医学", "药学", "物理学", "光学工程", "电子科学与技术",
  "集成电路", "微电子与半导体", "计算机科学与技术", "人工智能", "机械工程",
  "能源科学与工程", "环境科学与工程", "农学", "食品科学与工程", "地球科学",
  "土木工程", "航空航天工程",
];

/** 根据团队名称自动建议唯一标识（ASCII 转写；纯中文时用 lab-随机后缀，GitHub 同款行为） */
function suggestSlug(name: string): string {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  if (ascii.length >= 3) return ascii;
  return "lab-" + Math.random().toString(36).slice(2, 8);
}

function WorkspaceGate() {
  const { user, session } = useAuth();
  const { setWorkspace, refreshTeams, gate, closeGate } = useLab();
  const [chosen, setChosen] = useState(true);
  const [view, setView] = useState<"pick" | "create" | "join">("pick");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    institution: "",
    department: "",
    discipline: "",
    areas: "",
    intro: "",
    foundedYear: "",
    contactEmail: "",
  });
  const [code, setCode] = useState("");
  const [step, setStep] = useState(1);
  const [areasInput, setAreasInput] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [instOpen, setInstOpen] = useState(false);

  useEffect(() => {
    try {
      setChosen(localStorage.getItem("labnote:ws_chosen") === "1");
    } catch {
      setChosen(false);
    }
  }, []);

  // 唯一标识实时校验（GitHub 组织 login 机制：slug 全局唯一，防抖 400ms）
  // 注意：必须在早退 return 之前（React hooks 规则）
  useEffect(() => {
    const slug = form.slug.trim().toLowerCase();
    if (!slug) {
      setSlugStatus("idle");
      return;
    }
    if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(slug)) {
      setSlugStatus("invalid");
      return;
    }
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      try {
        const r = await checkTeamSlugAvailable({ data: { slug, accessToken: session?.access_token ?? "" } });
        setSlugStatus(r.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.name]);

  // 从团队页等入口主动唤起时，同步外部指定的视图
  useEffect(() => {
    if (gate.open) setView(gate.view);
  }, [gate.open, gate.view]);

  if (!user || (chosen && !gate.open)) return null;

  const token = session?.access_token ?? "";

  const choose = (w: { mode: "personal" | "team"; teamId: string | null }) => {
    setWorkspace(w);
    setChosen(true); // 立即关闭弹窗（旧实现只写 localStorage，依赖刷新才会消失）
    closeGate();
    try {
      localStorage.setItem("labnote:ws_chosen", "1");
    } catch {
      // ignore
    }
  };

  const submitCreate = async () => {
    if (!form.name.trim()) {
      setErr("请填写团队名称");
      return;
    }
    if (form.slug.trim().toLowerCase() !== form.slug.trim()) {
      setErr("唯一标识需为小写字母、数字与连字符");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const team = await createTeam({
        data: {
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase(),
          institution: form.institution.trim(),
          department: form.department.trim(),
          discipline: form.discipline.trim(),
          researchAreas: form.areas
            .split(/[,，、;；]/)
            .map((s) => s.trim())
            .filter(Boolean),
          intro: form.intro.trim(),
          contactEmail: form.contactEmail.trim(),
          foundedYear: form.foundedYear ? Number(form.foundedYear) : null,
          accessToken: token,
        },
      });
      await refreshTeams();
      choose({ mode: "team", teamId: team.id });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "创建失败，请重试");
      setBusy(false);
    }
  };

  const submitJoin = async () => {
    if (!code.trim()) {
      setErr("请输入邀请码");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const team = await joinTeamByCode({
        data: { code: code.trim().toUpperCase(), accessToken: token },
      });
      await refreshTeams();
      choose({ mode: "team", teamId: team.id });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加入失败，请检查邀请码");
      setBusy(false);
    }
  };

  // 研究方向标签（chip input：回车/逗号添加，可删除，最多 10 个）
  const areaChips = form.areas
    .split(/[,，、;；]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
  const addArea = (raw: string) => {
    const parts = raw.split(/[,，、;；]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = Array.from(new Set([...areaChips, ...parts])).slice(0, 10);
    setForm({ ...form, areas: next.join(",") });
    setAreasInput("");
  };
  const removeArea = (a: string) => {
    setForm({ ...form, areas: areaChips.filter((x) => x !== a).join(",") });
  };

  // ── 字段级校验（非法输入 → 红色提示 + 禁止继续）──
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const stepError = (s: number): string | null => {
    switch (s) {
      case 1:
        return form.name.trim() ? null : "请填写团队名称";
      case 2:
        return null; // 唯一标识状态单独展示（可用/占用/格式）
      case 3: {
        const v = form.institution.trim();
        return v && v.length < 2 ? "至少 2 个字符" : null;
      }
      case 4: {
        const v = form.department.trim();
        return v && v.length < 2 ? "至少 2 个字符" : null;
      }
      case 5: {
        const v = form.discipline.trim();
        return v && v.length < 2 ? "至少 2 个字符" : null;
      }
      case 7: {
        const v = form.foundedYear.trim();
        if (!v) return null;
        const y = Number(v);
        return v.length < 4 || y < 1900 || y > 2100 ? "请输入 1900–2100 之间的四位年份" : null;
      }
      case 9: {
        const v = form.contactEmail.trim();
        return v && !EMAIL_RE.test(v) ? "邮箱格式不正确" : null;
      }
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 backdrop-blur-sm px-4">
      <div className="card-soft relative w-full max-w-2xl p-8">
        {chosen && (
          <button
            onClick={closeGate}
            aria-label="关闭"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
        {view === "pick" && (
          <>
            <div className="mb-5 text-center">
              <div className="text-lg font-semibold">选择工作空间</div>
              <div className="mt-1 text-xs text-muted-foreground">
                个人数据与团队数据分开管理，随时可在顶部切换
              </div>
            </div>
            <button
              onClick={() => choose({ mode: "personal", teamId: null })}
              className="group mb-3 flex w-full items-center gap-3 rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary-soft/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <User size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">个人模式</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  我的实验资产、解析与问答——只属于我自己
                </div>
              </div>
              <ArrowRight size={14} className="shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </button>
            <button
              onClick={() => { setStep(1); setView("create"); }}
              className="group mb-3 flex w-full items-center gap-3 rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary-soft/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Building2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">创建课题组 / 实验室</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  填写团队信息，创建后邀请成员加入，共享实验资产与知识
                </div>
              </div>
              <ArrowRight size={14} className="shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </button>
            <button
              onClick={() => setView("join")}
              className="group flex w-full items-center gap-3 rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-primary-soft/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Users size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">输入邀请码加入</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  已有课题组？输入管理员分享的邀请码即可加入
                </div>
              </div>
              <ArrowRight size={14} className="shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </button>
          </>
        )}

        {view === "create" && (
          <TooltipProvider>
            <div className="flex flex-col items-center py-10 text-center">
              {/* 进度点（一屏一个字段，Slack / Supabase 分步模式） */}
              <div className="mb-10 flex items-center justify-center gap-1.5">
                {CREATE_STEPS.map((s, i) => (
                  <span
                    key={s.key}
                    className={`h-1.5 rounded-full transition-all ${
                      i + 1 === step ? "w-5 bg-primary" : i + 1 < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-border"
                    }`}
                  />
                ))}
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Building2 size={24} />
              </div>
              <h2 className="mt-5 text-xl font-semibold">
                {step === 1 ? "为你的团队取个名字" : CREATE_STEPS[step - 1].label}
              </h2>
              <div className="mt-8 w-full max-w-md">
                <label className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {CREATE_STEPS[step - 1].label}
                  {CREATE_STEPS[step - 1].required ? (
                    <RequiredMark tip={CREATE_STEPS[step - 1].tip} />
                  ) : (
                    <FieldInfo text={CREATE_STEPS[step - 1].tip} />
                  )}
                </label>

                {/* ── 字段渲染：每屏一个 ── */}
                {step === 1 && (
                  <input
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value.slice(0, 60);
                      // 未手动改过标识时，自动跟随名称建议（GitHub 同款行为）
                      setForm({ ...form, name, ...(slugTouched ? {} : { slug: suggestSlug(name) }) });
                    }}
                    placeholder={CREATE_STEPS[0].placeholder}
                    autoFocus
                    className="h-12 w-full rounded-xl border border-border bg-background px-4 text-center text-base outline-none transition focus:border-primary/60"
                  />
                )}
                {step === 2 && (
                  <>
                    <input
                      value={form.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setForm({ ...form, slug: e.target.value.slice(0, 30) });
                      }}
                      placeholder={CREATE_STEPS[1].placeholder}
                      autoFocus
                      spellCheck={false}
                      className={`h-12 w-full rounded-xl border bg-background px-4 text-center font-mono text-base outline-none transition focus:border-primary/60 ${
                        slugStatus === "taken" || slugStatus === "invalid" ? "border-destructive/60" : "border-border"
                      }`}
                    />
                    {slugStatus === "taken" && (
                      <p className="mt-2 text-xs text-destructive">该标识已被使用，请换一个</p>
                    )}
                    {slugStatus === "invalid" && (
                      <p className="mt-2 text-xs text-destructive">仅支持小写字母、数字与连字符（3-30 位）</p>
                    )}
                    {slugStatus === "available" && (
                      <p className="mt-2 text-xs text-success">标识可用</p>
                    )}
                  </>
                )}
                {step === 3 && (
                  <div className="relative w-full">
                    <input
                      value={form.institution}
                      onChange={(e) => setForm({ ...form, institution: e.target.value.slice(0, 120) })}
                      onFocus={() => setInstOpen(true)}
                      onBlur={() => setTimeout(() => setInstOpen(false), 150)}
                      placeholder={CREATE_STEPS[2].placeholder}
                      autoFocus
                      className={`h-12 w-full rounded-xl border bg-background px-4 text-center text-base outline-none transition focus:border-primary/60 ${
                        stepError(3) ? "border-destructive/60" : "border-border"
                      }`}
                    />
                    {instOpen && suggestInstitutions(form.institution, 8).length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-border bg-popover text-left shadow-lg">
                        {suggestInstitutions(form.institution, 8).map((name) => (
                          <button
                            key={name}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setForm({ ...form, institution: name });
                              setInstOpen(false);
                            }}
                            className="block w-full truncate px-3 py-2 text-left text-sm transition hover:bg-secondary"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {step === 4 && (
                  <input
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value.slice(0, 120) })}
                    placeholder={CREATE_STEPS[3].placeholder}
                    autoFocus
                    className="h-12 w-full rounded-xl border border-border bg-background px-4 text-center text-base outline-none transition focus:border-primary/60"
                  />
                )}
                {step === 5 && (
                  <>
                    <input
                      value={form.discipline}
                      onChange={(e) => setForm({ ...form, discipline: e.target.value.slice(0, 120) })}
                      placeholder={CREATE_STEPS[4].placeholder}
                      autoFocus
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 text-center text-base outline-none transition focus:border-primary/60"
                    />
                    <div className="mt-4 flex max-h-32 flex-wrap justify-center gap-1.5 overflow-y-auto pr-1">
                      {DISCIPLINES.filter((d) => !form.discipline.trim() || d.includes(form.discipline.trim())).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setForm({ ...form, discipline: d })}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            form.discipline === d
                              ? "border-primary/50 bg-primary-soft text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {step === 6 && (
                  <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 transition focus-within:border-primary/60">
                    {areaChips.map((a) => (
                      <span key={a} className="flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs text-primary">
                        {a}
                        <button type="button" onClick={() => removeArea(a)} aria-label={`删除 ${a}`} className="hover:text-primary/70">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                    <input
                      value={areasInput}
                      onChange={(e) => setAreasInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "," || e.key === "，") {
                          e.preventDefault();
                          addArea(areasInput);
                        }
                      }}
                      onBlur={() => areasInput.trim() && addArea(areasInput)}
                      placeholder={areaChips.length === 0 ? CREATE_STEPS[5].placeholder : ""}
                      autoFocus
                      className="min-w-[160px] flex-1 bg-transparent py-1 text-center text-sm outline-none"
                    />
                  </div>
                )}
                {step === 7 && (
                  <input
                    value={form.foundedYear}
                    onChange={(e) => setForm({ ...form, foundedYear: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                    placeholder={CREATE_STEPS[6].placeholder}
                    autoFocus
                    inputMode="numeric"
                    className={`h-12 w-full rounded-xl border bg-background px-4 text-center text-base outline-none transition focus:border-primary/60 ${
                      stepError(7) ? "border-destructive/60" : "border-border"
                    }`}
                  />
                )}
                {step === 8 && (
                  <textarea
                    value={form.intro}
                    onChange={(e) => setForm({ ...form, intro: e.target.value.slice(0, 2000) })}
                    placeholder={CREATE_STEPS[7].placeholder}
                    autoFocus
                    rows={4}
                    className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-primary/60"
                  />
                )}
                {step === 9 && (
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value.slice(0, 120) })}
                    placeholder={CREATE_STEPS[8].placeholder}
                    autoFocus
                    className={`h-12 w-full rounded-xl border bg-background px-4 text-center text-base outline-none transition focus:border-primary/60 ${
                      stepError(9) ? "border-destructive/60" : "border-border"
                    }`}
                  />
                )}

                {(err || stepError(step)) && (
                  <p className="mt-2 text-xs text-destructive">{err || stepError(step)}</p>
                )}
              </div>

              <div className="mt-10 flex items-center gap-3">
                {step === 1 && (
                  <button
                    onClick={() => { setView("pick"); setErr(""); setStep(1); setSlugStatus("idle"); }}
                    className="rounded-lg border border-border px-6 py-2.5 text-sm transition hover:bg-secondary"
                  >
                    返回
                  </button>
                )}
                {step > 1 && (
                  <button
                    onClick={() => { setErr(""); setStep(step - 1); }}
                    className="rounded-lg border border-border px-6 py-2.5 text-sm transition hover:bg-secondary"
                  >
                    上一步
                  </button>
                )}
                {step > 1 && step < 9 && (
                  <button
                    onClick={submitCreate}
                    disabled={busy}
                    className="rounded-lg border border-border px-4 py-2.5 text-xs text-muted-foreground transition hover:bg-secondary disabled:opacity-50"
                  >
                    {busy ? "创建中…" : "跳过剩余步骤"}
                  </button>
                )}
                {step < 9 && (
                  <button
                    onClick={() => { setErr(""); setStep(step + 1); }}
                    disabled={
                      (step === 2 && slugStatus !== "available") || stepError(step) !== null
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    下一步
                    <ArrowRight size={14} />
                  </button>
                )}
                {step === 9 && (
                  <button
                    onClick={submitCreate}
                    disabled={busy || stepError(9) !== null}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? "创建中…" : "创建团队"}
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </TooltipProvider>
        )}
        {view === "join" && (
          <>
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <KeyRound size={20} />
              </div>
              <div className="text-lg font-semibold">输入邀请码加入</div>
              <div className="mt-1 text-xs text-muted-foreground">
                邀请码由团队管理员在「团队管理 → 成员」中生成，7 天内有效
              </div>
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.slice(0, 8).toUpperCase())}
              placeholder="邀请码（如：AB3K9XQ2）"
              autoFocus
              className="w-full rounded-lg border border-border bg-background px-3 py-3 text-center font-mono text-base tracking-[0.3em] uppercase outline-none transition focus:border-primary/60"
            />
            {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => { setView("pick"); setErr(""); }}
                className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm transition hover:bg-secondary"
              >
                返回
              </button>
              <button
                onClick={submitJoin}
                disabled={busy || code.trim().length === 0}
                className="flex-[2] rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "加入中…" : "加入团队"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="no-print relative mt-12 overflow-hidden border-t border-border/30">
      {/* 顶部极淡过渡：从主页背景自然融入，不突兀 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-16 bg-gradient-to-b from-background via-background/70 to-transparent" />

      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 py-8 sm:flex-row sm:justify-between">
        {/* 品牌信息 */}
        <div className="flex items-center gap-2">
          <span className="brand-gradient flex h-6 w-6 items-center justify-center rounded-md text-white">
            <FlaskConical size={12} />
          </span>
          <div className="leading-tight">
            <div className="text-xs font-semibold">LabNote Agent</div>
            <div className="text-[10px] text-muted-foreground">
              © 2026 · 让每一次实验都成为可复用的科研资产
            </div>
          </div>
        </div>

        {/* 小按钮：联系我们 */}
        <Link
          to="/contact"
          className="group inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft/40 px-4 py-1.5 text-xs font-medium text-primary transition-all hover:border-primary hover:bg-primary-soft hover:shadow-sm hover:shadow-primary/15"
        >
          <Mail size={12} />
          联系我们
          <ArrowRight
            size={12}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </footer>
  );
}
