/**
 * 帮助文档：腾讯/飞书风格专业教程
 *
 * 设计参照：腾讯云文档 / 飞书帮助中心 / Stripe Docs
 * 结构：核心概念速查 + 左侧分组导航 + 分步骤操作指南 + 截图插槽 + 反馈闭环
 * 语言：专业、简洁、动作导向，隐藏底层技术细节
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, BookOpen, Upload, Brain, FileText, Network,
  PenLine, Package, MessageSquare, HelpCircle, ChevronRight,
  ChevronDown, CheckCircle2, AlertTriangle, ClipboardList,
  ArrowRight, Zap, Lightbulb, FileSearch,
  Lock, Download, ShieldCheck, Database, MousePointer,
  GitBranch, Cpu, LogIn, Settings, FileJson, Code2, Copy,
  ThumbsUp, ThumbsDown, Send, Image as ImageIcon, Camera,
  Users, Building2,
} from "lucide-react";
import { BlurFade } from "../components/magicui/blur-fade";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "帮助中心 – LabNote Agent" },
      { name: "description", content: "LabNote Agent 官方帮助文档：工作台、实验复现、关系图谱、学术写作全功能操作指南。" },
    ],
  }),
  component: HelpPage,
});

// ═══════════════════════════════════════════════════
// 样式常量
// ═══════════════════════════════════════════════════

const GLASS_CARD =
  "relative overflow-hidden rounded-2xl border border-border/50 bg-card/70 backdrop-blur-md " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_24px_-8px_oklch(0.5_0.1_250/0.08)]";

function NoiseTexture() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 opacity-[0.02] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════
// 截图图库注册表（14 张，存于 public/help/）
// ═══════════════════════════════════════════════════

type FigSpec = {
  fig: string;          // 编号 01-14
  title: string;        // 图题
  src: string;          // 文件路径（public/help/ 下）
  hint: string;         // 截图内容要求（未截图时显示）
  caption: string;      // 图注
};

const FIGURES: Record<string, FigSpec> = {
  "wb-overview": {
    fig: "01", title: "工作台总览", src: "/help/fig-01-workbench-overview.png",
    hint: "三栏全貌：左「数据输入/历史实验」、中「实验卡片编辑」、右「置信度评估/复现清单」同屏可见",
    caption: "工作台三栏布局：左侧数据输入，中间卡片编辑，右侧 AI 辅助",
  },
  "wb-parsing": {
    fig: "02", title: "上传解析", src: "/help/fig-02-upload-parsing.png",
    hint: "数据输入区显示上传中的文件列表 + 四阶段解析进度条（读取/AI 识别/去重合并/完成）",
    caption: "上传后解析进度条与逐文件进度列表",
  },
  "wb-card": {
    fig: "03", title: "卡片编辑", src: "/help/fig-03-card-editor.png",
    hint: "一张填好的动态实验卡片：字段组（实验条件/试剂材料/参数）完整可见，含底部「添加自定义字段」",
    caption: "动态实验卡片：字段随实验类型自适应，支持嵌套结构",
  },
  "wb-confidence": {
    fig: "04", title: "置信度", src: "/help/fig-04-confidence.png",
    hint: "右栏置信度面板：绿/黄/红三段分布条 + 展开的逐字段置信度列表（含百分比）",
    caption: "置信度分布条与逐字段溯源列表",
  },
  "wb-rag": {
    fig: "05", title: "知识问答", src: "/help/fig-05-rag-qa.png",
    hint: "一条完整问答：AI 回答下方带「来源卡片」名称与「引用位置」字段路径",
    caption: "知识问答：回答附带来源卡片与引用位置，支持一键跳转",
  },
  "rep-input": {
    fig: "06", title: "复现-输入", src: "/help/fig-06-repro-input.png",
    hint: "论文输入区：预设论文列表（SrTiO₃ 等）+ DOI 显示 + 自定义输入入口",
    caption: "论文输入：预设论文与自定义粘贴两种方式",
  },
  "rep-params": {
    fig: "07", title: "复现-参数", src: "/help/fig-07-repro-params.png",
    hint: "参数列表：四级确定性色标（绿/蓝/黄/红徽标：论文明确/论文隐含/AI 推断/未知）同屏可见",
    caption: "参数列表：四级确定性色标同屏可见，拒绝 AI 盲目猜测",
  },
  "rep-gaps": {
    fig: "08", title: "复现-缺口", src: "/help/fig-08-repro-gaps.png",
    hint: "缺口列表：按关键程度排序，每条含 AI 建议值 + 采纳按钮 + 手动输入框",
    caption: "缺口列表：按优先级排序，附带外部数据库参考链接",
  },
  "rep-protocol": {
    fig: "09", title: "复现-协议", src: "/help/fig-09-repro-protocol.png",
    hint: "协议页：安全防护章节在顶部，下方为分阶段步骤与勾选框",
    caption: "复现协议：含安全防护章节与逐项勾选框",
  },
  "graph-overview": {
    fig: "10", title: "图谱全貌", src: "/help/fig-10-graph-overview.png",
    hint: "关系图谱全貌：节点七色图例同屏可见（实验/样品/设备/操作人/试剂/方法/项目）",
    caption: "关系图谱：七色节点与实体去重机制",
  },
  "graph-nhop": {
    fig: "11", title: "图谱-N-hop", src: "/help/fig-11-graph-nhop.png",
    hint: "点击某个节点后开启邻域过滤（本地图）状态：仅显示该节点 N 跳内关联",
    caption: "N-hop 邻域过滤：聚焦核心节点的直接关联",
  },
  "paper-draft": {
    fig: "12", title: "论文起草", src: "/help/fig-12-paper-draft.png",
    hint: "左列实验卡片勾选 + 右侧 Methods 草稿编辑器同屏可见",
    caption: "论文起草：左侧选择实验卡片，右侧实时预览 Methods 初稿",
  },
  "assets-grid": {
    fig: "13", title: "资产包", src: "/help/fig-13-assets-grid.png",
    hint: "资产页网格视图：实验卡片网格 + 顶部统计 + 导出 Markdown/JSON 按钮",
    caption: "资产包网格视图：按学科筛选与全局统计",
  },
  "sanitize-dialog": {
    fig: "14", title: "脱敏弹窗", src: "/help/fig-14-sanitize-dialog.png",
    hint: "脱敏确认弹窗：构造一条含手机号的上传内容触发，弹窗列出匹配项与「脱敏后发送/原样发送/取消」",
    caption: "脱敏确认弹窗：自动拦截敏感信息并提示处理",
  },
};

// ═══════════════════════════════════════════════════
// 侧边栏分组配置
// ═══════════════════════════════════════════════════

type NavSection = { title: string; items: NavItem[] };
type NavItem = { id: string; label: string; icon: React.ComponentType<{ className?: string; size?: number }> };

const NAV_SECTIONS: NavSection[] = [
  {
    title: "快速入门",
    items: [
      { id: "register", label: "注册与登录", icon: LogIn },
      { id: "quickstart", label: "3 分钟快速上手", icon: Zap },
      { id: "fileformats", label: "支持的文件格式", icon: FileSearch },
    ],
  },
  {
    title: "工作台",
    items: [
      { id: "wb-upload", label: "文件上传与解析", icon: Upload },
      { id: "wb-card", label: "实验卡片编辑", icon: FileText },
      { id: "wb-confidence", label: "置信度校准", icon: Brain },
      { id: "wb-assistant", label: "复现清单", icon: ClipboardList },
      { id: "wb-rag", label: "知识问答", icon: MessageSquare },
    ],
  },
  {
    title: "实验复现",
    items: [
      { id: "rep-input", label: "论文 Methods 输入", icon: BookOpen },
      { id: "rep-params", label: "参数与确定性分级", icon: Cpu },
      { id: "rep-gaps", label: "缺口检测与补全", icon: AlertTriangle },
      { id: "rep-protocol", label: "复现协议导出", icon: Download },
    ],
  },
  {
    title: "关系图谱",
    items: [
      { id: "graph-intro", label: "节点与关联类型", icon: Network },
      { id: "graph-interact", label: "交互与过滤", icon: MousePointer },
      { id: "graph-export", label: "搜索与 SVG 导出", icon: Download },
    ],
  },
  {
    title: "团队协作",
    items: [
      { id: "team-overview", label: "团队协作概览", icon: Users },
      { id: "team-create", label: "创建与加入团队", icon: Building2 },
      { id: "team-members", label: "成员与权限", icon: ShieldCheck },
      { id: "team-templates", label: "团队模板库", icon: Settings },
      { id: "team-assets", label: "团队资产与问答", icon: MessageSquare },
    ],
  },
  {
    title: "学术写作",
    items: [
      { id: "paper-generate", label: "论文起草", icon: PenLine },
      { id: "paper-export", label: "导出与合规声明", icon: ShieldCheck },
    ],
  },
  {
    title: "实验资产",
    items: [
      { id: "assets-manage", label: "资产卡片管理", icon: Package },
      { id: "assets-export", label: "批量导出", icon: FileJson },
    ],
  },
  {
    title: "高级功能",
    items: [
      { id: "adv-sanitize", label: "数据脱敏与安全", icon: Lock },
      { id: "adv-mcp", label: "MCP 开放接口", icon: Code2 },
      { id: "adv-templates", label: "动态实验模板", icon: Settings },
      { id: "adv-sources", label: "外部数据库接入", icon: Database },
    ],
  },
  {
    title: "常见问题",
    items: [
      { id: "faq-general", label: "通用 FAQ", icon: HelpCircle },
    ],
  },
];

// ═══════════════════════════════════════════════════
// 核心概念数据 (用于顶部引导区)
// ═══════════════════════════════════════════════════
const CORE_CONCEPTS = [
  { term: "动态实验卡片", desc: "告别固定表格。系统根据实验类型（如材料合成、细胞培养）自动匹配 27 种专业模板，卡片字段随需而变。", target: "adv-templates" },
  { term: "复现缺口", desc: "论文中未写明但复现实验必需的参数。系统会自动标记缺口，并交叉查询公共数据库提供建议值。", target: "rep-gaps" },
  { term: "置信度校准", desc: "AI 不对你撒谎。每个提取的字段都会附带 0-100 的置信度评分，明确区分“原文提取”与“AI 推断”。", target: "wb-confidence" },
];

// ═══════════════════════════════════════════════════
// 主页面
// ═══════════════════════════════════════════════════

function HelpPage() {
  const [activeId, setActiveId] = useState("register");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(NAV_SECTIONS.map((s) => s.title))
  );

  useEffect(() => {
    const handleScroll = () => {
      const allItems = NAV_SECTIONS.flatMap((s) => s.items);
      for (let i = allItems.length - 1; i >= 0; i--) {
        const el = document.getElementById(`section-${allItems[i].id}`);
        if (el && el.getBoundingClientRect().top <= 160) {
          setActiveId(allItems[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const filteredSections = searchQuery
    ? NAV_SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase())),
    })).filter((s) => s.items.length > 0)
    : NAV_SECTIONS;

  const activeItem = NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.id === activeId);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── 二级导航列（Supabase 文档式：真实全高列 + 树形嵌套）── */}
      <aside className="no-print sticky top-0 z-20 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-card/40 lg:flex">
        {/* 列头 */}
        <div className="border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <BookOpen size={14} />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">帮助中心</div>
              <div className="text-[10px] text-muted-foreground">LabNote Agent 操作指南</div>
            </div>
          </div>
          <div className="relative mt-3">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索指南"
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-xs outline-none transition focus:border-primary/50"
            />
          </div>
        </div>

        {/* 树形导航：组标题 + 缩进 + 左侧树线 */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {filteredSections.map((section) => (
            <div key={section.title} className="mb-0.5">
              <button
                onClick={() => toggleSection(section.title)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground transition hover:text-foreground"
              >
                <span>{section.title}</span>
                <ChevronDown
                  size={11}
                  className={`transition-transform ${expandedSections.has(section.title) ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {expandedSections.has(section.title) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-1.5 ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
                      {section.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => scrollTo(item.id)}
                          className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition ${
                            activeId === item.id
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                          }`}
                        >
                          <item.icon size={12} className="shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>
      </aside>

      {/* ── 内容列：页头（面包屑）+ 阅读宽度正文 ── */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border/60 bg-background/80 px-6 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">帮助</span>
            <ChevronRight size={12} className="text-muted-foreground" />
            <span className="truncate font-medium">{activeItem?.label ?? "LabNote Agent 操作指南"}</span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link to="/" className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs transition hover:bg-secondary">
              返回首页 <ArrowRight size={12} />
            </Link>
          </div>
        </header>

        {/* 主内容区（阅读宽度） */}
        <main className="mx-auto max-w-3xl space-y-10 px-6 py-10">
          <WelcomeHero />

          <RegisterSection />
          <QuickStartSection />
          <FileFormatsSection />

          <Divider label="工作台" />
          <WbUploadSection />
          <WbCardSection />
          <WbConfidenceSection />
          <WbAssistantSection />
          <WbRagSection />

          <Divider label="实验复现" />
          <RepInputSection />
          <RepParamsSection />
          <RepGapsSection />
          <RepProtocolSection />

          <Divider label="关系图谱" />
          <GraphIntroSection />
          <GraphInteractSection />
          <GraphExportSection />

          <Divider label="团队协作" />
          <TeamOverviewSection />
          <TeamCreateSection />
          <TeamMembersSection />
          <TeamTemplatesSection />
          <TeamAssetsSection />

          <Divider label="学术写作" />
          <PaperGenerateSection />
          <PaperExportSection />

          <Divider label="实验资产" />
          <AssetsManageSection />
          <AssetsExportSection />

          <Divider label="高级功能" />
          <AdvSanitizeSection />
          <AdvMcpSection />
          <AdvTemplatesSection />
          <AdvSourcesSection />

          <Divider label="常见问题" />
          <FaqGeneralSection />

          <PageFeedback />
        </main>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// 顶部引导区 (Welcome Hero)
// ═══════════════════════════════════════════════════
function WelcomeHero() {
  return (
    <section className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <div className={`${GLASS_CARD} p-8 md:p-10`}>
          <NoiseTexture />
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              欢迎来到 LabNote Agent 帮助中心
            </h2>
            <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
              在这里，你将学会如何将零散的实验记录（手写笔记、仪器截图、表格数据）转化为结构化、可追溯的科研资产，并一键起草论文方法章节。
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {CORE_CONCEPTS.map((c) => (
                <a
                  key={c.term}
                  href={`#section-${c.target}`}
                  className="group block rounded-xl border border-border/40 bg-card/30 p-4 transition-all hover:border-primary/40 hover:bg-card/60"
                >
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground group-hover:text-primary">
                    <Lightbulb size={14} />
                    {c.term}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                    {c.desc}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-medium text-primary/70 group-hover:text-primary">
                    了解详情 <ChevronRight size={10} />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// 通用组件
// ═══════════════════════════════════════════════════

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 pt-6">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      <span className="text-[11px] font-semibold text-muted-foreground tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
    </div>
  );
}

function SectionHeader({
  tag,
  title,
  desc,
}: {
  tag: string;
  title: string;
  desc: string;
}) {
  return (
    <div>
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
        {tag}
      </div>
      <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {num}
        </div>
      </div>
      <div className="flex-1 pb-6 border-l border-border/40 pl-4 -ml-[13px]">
        <div className="text-[13px] font-semibold mb-1.5">{title}</div>
        <div className="text-[12px] text-muted-foreground leading-relaxed space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
}

function TipsCard({
  type = "info",
  title,
  children,
}: {
  type?: "info" | "warn" | "success";
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: {
      border: "border-primary/20",
      bg: "bg-primary-soft/20",
      iconColor: "text-primary",
      icon: Lightbulb,
    },
    warn: {
      border: "border-[color:var(--color-warning)]/30",
      bg: "bg-[color:var(--color-warning)]/5",
      iconColor: "text-[color:var(--color-warning)]",
      icon: AlertTriangle,
    },
    success: {
      border: "border-[color:var(--color-success)]/30",
      bg: "bg-[color:var(--color-success)]/5",
      iconColor: "text-[color:var(--color-success)]",
      icon: CheckCircle2,
    },
  } as const;
  const s = styles[type];
  const Icon = s.icon;
  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-3.5`}>
      <div className="flex items-start gap-2.5">
        <Icon size={15} className={`mt-0.5 shrink-0 ${s.iconColor}`} />
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-foreground">{title}</div>
          <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      <span className="text-[11px] leading-relaxed">{desc}</span>
    </div>
  );
}

// 术语提示组件
function Term({ word, desc }: { word: string; desc: string }) {
  return (
    <span className="relative inline-block group cursor-help border-b border-dashed border-primary/40 text-foreground font-medium">
      {word}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-popover p-3 text-[11px] text-popover-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 border border-border">
        <span className="font-semibold text-primary block mb-1">{word}</span>
        {desc}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
      </span>
    </span>
  );
}

// ═══════════════════════════════════════════════════
// 截图插槽组件（升级版：编号图框 + 尺寸规范 + 内容要求）
// ═══════════════════════════════════════════════════

/**
 * 截图规范：
 * - 视口 1440×900（或 1600×1000），浏览器缩放 100%
 * - PNG 格式，存至 public/help/ 目录（文件名见 FIGURES 注册表）
 * - 展示容器为 16:10 比例，object-contain 适配
 */
function DocFigure({ figKey }: { figKey: keyof typeof FIGURES }) {
  const spec = FIGURES[figKey];
  const [isOpen, setIsOpen] = useState(false);
  // 测量图片原生尺寸：框贴合图片——窄图框缩到原生大小，全宽图占满列宽
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  // 图框宽高：图片未加载前用 16:10 占位；加载后按原生比例，窄图（<列宽）以原生宽度居中
  const boxStyle: React.CSSProperties = imgSize
    ? {
        width: imgSize.w < 640 ? `${imgSize.w}px` : "100%",
        maxWidth: "100%",
        aspectRatio: `${imgSize.w} / ${imgSize.h}`,
      }
    : { width: "100%", aspectRatio: "16 / 10" };

  return (
    <>
      <figure className="my-5">
        {/* 图题行：编号 + 标题 */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 min-w-6 items-center justify-center rounded-md bg-primary px-1 font-mono text-[10px] font-bold text-primary-foreground shadow-sm shadow-primary/20">
              {spec.fig}
            </span>
            <span className="text-[12px] font-semibold text-foreground">{spec.title}</span>
          </div>
        </div>

        {/* 图框（边框本身贴合图片原生尺寸：窄图框缩到原图大小居中） */}
        <div
          className={`group relative cursor-zoom-in overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-background to-card shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_20px_-10px_oklch(0.5_0.1_250/0.12)] transition-all duration-300 hover:border-primary/40 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_32px_-10px_oklch(0.5_0.1_250/0.25)] ${imgSize && imgSize.w < 640 ? "mx-auto" : ""}`}
          style={boxStyle}
          onClick={() => spec.src && setIsOpen(true)}
        >
          <div className="h-full w-full">
            {spec.src ? (
              <img
                src={spec.src}
                alt={spec.title}
                className="h-full w-full object-contain"
                loading="eager"
                ref={(el) => {
                  // 缓存图片在水合前可能已完成加载（onLoad 不触发），用 complete 兜底
                  // 尺寸未变化时返回原 state，避免内联 ref 每渲染都触发更新导致死循环
                  if (el && el.complete && el.naturalWidth > 0) {
                    setImgSize((prev) =>
                      prev && prev.w === el.naturalWidth && prev.h === el.naturalHeight
                        ? prev
                        : { w: el.naturalWidth, h: el.naturalHeight },
                    );
                  }
                }}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  if (el.naturalWidth > 0) {
                    setImgSize((prev) =>
                      prev && prev.w === el.naturalWidth && prev.h === el.naturalHeight
                        ? prev
                        : { w: el.naturalWidth, h: el.naturalHeight },
                    );
                  }
                }}
              />
            ) : (
              /* 未截图状态：网格底 + 拍摄指引 */
              <div className="relative flex h-full w-full flex-col items-center justify-center gap-2.5 p-6">
                <div
                  className="pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    backgroundImage: `linear-gradient(rgba(100,116,139,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.06) 1px, transparent 1px)`,
                    backgroundSize: "24px 24px",
                  }}
                />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 shadow-inner">
                  <Camera size={18} className="text-primary/60" />
                </div>
                <span className="relative max-w-md text-center text-[11px] font-medium leading-relaxed text-muted-foreground">
                  {spec.hint}
                </span>
                <span className="relative rounded-md bg-secondary/50 px-2 py-0.5 font-mono text-[9px] text-muted-foreground/70">
                  截图后保存至 public/help/{spec.src.replace("/help/", "")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 图注 */}
        <figcaption className="mt-2 text-center text-[11px] italic text-muted-foreground/80">
          {spec.caption}
        </figcaption>
      </figure>

      {/* 灯箱 */}
      <AnimatePresence>
        {isOpen && spec.src && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-8"
            onClick={() => setIsOpen(false)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={spec.src}
              alt={spec.title}
              className="max-w-full max-h-full rounded-lg shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// 页尾反馈组件
function PageFeedback() {
  const [status, setStatus] = useState<"idle" | "positive" | "negative" | "submitted">("idle");
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    console.log("Feedback:", status, comment);
    setStatus("submitted");
  };

  return (
    <div className="mt-16 border-t border-border/40 pt-8 text-center">
      {status === "submitted" ? (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <CheckCircle2 size={24} className="text-[color:var(--color-success)]" />
          <p className="text-sm font-medium">感谢你的反馈！</p>
          <p className="text-xs">你的意见将帮助我们改进文档。</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">本页内容是否对你有帮助？</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setStatus(status === "positive" ? "idle" : "positive")}
              className={`p-3 rounded-full border transition-all ${status === "positive" ? "bg-[color:var(--color-success)]/10 border-[color:var(--color-success)] text-[color:var(--color-success)]" : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"}`}
            >
              <ThumbsUp size={18} />
            </button>
            <button
              onClick={() => setStatus(status === "negative" ? "idle" : "negative")}
              className={`p-3 rounded-full border transition-all ${status === "negative" ? "bg-destructive/10 border-destructive text-destructive" : "border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive"}`}
            >
              <ThumbsDown size={18} />
            </button>
          </div>
          {(status === "positive" || status === "negative") && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="max-w-md mx-auto space-y-3"
            >
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={status === "positive" ? "哪部分内容最有用？" : "我们哪里可以做得更好？"}
                className="w-full h-24 rounded-lg border border-border bg-card/40 p-3 text-sm outline-none focus:border-primary/50 resize-none"
              />
              <button
                onClick={handleSubmit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                提交反馈 <Send size={12} />
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// 快速入门
// ═══════════════════════════════════════════════════

function RegisterSection() {
  return (
    <section id="section-register" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="快速入门"
          title="注册与登录"
          desc="使用邮箱注册 LabNote Agent 账号，开启你的科研数据治理之旅。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <Step num={1} title="访问系统">
              <p>打开浏览器访问 LabNote Agent 官网。</p>
            </Step>
            <Step num={2} title="注册账号">
              <p>点击右上角「注册」按钮，填写邮箱、设置密码（至少 8 位，含字母和数字）并提交。</p>
            </Step>
            <Step num={3} title="登录与数据隔离">
              <p>登录后自动进入工作台。你的所有实验数据均在云端加密存储，并严格与其他用户隔离，保障科研隐私。</p>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function QuickStartSection() {
  return (
    <section id="section-quickstart" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="快速入门"
          title="3 分钟快速上手"
          desc="按以下 3 步即可完成首次实验数据结构化。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <Step num={1} title="上传实验记录">
              <p>进入工作台，在左侧「数据输入」区拖拽或点击上传 PDF、Word、Excel、图片等实验文件。</p>
              <p className="text-[11px] text-muted-foreground/70">
                建议：一次性上传相关的所有文件（Methods 段落、实验笔记、试剂表、结果图等），系统会自动交叉比对去重。
              </p>
            </Step>
            <Step num={2} title="等待 AI 解析">
              <p>上传后系统启动自动解析流程：读取文件内容、智能识别文本、提取关键字段、去重合并生成实验卡片。解析完成后会弹出提示，同时自动在左侧生成实验卡片。</p>
            </Step>
            <Step num={3} title="复核与使用">
              <p>点击卡片进入编辑视图。使用右侧「<Term word="置信度" desc="AI 对每个字段提取准确性的自评得分，帮助你快速定位需要人工核对的字段。" />评估」面板快速筛查低置信度字段。完成后可导出复现包，或通过关系图谱查看与其他实验的关联。</p>
            </Step>

            <div className="mt-3 flex gap-2 flex-wrap">
              <Link to="/workbench" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[12px] font-medium text-primary-foreground hover:bg-primary/90">
                <Upload size={12} /> 进入工作台
              </Link>
              <Link to="/checklist" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3.5 py-1.5 text-[12px] font-medium hover:border-primary/40">
                <GitBranch size={12} /> 体验实验复现
              </Link>
            </div>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function FileFormatsSection() {
  const formats = [
    { ext: "PDF", desc: "论文 Methods、实验报告扫描件", type: "文档" },
    { ext: "DOCX", desc: "Word 实验记录、纸质笔记扫描转 Word", type: "文档" },
    { ext: "XLSX / CSV", desc: "试剂表、参数表格、仪器导出数据", type: "表格" },
    { ext: "PNG / JPG", desc: "实验结果图、手写笔记照片、膜成像", type: "图像" },
    { ext: "TXT / MD", desc: "纯文本笔记、Markdown 实验方案", type: "文本" },
    { ext: "LOG / JSON / XML", desc: "仪器日志、导出数据、结构化参数", type: "数据" },
  ];

  return (
    <section id="section-fileformats" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="快速入门"
          title="支持的文件格式"
          desc="系统支持多种常见实验记录格式，单文件最大 50MB。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <div className="grid gap-2 md:grid-cols-2">
              {formats.map((f) => (
                <div key={f.ext} className="flex items-start gap-3 rounded-lg border border-border/40 bg-card/30 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                    {f.ext.split(" ")[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-semibold">{f.ext}</span>
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">{f.type}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <TipsCard title="解析引擎说明">
                <p>文本类文件通过内置科研语言模型自动抽取关键字段。图像类文件通过视觉识别技术提取文字和数据。</p>
              </TipsCard>
              <TipsCard type="warn" title="上传注意事项">
                <p>单文件不超过 50MB。手写笔记建议扫描分辨率不低于 300 DPI 以获得最佳识别效果。不支持加密 PDF 和受密码保护的 Office 文件。</p>
              </TipsCard>
            </div>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// 工作台
// ═══════════════════════════════════════════════════

function WbUploadSection() {
  return (
    <section id="section-wb-upload" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="工作台"
          title="文件上传与解析"
          desc="工作台采用三栏布局：左栏负责数据输入与历史实验，中栏编辑，右栏 AI 辅助。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <DocFigure figKey="wb-overview" />
            <DocFigure figKey="wb-parsing" />
            <Step num={1} title="进入工作台">
              <p>点击顶部导航「工作台」或首页「进入工作台」按钮。</p>
            </Step>
            <Step num={2} title="上传文件">
              <p>在左栏「数据输入」卡片区：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>拖拽上传：将文件从资源管理器拖入虚线框即可。</li>
                <li>点击上传：点击虚线框弹出文件选择窗口，支持多选。</li>
              </ul>
              <p className="mt-1.5 text-[11px] text-muted-foreground/70">
                上传后可在虚线框内看到解析进度条，依次经过：读取文件内容、智能识别、字段提取、去重合并四个阶段。
              </p>
            </Step>
            <Step num={3} title="解析流程说明">
              <div className="space-y-2 mt-1">
                <FeatureRow label="阶段一" desc="读取文件内容，根据文件类型选择对应的解析方式。" />
                <FeatureRow label="阶段二" desc="根据内容自动匹配最合适的学科动态模板。" />
                <FeatureRow label="阶段三" desc="自动校验字段合法性，统一术语和单位格式。" />
                <FeatureRow label="阶段四" desc="多文件交叉去重，合并为一张或多张实验卡片。" />
              </div>
            </Step>
            <Step num={4} title="处理结果">
              <p>解析完成后：弹出提示告知生成了几张卡片；左栏「历史实验」列表出现新记录；自动选中第一张卡片进入中栏编辑。原始文件将永久保存在你的云端存储空间，随时可下载复核。</p>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function WbCardSection() {
  return (
    <section id="section-wb-card" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="工作台"
          title="实验卡片与字段编辑"
          desc="中栏卡片编辑器支持结构化字段编辑与自定义扩展。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <DocFigure figKey="wb-card" />
            <Step num={1} title="卡片基础信息">
              <p>每张卡片顶部包含：实验名称、日期、操作人、实验类型。均为可编辑字段，AI 解析会自动填充。</p>
            </Step>
            <Step num={2} title="字段分区说明">
              <p>卡片字段按学科模板组织，常见分区包括：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>实验目的：本实验要验证的假设或达成的目标。</li>
                <li>设备仪器：名称、型号、编号。</li>
                <li>样品信息：ID、批次、浓度、来源。</li>
                <li>参数列表：名称、数值、单位的结构化条目，支持无限扩展。</li>
                <li>操作步骤：详细操作流程。</li>
                <li>结果结论：原始结果、分析结论、异常记录。</li>
              </ul>
            </Step>
            <Step num={3} title="保存与删除">
              <p>编辑内容会自动触发脏检测，点击「保存」按钮写入云端。点击「删除」会弹出二次确认，删除后卡片不可恢复。</p>
            </Step>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <TipsCard type="success" title="快捷键">
                <p>Ctrl+S 保存；Ctrl+N 新建实验；Ctrl+D 快速复制当前卡片参数到新卡片。</p>
              </TipsCard>
              <TipsCard title="自定义字段">
                <p>点击卡片底部「添加字段」可自定义字段路径，支持嵌套对象与数组结构，满足特殊记录需求。</p>
              </TipsCard>
            </div>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function WbConfidenceSection() {
  return (
    <section id="section-wb-confidence" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="工作台"
          title="置信度校准"
          desc="每个字段都会进行置信度评估，帮助快速定位需人工核对的字段。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <DocFigure figKey="wb-confidence" />
            <Step num={1} title="综合置信度面板">
              <p>右栏顶部「置信度评估」面板展示：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li><strong className="text-foreground">高置信度（直接采信）</strong>：系统判定该字段直接提取自原文或具有极高确定性，通常无需核对。</li>
                <li><strong className="text-foreground">中置信度（建议核对）</strong>：基于上下文推断得出，建议对照原件确认数值。</li>
                <li><strong className="text-foreground">低置信度（必须修改）</strong>：信息缺失或高度不确定，需人工补全。</li>
              </ul>
            </Step>
            <Step num={2} title="操作：一键补全与重新解析">
              <div className="space-y-1.5">
                <FeatureRow label="一键补全" desc="根据已有字段逻辑推断缺失值，填充后仍需人工复核。" />
                <FeatureRow label="重新解析" desc="基于卡片已附加文件的内容重新抽取字段。适合手动修正了附件后使用。" />
              </div>
            </Step>
            <Step num={3} title="核对流程建议">
              <p>推荐工作流：先点击「一键补全」填充缺失字段；然后聚焦「需人工核对」列表中的前几项；对照原始附件确认数值；确认后手动更新字段值并保存。</p>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function WbAssistantSection() {
  return (
    <section id="section-wb-assistant" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="工作台"
          title="复现清单"
          desc="自动检查实验完整性，生成复现清单与论文草稿。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <Step num={1} title="完整性检查">
              <p>系统按学科模板校验必需字段，缺项会以列表形式列出。缺项数量越少，复现可靠性越高。</p>
            </Step>
            <Step num={2} title="复现 Checklist">
              <p>内置通用检查项与学科特定检查项。操作前逐项打勾确认：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1 text-[11px]">
                <li>补充缺失字段（自动生成）</li>
                <li>记录至少 3 次重复实验结果</li>
                <li>保存原始仪器数据文件</li>
                <li>记录环境异常与中断事件</li>
                <li>核对所有单位与符号规范</li>
              </ul>
            </Step>
            <Step num={3} title="Methods 草稿">
              <p>系统根据卡片内参数自动生成可复制的论文 Methods 段落草稿。点击「复制」一键复制到剪贴板，格式为纯文本，可直接粘贴到 Word。</p>
            </Step>
            <Step num={4} title="导出复现包">
              <p>点击「导出复现包」生成文件，包含实验卡片完整数据与 Methods 草稿，用于课题组内共享实验条件、交接课题。</p>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function WbRagSection() {
  return (
    <section id="section-wb-rag" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="工作台"
          title="知识问答"
          desc="右栏底部问答面板：基于当前所有实验卡片的知识库自然语言问答。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <DocFigure figKey="wb-rag" />
            <Step num={1} title="使用方式">
              <p>在右栏「知识问答」输入框内直接用自然语言提问，按回车或点击发送按钮。</p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">示例问题：</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <SuggestChip text="上次样品 Fe-2309 的退火温度是多少？" />
                <SuggestChip text="哪几次实验出现电流异常？" />
                <SuggestChip text="知识库涉及哪些设备？" />
              </div>
            </Step>
            <Step num={2} title="回答与来源追溯">
              <p>每条 AI 回答均附带来源信息：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>来源文档：对应的实验卡片名称。</li>
                <li>位置信息：字段在卡片中的路径。</li>
                <li>查看卡片：一键跳转至对应实验卡片。</li>
              </ul>
            </Step>
            <Step num={3} title="实时输出">
              <p>回答内容实时逐步生成，体验流畅。若网络不稳定会自动切换为整段返回模式。</p>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function SuggestChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-secondary/60 px-2 py-1 text-[10px] text-muted-foreground">
      {text}
    </span>
  );
}

// ═══════════════════════════════════════════════════
// 实验复现
// ═══════════════════════════════════════════════════

function RepInputSection() {
  return (
    <section id="section-rep-input" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="实验复现"
          title="论文 Methods 输入"
          desc="进入「实验复现」页面，支持预设论文和自定义粘贴两种方式。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <DocFigure figKey="rep-input" />
            <Step num={1} title="选择论文来源">
              <p>系统内置多篇真实开放获取论文作为预设，覆盖材料科学、生物学、药学等多个学科：</p>
              <div className="grid gap-1.5 md:grid-cols-2 mt-1">
                <PresetPaper name="SrTiO3/rGO/g-C3N4" field="材料科学 · 光催化" />
                <PresetPaper name="Co3O4-rGO" field="材料科学 · 超级电容" />
                <PresetPaper name="Plant Extract Synthesis" field="化学 · 绿色合成" />
                <PresetPaper name="Spatial Transcriptomics" field="生物学 · 基因组学" />
                <PresetPaper name="Western Blot" field="生命科学 · 蛋白检测" />
                <PresetPaper name="MTT Assay" field="药学 · 细胞活力" />
                <PresetPaper name="Patch Clamp" field="生理学 · 电生理" />
              </div>
            </Step>
            <Step num={2} title="自定义粘贴">
              <p>选择「自定义输入」后需填写：</p>
              <FeatureRow label="论文标题" desc="用于审计结果存档标识。" />
              <FeatureRow label="DOI (选填)" desc="方便回溯原文。" />
              <FeatureRow label="学科领域" desc="影响知识增强推断的学科倾向。" />
              <FeatureRow label="Methods 文本" desc="粘贴论文的 Experimental、Methods 或 Materials and Methods 完整段落。段落越完整，拆解越准确。" />
            </Step>
            <Step num={3} title="启动 AI 拆解">
              <p>点击「AI 拆解论文」按钮。系统会先检查是否包含敏感信息并弹窗确认，然后提交解析任务。解析过程中可切换页面，不影响后台处理。一般 30 至 60 秒内完成。</p>
            </Step>

            <div className="mt-3">
              <TipsCard title="快速演示模式">
                <p>点击「加载预设结果（快速演示）」可立即查看该论文的完整预设拆解结果，无需等待解析。适合新用户快速了解功能结构。</p>
              </TipsCard>
            </div>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function PresetPaper({ name, field }: { name: string; field: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/40 bg-card/30 px-2.5 py-1.5">
      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
      <div className="min-w-0">
        <div className="text-[11px] font-medium truncate">{name}</div>
        <div className="text-[9px] text-muted-foreground truncate">{field}</div>
      </div>
    </div>
  );
}

function RepParamsSection() {
  return (
    <section id="section-rep-params" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="实验复现"
          title="参数与确定性分级"
          desc="系统从 Methods 段落中抽取参数，按确定性等级标注来源。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <DocFigure figKey="rep-params" />
            <Step num={1} title="确定性分级">
              <p>每个参数都有色标和标签，共 4 级：</p>
              <div className="grid gap-1.5 md:grid-cols-2 mt-1">
                <CertaintyBadge color="bg-[color:var(--color-success)]" label="论文明确" desc="论文原文直接陈述的数值。" />
                <CertaintyBadge color="bg-primary" label="论文隐含" desc="根据上下文和行文逻辑可唯一推断。" />
                <CertaintyBadge color="bg-[color:var(--color-warning)]" label="AI 推断" desc="基于领域知识推测，建议核对。" />
                <CertaintyBadge color="bg-destructive" label="未知" desc="论文中完全找不到，归类为复现缺口。" />
              </div>
            </Step>
            <Step num={2} title="参数详情展开">
              <p>点击参数行右侧展开按钮可查看详情，包含：论文原文引用、推断依据、参考取值范围、来源标识、错误影响等级（严重、重要、次要）、关联参数列表。</p>
            </Step>
            <Step num={3} title="修改与确认">
              <p>非「论文明确」级别的参数可点击编辑修改：输入正确数值后点击「确认」。已确认的参数会打上绿色对勾，不再计入缺口统计。点击「保存」自动重新计算复现可行性评分。</p>
            </Step>

            <div className="mt-3">
              <TipsCard type="warn" title="严重级错误影响">
                <p>标记为「严重」的参数，其错误大概率导致实验完全无法复现或产生重大安全事故（如反应温度、有毒试剂用量）。必须在实验前 100% 确认。</p>
              </TipsCard>
            </div>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function CertaintyBadge({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border/40 bg-card/30 p-2">
      <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold">{label}</div>
        <div className="text-[10px] text-muted-foreground leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

function RepGapsSection() {
  return (
    <section id="section-rep-gaps" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="实验复现"
          title="缺口检测与补全"
          desc="复现必需但论文中缺失的信息会被标记为缺口，并提供 AI 建议值。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <DocFigure figKey="rep-gaps" />
            <Step num={1} title="查看缺口">
              <p>切换到「缺口」标签页，所有缺口按关键程度自动排序（严重、重要、次要）。每条缺口包含：重要性说明、AI 建议值（含置信度和推断依据）、外部数据库参考链接。</p>
            </Step>
            <Step num={2} title="单条补全">
              <p>有两种方式：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>点击「采纳此建议」接受 AI 推荐值。</li>
                <li>在底部输入框填入你已知或查到的实际值，点击「提交」。</li>
              </ul>
            </Step>
            <Step num={3} title="一键 AI 自动补全">
              <p>若有多个待处理缺口且带有 AI 建议，可点击页面顶部的「AI 自动补全全部缺口」按钮一次性处理，节省重复点击时间。但仍建议对 AI 推断值逐一核实。</p>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function RepProtocolSection() {
  return (
    <section id="section-rep-protocol" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="实验复现"
          title="复现协议导出"
          desc="按实验流程组织的可执行清单，支持逐项打勾和导出。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <DocFigure figKey="rep-protocol" />
            <Step num={1} title="协议结构">
              <p>切换到「协议」标签页，参数按以下阶段分类：</p>
              <div className="flex flex-wrap gap-1 mt-1">
                <StageBadge label="安全防护" />
                <StageBadge label="前驱体准备" />
                <StageBadge label="设备仪器" />
                <StageBadge label="合成步骤" />
                <StageBadge label="后处理" />
                <StageBadge label="表征条件" />
                <StageBadge label="性能测试" />
                <StageBadge label="环境条件" />
              </div>
            </Step>
            <Step num={2} title="逐项勾选">
              <p>每一步前面都有勾选框。开始实验前按顺序执行，完成后打勾。页面顶部显示完成进度。步骤前的标签会告诉你这一步的参数来源可靠度（已确认、AI 推断、需补全）。</p>
            </Step>
            <Step num={3} title="导出">
              <p>点击「下载」按钮，生成以论文标题命名的文件，可直接分享给课题组成员，或打印作为实验台操作清单，也可作为实验记录的附件保存。</p>
            </Step>

            <div className="mt-3">
              <TipsCard type="success" title="关键风险复述">
                <p>协议页底部会再次复述所有严重级风险提示，作为实验前的最后一次安全检查。强烈建议实验人员逐条阅读确认后再开始操作。</p>
              </TipsCard>
            </div>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function StageBadge({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-medium">
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════
// 关系图谱
// ═══════════════════════════════════════════════════

function GraphIntroSection() {
  return (
    <section id="section-graph-intro" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="关系图谱"
          title="节点与关联类型"
          desc="关系图谱以力导向布局可视化实验之间的关联关系。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <DocFigure figKey="graph-overview" />
            <Step num={1} title="实体节点类型">
              <div className="grid gap-1.5 md:grid-cols-2 mt-1">
                <LegendItem color="#6366f1" label="实验" desc="实验卡片本体，点击可直接跳转到卡片。" />
                <LegendItem color="#f59e0b" label="样品" desc="相同样品 ID 的实验会连到同一个样品节点。" />
                <LegendItem color="#10b981" label="设备" desc="共用设备的实验关联。" />
                <LegendItem color="#06b6d4" label="操作人" desc="同一操作人进行的实验。" />
                <LegendItem color="#ec4899" label="试剂原料" desc="共用前驱体或试剂的实验。" />
                <LegendItem color="#8b5cf6" label="方法协议" desc="使用相同方法学的实验。" />
                <LegendItem color="#0ea5e9" label="项目课题" desc="同一课题下的实验分组。" />
              </div>
            </Step>
            <Step num={2} title="连线含义">
              <FeatureRow label="实线" desc="直接关联：明确共享同一实体（如样品 ID 相同）。" />
              <FeatureRow label="虚线" desc="间接关联：通过语义相似度推断的关联。" />
            </Step>
            <Step num={3} title="数据来源">
              <p>图谱数据来源于实验卡片中的字段信息，系统自动抽取并建立关联。同类型且同名的实体会自动合并为一个节点（如样品 ID 完全相同则合并）。</p>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function LegendItem({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border/40 bg-card/30 p-2">
      <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold">{label}</div>
        <div className="text-[10px] text-muted-foreground leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

function GraphInteractSection() {
  return (
    <section id="section-graph-interact" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="关系图谱"
          title="交互与过滤"
          desc="支持拖拽布局、悬停高亮、邻居过滤、详情面板。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <DocFigure figKey="graph-nhop" />
            <Step num={1} title="基本交互">
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>拖拽节点：按住节点拖动可手动调整布局，松开后自动继续模拟。</li>
                <li>悬停高亮：鼠标悬停节点时，仅显示与其直接关联的节点和连线，其他自动淡化。</li>
                <li>点击节点：在右侧详情面板显示该节点的关联实验列表和属性。</li>
              </ul>
            </Step>
            <Step num={2} title="邻居过滤模式">
              <p>大图情况下节点太多难以聚焦。解决方法：点击任一节点后，工具栏出现「本地图」开关，开启后只显示该节点的邻居节点。可选择 1 至 5 跳范围，1 跳即只看直接相连节点。</p>
            </Step>
            <Step num={3} title="详情面板">
              <p>点击节点后右侧面板显示：</p>
              <FeatureRow label="关联实验" desc="列出所有与该节点关联的实验卡片，点击可跳转工作台。" />
              <FeatureRow label="节点信息" desc="如果是实验节点，额外显示设备、样品、操作人等详情。" />
              <FeatureRow label="连接数" desc="该节点的连接总数，反映其在知识网络中的重要性。" />
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function GraphExportSection() {
  return (
    <section id="section-graph-export" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="关系图谱"
          title="搜索与 SVG 导出"
          desc="快速定位节点和导出论文级矢量图。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <Step num={1} title="搜索定位">
              <p>工具栏搜索框输入节点名（样品 ID、设备名、实验名称片段等），支持模糊匹配。选中后自动切换到邻居模式，视角聚焦到目标节点。</p>
            </Step>
            <Step num={2} title="SVG 导出">
              <p>点击工具栏「SVG」按钮，浏览器会下载矢量文件。SVG 为无分辨率损失的矢量格式，可直接插入论文、PPT 或报告中，推荐用专业绘图软件进行后期排版。</p>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// 学术写作
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// 团队协作
// ═══════════════════════════════════════════════════════

function TeamOverviewSection() {
  return (
    <section id="section-team-overview" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="团队协作"
          title="团队协作概览"
          desc="把课题组变成一个有组织的知识共同体：实验资产共享、知识沉淀复用、分工各司其职。"
        />
        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10 space-y-4">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              团队协作模式为课题组/实验室提供独立的工作空间。加入团队后，所有页面（工作台、图谱、资产、问答）自动按团队范围运行：你既能看到自己的实验，也能看到团队共享的实验。
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FeatureRow label="资产共享" desc="实验卡片与附件对全团队可见，新成员无需逐个私发文件" />
              <FeatureRow label="知识复用" desc="团队知识问答、共享模板库与关系图谱，让经验沉淀为团队资产" />
              <FeatureRow label="权限清晰" desc="创建者/管理员/成员三级角色，各司其职不越界" />
              <FeatureRow label="交接无忧" desc="个人资产可一键转入团队，学生毕业、人员更替不断档" />
            </div>
            <TipsCard title="个人空间与团队空间">
              个人数据与团队数据分开管理，左侧边栏顶部可随时切换工作空间；切换后各页面的可见范围立即变化。
            </TipsCard>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function TeamCreateSection() {
  return (
    <section id="section-team-create" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="团队协作"
          title="创建与加入团队"
          desc="创建只需一个名称；加入只需一个邀请码。"
        />
        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <Step num={1} title="创建团队">
              <p>在「团队」页点击「创建团队」，按向导逐屏填写（一屏一个字段，可随时跳过剩余步骤）：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>团队名称：展示名称，可与其他团队重名</li>
                <li>唯一标识：团队的唯一身份标识（类似 GitHub 组织名），全局不重名，创建后不可修改</li>
                <li>所属机构 / 挂靠学院 / 学科 / 研究方向 / 成立年份 / 简介 / 联系邮箱</li>
              </ul>
              <p className="mt-1.5 text-[11px] text-muted-foreground/70">
                创建后你自动成为「创建者」，可在团队页随时补充其余信息。
              </p>
            </Step>
            <Step num={2} title="生成邀请码">
              <p>团队页 →「成员」→ 点击「生成邀请码」。邀请码 8 位、7 天内有效，可复制分享给同事。</p>
            </Step>
            <Step num={3} title="输入邀请码加入">
              <p>在「团队」页点击「输入邀请码加入」，粘贴邀请码即可。加入后自动切换到团队工作空间。</p>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function TeamMembersSection() {
  return (
    <section id="section-team-members" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="团队协作"
          title="成员与权限"
          desc="三级角色，职责清晰：大家都能看，各管各的写，删除只有管理员。"
        />
        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10 space-y-4">
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-[12px]">
                <thead className="bg-secondary/60">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">能力</th>
                    <th className="px-3 py-2 text-left font-semibold">成员</th>
                    <th className="px-3 py-2 text-left font-semibold">管理员</th>
                    <th className="px-3 py-2 text-left font-semibold">创建者</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["查看团队全部资产", "✓", "✓", "✓"],
                    ["上传/编辑自己的实验", "✓", "✓", "✓"],
                    ["编辑他人实验", "—", "✓", "✓"],
                    ["管理成员与邀请码", "—", "✓", "✓"],
                    ["删除任何团队资产", "—", "—", "✓"],
                    ["维护成果墙/项目/公告/模板", "—", "✓", "✓"],
                  ].map((row) => (
                    <tr key={row[0]}>
                      <td className="px-3 py-2">{row[0]}</td>
                      {row.slice(1).map((cell, i) => (
                        <td key={i} className={`px-3 py-2 ${cell === "✓" ? "text-success" : "text-muted-foreground"}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Step num={1} title="填写成员身份">
              <p>成员名单中点击自己的「身份」栏，可填写 PI / 博士后 / 博士生 / 硕士生等身份标签，展示在团队名单中。</p>
            </Step>
            <Step num={2} title="调整角色与移除">
              <p>管理员可在成员行设置「设为管理员」或移除成员；创建者不可被移除，成员可主动退出团队。</p>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function TeamTemplatesSection() {
  return (
    <section id="section-team-templates" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="团队协作"
          title="团队模板库"
          desc="统一团队的实验记录规范：一个模板，全组一致。"
        />
        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <Step num={1} title="管理员创建团队模板">
              <p>团队页 →「模板」→「新建模板」：从 27 个预置模板复制字段结构，或从空白开始，随后在字段编辑器中增删改字段组与字段（类型、单位、选项、必填、表格列）。</p>
            </Step>
            <Step num={2} title="成员选用团队模板">
              <p>工作台点击「新建实验（选模板）」，在团队模板分组中选择模板；实验卡片将按模板字段渲染，记录结构全组统一。</p>
            </Step>
            <TipsCard title="模板与个人字段的关系">
              模板只是起点——创建后成员仍可自由增删自己的字段；团队模板保证的是「默认结构一致」，不限制个性化。
            </TipsCard>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function TeamAssetsSection() {
  return (
    <section id="section-team-assets" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="团队协作"
          title="团队资产与问答"
          desc="工作空间切换后，检索、图谱与问答自动以团队为边界。"
        />
        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10 space-y-4">
            <FeatureRow label="团队知识问答" desc="右侧 AI 助手在团队空间下检索全组实验，回答附来源卡片与引用位置" />
            <FeatureRow label="团队关系图谱" desc="图谱聚合全组实验的设备、样品、方法与操作人，跨人跨实验找关联" />
            <FeatureRow label="个人资产转团队" desc="工作台个人模式下，实验卡上方选择目标团队一键转入（用于学生交接、成果归档）" />
            <FeatureRow label="成果墙 / 项目 / 公告 / 动态" desc="团队主页沉淀论文、专利、获奖、在研项目与近期通知，动态流自动记录成员与实验事件" />
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function PaperGenerateSection() {
  return (
    <section id="section-paper-generate" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="学术写作"
          title="论文起草"
          desc="一键将实验记录整理为符合学术规范的 Methods 段落初稿。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <DocFigure figKey="paper-draft" />
            <Step num={1} title="选择纳入的实验">
              <p>左栏列出所有实验卡片，打勾选择要纳入论文 Methods 的实验。支持跨学科、多次实验组合。默认会选中最近的实验记录。</p>
            </Step>
            <Step num={2} title="生成草稿">
              <p>点击「AI 生成 Methods 初稿」按钮。系统会：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>读取每张选中卡片的字段和参数列表。</li>
                <li>按学科惯用句式进行改写（被动语态、过去式、第三人称）。</li>
                <li>自动合并重复描述（如两次实验用同一样品时合并为一句）。</li>
                <li>追加统计描述（样本量、重复次数、显著性检验方式等）。</li>
              </ul>
            </Step>
            <Step num={3} title="草稿编辑器">
              <p>右栏是可编辑的文本框，AI 生成的内容会自动填入。支持任意手动修改、调整段落顺序、补充描述。编辑器保留换行格式。</p>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function PaperExportSection() {
  return (
    <section id="section-paper-export" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="学术写作"
          title="导出与合规声明"
          desc="导出 Word 文档格式；重要学术伦理提示。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <Step num={1} title="导出格式">
              <p>点击「导出 Word」按钮生成文档文件，可用 Microsoft Word、WPS、Pages 等直接打开。打开后建议统一字体（中文宋体、英文 Times New Roman），并检查期刊模板格式要求。</p>
            </Step>
            <Step num={2} title="学术伦理与规范">
              <div className="rounded-lg border border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning)]/5 p-3 mt-1">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 text-[color:var(--color-warning)]" />
                  <div>
                    <div className="text-[12px] font-semibold text-foreground">AI 功能声明</div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                      LabNote Agent 仅整理和润色你自己的实验记录，不生成虚构数据、不替代科研结论。使用时请注意：
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 mt-1 ml-1 text-[11px] text-muted-foreground">
                      <li>AI 生成内容必须由作者本人严谨核对后才能投稿。</li>
                      <li>遵循目标期刊对 AI 使用披露的要求（部分期刊要求在 Methods 末尾声明）。</li>
                      <li>署名和通讯作者的最终学术责任不受 AI 辅助影响。</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// 实验资产
// ═══════════════════════════════════════════════════

function AssetsManageSection() {
  return (
    <section id="section-assets-manage" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="实验资产"
          title="资产卡片管理"
          desc="所有实验卡片的结构化资产总览，作为课题组知识库主视图。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <DocFigure figKey="assets-grid" />
            <Step num={1} title="统计指标">
              <p>页面顶部统计卡片展示：</p>
              <div className="grid gap-2 md:grid-cols-2 mt-1">
                <FeatureRow label="实验卡片" desc="系统内全部卡片数量。" />
                <FeatureRow label="完整卡片" desc="同时填写了实验目的和结果的卡片数。" />
                <FeatureRow label="参数字段" desc="所有卡片内参数的总条目数。" />
                <FeatureRow label="学科领域" desc="涉及的学科方向数量。" />
              </div>
            </Step>
            <Step num={2} title="卡片网格">
              <p>卡片以网格视图展示（响应式 1 至 3 列）。每张卡片展示：实验名称、学科标签、日期、目的预览、前几项参数预览、操作人。点击任意卡片直接跳转工作台并选中该卡片。</p>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function AssetsExportSection() {
  return (
    <section id="section-assets-export" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="实验资产"
          title="批量导出"
          desc="支持一次性导出全部实验数据，用于备份、迁移或归档。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <Step num={1} title="导出格式">
              <FeatureRow label="JSON 格式" desc="完整数据结构导出，适合程序读取、数据迁移、备份。" />
              <FeatureRow label="Markdown 格式" desc="按每张卡片渲染为人类可读的文档，适合打印、提交给导师、论文附录。" />
            </Step>
            <Step num={2} title="操作">
              <p>点击页面右上角的「导出 Markdown」或「导出 JSON」按钮。文件会以日期命名自动下载。</p>
            </Step>

            <div className="mt-3">
              <TipsCard type="warn" title="隐私提醒">
                <p>导出的文件包含完整实验数据，请妥善存储。不要上传到公开的代码仓库或未加密的云盘。课题结束时建议按单位数据保留政策处理。</p>
              </TipsCard>
            </div>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// 高级功能
// ═══════════════════════════════════════════════════

function AdvSanitizeSection() {
  return (
    <section id="section-adv-sanitize" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="高级功能"
          title="数据脱敏与安全"
          desc="内置敏感信息检测规则，发送给 AI 前自动拦截。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <DocFigure figKey="sanitize-dialog" />
            <Step num={1} title="触发时机">
              <p>在以下流程中自动触发脱敏扫描：工作台 AI 解析、实验复现页面拆解、知识问答入库。</p>
            </Step>
            <Step num={2} title="检测范围">
              <p>扫描类别包括但不限于：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>个人身份信息：姓名、身份证号、手机号、邮箱、地址。</li>
                <li>财务信息：银行卡号、支付账号。</li>
                <li>科研敏感信息：课题保密编号、合作单位协议号、内部项目代号。</li>
                <li>实验室内部信息：设备密码、样品唯一编号等。</li>
              </ul>
            </Step>
            <Step num={3} title="处理方式">
              <p>检测到敏感信息时会弹出确认对话框，列出每一条匹配内容和位置。用户可以选择：</p>
              <FeatureRow label="应用脱敏" desc="用占位标记替换后再处理。" />
              <FeatureRow label="原样发送" desc="确认内容不敏感，强制走原流程。" />
              <FeatureRow label="取消" desc="终止本次操作，回到编辑文本。" />
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function AdvMcpSection() {
  return (
    <section id="section-adv-mcp" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="高级功能"
          title="MCP 开放接口"
          desc="将 LabNote Agent 的核心能力接入你常用的 AI 编程助手（如 Cursor, Claude Desktop, Cline 等）。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <Step num={1} title="什么是 MCP？">
              <p><Term word="MCP" desc="Model Context Protocol，模型上下文协议。一种让 AI 助手能以统一方式调用外部工具的开放标准接口。" />（Model Context Protocol）是 Anthropic 提出的开放标准，相当于给 AI 定义了一套「万能插座」。通过 MCP，你的 AI 助手可以直接调用 LabNote 的 27 个实验模板、物理约束校验引擎和图谱构建能力，而无需离开代码编辑器。</p>
            </Step>
            <Step num={2} title="获取端点">
              <p>LabNote 提供标准的 Streamable HTTP 端点：</p>
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-secondary/40 border border-border/50 p-2.5 font-mono text-[11px]">
                <span className="text-primary">https://</span>
                <span className="text-foreground flex-1">labnote.tech/mcp</span>
                <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigator.clipboard.writeText('https://labnote.tech/mcp')}>
                  <Copy size={12} />
                </button>
              </div>
            </Step>
            <Step num={3} title="配置示例 (Claude Desktop / Cursor)">
              <p>在你的 AI 客户端的 MCP 配置文件（如 `claude_desktop_config.json`）中添加以下配置：</p>
              <pre className="mt-2 rounded-lg bg-secondary/30 border border-border/50 p-3 text-[10px] font-mono text-foreground overflow-x-auto">
{`{
  "mcpServers": {
    "labnote-agent": {
      "url": "https://labnote.tech/mcp"
    }
  }
}`}
              </pre>
            </Step>
            <Step num={4} title="可用工具列表">
              <p>接入后，你的 AI 助手将自动获得以下 8 个工具能力：</p>
              <div className="space-y-1.5 mt-2">
                <FeatureRow label="list_labnote_templates" desc="列出全部 27 个动态实验模板及其字段约束。" />
                <FeatureRow label="match_labnote_template" desc="根据关键词自动评分并匹配最合适的实验类型。" />
                <FeatureRow label="create_experiment_card_draft" desc="使用标准数据模型创建实验卡片草稿。" />
                <FeatureRow label="validate_experiment_properties" desc="执行模板必填检查与 72 条物理/数值约束校验。" />
                <FeatureRow label="build_experiment_rag_chunks" desc="模板驱动的 RAG 语义分块。" />
                <FeatureRow label="build_experiment_graph" desc="构建实验关系图谱数据。" />
                <FeatureRow label="apply_experiment_property_patches" desc="动态更新实验草稿的嵌套字段。" />
                <FeatureRow label="parse_experiment_content" desc="解析文本/CSV 内容，执行脱敏与 JSON 归一化。" />
              </div>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function AdvTemplatesSection() {
  return (
    <section id="section-adv-templates" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="高级功能"
          title="动态实验模板"
          desc="内置多个专业模板驱动字段结构，覆盖主流学科方向。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <Step num={1} title="内置模板">
              <p>系统内置覆盖材料科学、化学、生物学、环境科学、计算科学等多个学科方向的 27 个专业模板。每个模板定义了必需字段、推荐字段、参数分类和完整性检查规则。</p>
            </Step>
            <Step num={2} title="自动匹配">
              <p>解析过程中系统会根据文件内容自动匹配合适的模板。匹配错误时可在卡片顶部手动切换模板类型。</p>
            </Step>
            <Step num={3} title="物理约束校验">
              <p>每个模板内置了严格的物理与数值约束（如温度不低于绝对零度、产率 0-100% 等）。违反硬边界的参数将被拒绝入库，确保数据科学性。</p>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

function AdvSourcesSection() {
  return (
    <section id="section-adv-sources" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="高级功能"
          title="外部数据库接入"
          desc="复现缺口 AI 建议值的底层支撑，接入多个公共科学数据库。"
        />

        <div className={`${GLASS_CARD} mt-5 p-5`}>
          <NoiseTexture />
          <div className="relative z-10">
            <Step num={1} title="化学数据库">
              <p>接入权威化学数据库（如 NIST WebBook），提供化合物标准热力学数据（沸点、熔点、焓值、溶解度）。当系统检测到缺口为这些参数时，会给出参考值并附带 CAS 号链接。</p>
            </Step>
            <Step num={2} title="材料数据库">
              <p>材料科学方向：接入 Materials Project 等权威材料数据库，提供晶体结构、能带、形成焓、弹性模量等材料属性参考。主要用于材料合成类论文的缺口推断。</p>
            </Step>
            <Step num={3} title="知识库底座">
              <p>平台内置海量干湿实验知识库，覆盖多个学科领域，支持语义相似度检索，为知识问答和缺口推断提供底层支撑。</p>
            </Step>
          </div>
        </div>
      </BlurFade>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// FAQ
// ═══════════════════════════════════════════════════

function FaqGeneralSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "上传文件后一直卡在解析阶段怎么办？",
      a: "请检查：单文件是否超过 50MB 上限；图像是否清晰（建议不低于 300 DPI）；网络连接是否正常。若都无问题，刷新页面后重新上传，或拆分为更小的文件逐一上传。若仍失败可联系管理员查看日志。",
    },
    {
      q: "AI 解析的准确率有多高？字段可以信任吗？",
      a: "系统为每个字段提供置信度评估。建议：高置信度（直接提取）可直接使用，中置信度（上下文推断）简单核对，低置信度（信息缺失）手动查询确认。论文原文直接陈述的字段准确率最高，AI 推断的字段建议人工复核。",
    },
    {
      q: "我的实验数据会被用来训练 AI 模型吗？",
      a: "不会。LabNote Agent 严格遵守数据政策：用户上传的实验记录仅用于本次解析和用户自己的知识库；不用于任何模型训练；发送给 AI 引擎前会先经过脱敏处理；云端数据按用户身份严格隔离，仅本人可访问。",
    },
    {
      q: "复现可行性评分多少算合格？",
      a: "参考阈值：高可行性（可直接复现）：关键参数完备，缺口极少；部分可行（补全后可复现）：存在部分关键缺口，需查阅文献或联系原作者；低可行性（高风险）：核心条件严重缺失，不建议直接尝试。注意评分仅为参考，最终决策由研究者本人根据学科经验判断。",
    },
    {
      q: "关系图谱中节点太多太乱，如何找到目标？",
      a: "推荐组合操作：顶部搜索框直接搜索样品 ID 或实验名关键字；选中节点后开启邻居模式（2 跳），过滤掉非直接关联；手动拖拽核心节点到中央位置后，相邻节点会自动靠拢。",
    },
    {
      q: "论文辅助生成的内容查重会不过吗？",
      a: "LabNote Agent 只从你自己的实验记录生成描述，不抄袭任何已发表论文。但要注意：相同实验方法的常规描述本身就是通用表述，可能出现文字重复。建议在 AI 草稿基础上根据本课题组的表达习惯进行人工改写润色。最终以投稿前的查重报告为准。",
    },
    {
      q: "导出的数据文件包含哪些字段？",
      a: "导出的 JSON 文件包含完整的实验数据结构：实验名称、日期、操作人、实验类型、所有参数字段、附件信息、知识标签、AI 洞察等。Markdown 格式则渲染为人类可读的文档。具体字段结构由所属学科模板决定。",
    },
    {
      q: "发现 Bug 或有功能建议，如何反馈？",
      a: "有三种反馈渠道：帮助中心底部「本页是否有帮助」反馈组件（推荐）；加入用户交流群直接联系管理员；邮件联系技术支持。Bug 反馈请附：复现步骤、浏览器版本、截图或录屏。",
    },
  ];

  return (
    <section id="section-faq-general" className="scroll-mt-24">
      <BlurFade inView inViewMargin="-50px">
        <SectionHeader
          tag="常见问题"
          title="通用 FAQ"
          desc="解答产品使用中的高频疑问。以下未覆盖的问题请联系我们。"
        />

        <div className={`${GLASS_CARD} mt-5`}>
          <NoiseTexture />
          <div className="relative z-10 divide-y divide-border/40">
            {faqs.map((faq, i) => {
              const isOpen = openIdx === i;
              return (
                <div key={i} className="px-5 py-1">
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-3.5 text-left"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 text-[12px] font-bold text-primary tabular-nums">
                        Q{i + 1}
                      </span>
                      <span className="text-[13px] font-medium leading-relaxed">{faq.q}</span>
                    </div>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="shrink-0"
                    >
                      <ChevronDown size={16} className="text-muted-foreground" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="pb-4 pl-7 pr-2 text-[12px] text-muted-foreground leading-relaxed">
                          <span className="text-[color:var(--color-success)] font-bold mr-1">A:</span>
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </BlurFade>
    </section>
  );
}
