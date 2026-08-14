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
import { FlaskConical, Home, Network, HelpCircle, Settings, Search, Beaker, ListChecks, BookOpen, Layers, FileText, Mail, Package, User, LogOut, LogIn, ArrowRight } from "lucide-react";

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
          <div className="min-h-screen flex flex-col">
            <TopNav />
            <main className="flex-1"><Outlet /></main>
            <Footer />
          </div>
          <Toaster position="top-right" richColors />
          <AIAgent />
        </LabProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function TopNav() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <header className="no-print sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white">
            <FlaskConical size={20} />
          </span>
          <div className="leading-tight">
            <div className="text-base font-semibold">LabNote Agent</div>
            <div className="text-[10px] text-muted-foreground">科研数据治理 · 实验复现</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-0.5 text-sm">
          <NavItem to="/" icon={<Home size={14} />}>首页</NavItem>
          <NavItem to="/workbench" icon={<Beaker size={14} />}>工作台</NavItem>
          <NavItem to="/compare" icon={<Layers size={14} />}>治理对比</NavItem>
          <NavItem to="/checklist" icon={<ListChecks size={14} />}>Checklist</NavItem>
          <NavItem to="/graph" icon={<Network size={14} />}>关系图谱</NavItem>
          <NavItem to="/assets" icon={<Package size={14} />}>资产包</NavItem>
          <NavItem to="/paper" icon={<BookOpen size={14} />}>论文辅助</NavItem>
          <NavItem to="/help" icon={<HelpCircle size={14} />}>帮助</NavItem>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 transition"
          >
            <Search size={14} /> 全局搜索…
          </button>

          {/* 用户区域 */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-lg p-2 hover:bg-secondary transition" aria-label="用户菜单">
                  <User size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-muted-foreground truncate">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
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
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              <LogIn size={14} />
              登录
            </Link>
          )}

          <Link to="/settings" className="rounded-lg p-2 hover:bg-secondary transition" aria-label="设置">
            <Settings size={16} />
          </Link>
        </div>
      </div>
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </header>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "bg-primary-soft text-primary" }}
      activeOptions={{ exact: to === "/" }}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-foreground/80 hover:text-foreground hover:bg-secondary transition"
    >
      {icon}{children}
    </Link>
  );
}

function GlobalSearch({ onClose }: { onClose: () => void }) {
  const { experiments } = useLab();
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
