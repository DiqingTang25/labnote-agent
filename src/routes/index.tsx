/**
 * 首页：Magic UI SaaS 风格
 * Hero(网格背景+流光) + Logos(滚动) + AI工作流 + 核心功能深度展示 + 数据统计 + CTA
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useLab } from "../lib/labStore";
import { getString } from "../lib/property-utils";
import { setPendingUpload } from "../lib/upload-bridge";
import {
  Sparkles, ArrowRight, Upload,
  CheckCircle2, ListChecks, Database, Brain, FileText,
  MessageSquare, AlertTriangle, Layers, Zap,
} from "lucide-react";
import { BlurFade } from "../components/magicui/blur-fade";
import { GridPattern } from "../components/magicui/grid-pattern";
import { BorderBeam } from "../components/magicui/border-beam";
import { Marquee } from "../components/magicui/marquee";
import { NumberTicker } from "../components/magicui/number-ticker";
import { ShineBorder } from "../components/magicui/shine-border";
import { ProductShowcase } from "../components/ProductShowcase";
import { motion } from "motion/react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LabNote Agent – 让每一次实验都成为可复用的科研资产" },
      { name: "description", content: "面向高校实验室、科研课题组的 AI Agent：多源数据采集、智能清洗、复现实验与 RAG 知识问答。" },
    ],
  }),
  component: Home,
});

const flowSteps = [
  { icon: Upload, label: "上传实验记录", hint: "PDF · 图片 · 表格", color: "oklch(0.52 0.18 250)" },
  { icon: Brain, label: "AI 解析中…", hint: "多模态抽取", color: "oklch(0.6 0.2 220)" },
  { icon: FileText, label: "生成结构化卡片", hint: "模板驱动字段", color: "oklch(0.55 0.16 260)" },
  { icon: AlertTriangle, label: "发现缺失字段", hint: "2 项待补全", color: "oklch(0.78 0.15 75)" },
  { icon: ListChecks, label: "生成 Checklist", hint: "复现清单", color: "oklch(0.65 0.16 155)" },
  { icon: Database, label: "写入知识库", hint: "向量化沉淀", color: "oklch(0.52 0.18 250)" },
  { icon: MessageSquare, label: "AI 科研问答", hint: "随时追溯", color: "oklch(0.6 0.2 220)" },
];

const supportedFormats = [
  "PDF", "DOCX", "XLSX", "CSV", "PNG", "JPG", "TXT", "MD", "LOG", "JSON", "XML",
];

function Home() {
  const { experiments } = useLab();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const totalCards = experiments.length;
  const completeCards = experiments.filter((e) => getString(e.properties, "results") && getString(e.properties, "purpose")).length;
  const completeness = experiments.length > 0 ? Math.round((completeCards / experiments.length) * 100) : 0;

  const handleUpload = (files: FileList | null) => {
    if (!files || !files.length) return;
    setPendingUpload(Array.from(files));
    navigate({ to: "/workbench" });
  };

  return (
    <div className="relative">
      {/* ===== 1. Hero ===== */}
      <section className="relative overflow-hidden">
        <GridPattern
          width={48}
          height={48}
          strokeDasharray="4 4"
          className="[mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary-soft/40 via-background to-background" />
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-12 md:pt-28 md:pb-16">
          <div className="max-w-3xl">
            <BlurFade delay={0.1}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs text-primary">
                <Sparkles size={12} /> 科研数据治理 · 实验复现 AI Agent
              </div>
            </BlurFade>

            <BlurFade delay={0.15}>
              <h1 className="mt-5 text-4xl md:text-6xl font-bold leading-tight tracking-tight">
                让每一次实验<br />
                都成为<span className="brand-gradient-text">可复用的科研资产</span>
              </h1>
            </BlurFade>

            <BlurFade delay={0.2}>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
                上传一份实验记录，30秒生成可复现、可追溯的科研数据资产。
              </p>
            </BlurFade>

            {/* 快速上传区 + CTA */}
            <BlurFade delay={0.25}>
              <div className="mt-8 flex flex-wrap items-start gap-6">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files); }}
                  onClick={() => fileRef.current?.click()}
                  className={`relative cursor-pointer rounded-2xl border-2 border-dashed px-8 py-6 text-center transition-all ${dragging
                    ? "border-primary bg-primary-soft/30 scale-[1.02]"
                    : "border-primary/30 bg-primary-soft/10 hover:border-primary/50 hover:bg-primary-soft/20"
                    }`}
                >
                  <Upload size={28} className="mx-auto text-primary" />
                  <p className="mt-3 text-sm font-semibold">拖拽实验文件到此处</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    支持 PDF · DOCX · XLSX · CSV · PNG · TXT · MD · LOG
                  </p>
                  <input
                    ref={fileRef} type="file" multiple hidden
                    accept=".pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png,.txt,.md,.log,.json,.xml"
                    onChange={(e) => handleUpload(e.target.files)}
                  />
                  <BorderBeam size={150} duration={8} colorFrom="oklch(0.52 0.18 250)" colorTo="oklch(0.62 0.18 220)" />
                </div>
                <div className="flex flex-col gap-3 pt-2">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link to="/workbench" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition">
                      <Zap size={16} /> 进入工作台 <ArrowRight size={16} />
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link to="/assets" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium hover:border-primary/40 transition">
                      <Layers size={16} /> 实验资产
                    </Link>
                  </motion.div>
                </div>
              </div>
            </BlurFade>
          </div>
        </div>
      </section>

      {/* ===== 2. Logos 滚动 ===== */}
      <section className="py-6 border-y border-border/30">
        <BlurFade delay={0.05} inView inViewMargin="-30px">
          <p className="text-center text-xs text-muted-foreground mb-3">支持的全部数据格式</p>
        </BlurFade>
        <Marquee pauseOnHover className="[--duration:25s]">
          {supportedFormats.map((fmt) => (
            <span key={fmt} className="mx-2 rounded-lg border border-border/60 bg-card px-4 py-2 text-sm font-medium text-muted-foreground">
              {fmt}
            </span>
          ))}
        </Marquee>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-background via-transparent to-background [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]" />
      </section>

      {/* ===== 3. AI 工作流（光束连接） ===== */}
      <WorkflowAnimation />

      {/* ===== 4. 核心功能深度展示 ===== */}
      <ProductShowcase />

      {/* ===== 5. 数据统计 ===== */}
      <StatsSection
        totalCards={totalCards}
        completeCards={completeCards}
        completeness={completeness}
        experiments={experiments}
      />

      {/* ===== 6. CTA ===== */}
      <CTASection />
    </div>
  );
}

// ====== 子组件 ======

function WorkflowAnimation() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % flowSteps.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <BlurFade inView inViewMargin="-50px">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">AI 工作流</h2>
          <p className="text-sm text-muted-foreground mt-1">从原始数据到可复现实验卡片的完整链路</p>
        </div>
      </BlurFade>

      <div className="relative flex flex-wrap justify-center gap-3">
        {/* 连接线背景 */}
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

        {flowSteps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === active;
          const isDone = i < active;
          return (
            <BlurFade key={i} delay={i * 0.08} inView inViewMargin="-30px">
              <motion.div
                animate={{
                  scale: isActive ? 1.05 : 1,
                  y: isActive ? -4 : 0,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs transition-colors ${isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : isDone
                    ? "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]"
                    : "bg-secondary text-muted-foreground"
                  }`}
              >
                <Icon size={16} />
                <div className="text-left leading-tight">
                  <div className="font-medium">{s.label}</div>
                  <div className="text-[10px] opacity-70">{s.hint}</div>
                </div>
                {/* 流动光点 */}
                {isActive && (
                  <motion.div
                    className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
            </BlurFade>
          );
        })}
      </div>
    </section>
  );
}

function StatsSection({ totalCards, completeCards, completeness, experiments }: {
  totalCards: number; completeCards: number; completeness: number;
  experiments: ReturnType<typeof useLab>["experiments"];
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <BlurFade inView inViewMargin="-50px">
        <div className="flex items-end justify-between flex-wrap gap-2 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">数据中心</h2>
            <p className="mt-1 text-sm text-muted-foreground">你的实验资产，与支撑 AI 解析的平台知识库</p>
          </div>
          <Link to="/assets" className="text-sm text-primary hover:underline flex items-center gap-1">
            进入实验资产 <ArrowRight size={14} />
          </Link>
        </div>
      </BlurFade>

      <div className="grid gap-4 sm:grid-cols-3">
        <BlurFade delay={0.05} inView inViewMargin="-30px">
          <div className="card-soft p-4 border-l-4 border-blue-200 bg-blue-50/50">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <FileText size={18} /> 实验卡片总数
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              <NumberTicker value={totalCards} />
            </div>
          </div>
        </BlurFade>
        <BlurFade delay={0.1} inView inViewMargin="-30px">
          <div className="card-soft p-4 border-l-4 border-green-200 bg-green-50/50">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <CheckCircle2 size={18} /> 完整卡片数
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              <NumberTicker value={completeCards} />
            </div>
          </div>
        </BlurFade>
        <BlurFade delay={0.15} inView inViewMargin="-30px">
          <div className="card-soft p-4 border-l-4 border-amber-200 bg-amber-50/50">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Layers size={18} /> 参数完整率
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              <NumberTicker value={completeness} />%
            </div>
          </div>
        </BlurFade>
      </div>

      {/* 平台知识库：AI 解析与知识问答的检索增强底座（干湿实验双库） */}
      <BlurFade delay={0.18} inView inViewMargin="-30px">
        <div className="mt-6 card-soft overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border/40 px-5 py-3">
            <Database size={16} className="text-primary" />
            <span className="text-sm font-semibold">平台知识库</span>
            <span className="ml-2 text-xs text-muted-foreground">AI 解析与知识问答依托知识库检索增强 · 干湿实验双库</span>
          </div>
          <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
            {[
              { label: "专业实验模板", value: 45, suffix: "个", desc: "覆盖材料 / 生物 / 计算等方向" },
              { label: "干实验知识库", value: 128000, suffix: "+", desc: "计算模拟与数据分析记录" },
              { label: "湿实验知识库", value: 86000, suffix: "+", desc: "合成 / 表征 / 测试记录" },
              { label: "学科领域覆盖", value: 15, suffix: "+", desc: "跨学科语义检索" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold tabular-nums text-primary">
                  <NumberTicker value={s.value} />
                  {s.suffix}
                </div>
                <div className="mt-1 text-xs font-medium">{s.label}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </BlurFade>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <BlurFade delay={0.2} inView inViewMargin="-30px">
          <RecentList title="最近实验" items={experiments.slice(0, 5).map(e => ({ title: e.name, sub: `${e.date} · ${e.operator || "—"}`, to: "/workbench", id: e.id }))} icon={<FileText size={14} />} />
        </BlurFade>
        <BlurFade delay={0.25} inView inViewMargin="-30px">
          <RecentList title="待补全实验" items={experiments.filter((e) => !getString(e.properties, "results") || !getString(e.properties, "purpose")).slice(0, 5).map((e) => ({ title: e.name, sub: "待补关键字段", to: "/workbench", id: e.id }))} icon={<AlertTriangle size={14} />} />
        </BlurFade>
      </div>
    </section>
  );
}

function RecentList({ title, items, icon }: {
  title: string; items: Array<{ title: string; sub: string; to?: string; id?: string }>;
  icon: React.ReactNode;
}) {
  return (
    <div className="card-soft p-4">
      <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-2 mb-3">{icon}{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i}>
            {item.to ? (
              <Link to={item.to} search={item.id ? { id: item.id } : undefined} className="block rounded-lg p-2 hover:bg-secondary text-xs">
                <div className="font-medium truncate">{item.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</div>
              </Link>
            ) : (
              <div className="rounded-lg p-2 text-xs">
                <div className="font-medium truncate">{item.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CTASection() {
  const reasons = [
    {
      icon: Upload,
      title: "全模态输入",
      desc: "文本、图像、表格，实验数据格式不设限",
      glow: "rgba(59,130,246,0.18)",
    },
    {
      icon: Layers,
      title: "结构化治理",
      desc: "45 个专业模板驱动字段提取，参数标准化，术语统一",
      glow: "rgba(96,165,250,0.16)",
    },
    {
      icon: ListChecks,
      title: "可复现追溯",
      desc: "每张卡片可生成复现包，包含完整的实验条件与步骤",
      glow: "rgba(34,197,94,0.14)",
    },
  ];
  const noiseTexture = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

  return (
    <section className="relative mt-8 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent to-primary-soft/20" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary-soft/10 via-background to-background" />
      <GridPattern width={48} height={48} strokeDasharray="4 4" className="[mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)] opacity-30" />

      <div className="relative mx-auto max-w-5xl px-4 py-20">
        <BlurFade inView inViewMargin="-50px">
          <h2 className="text-center text-2xl font-bold md:text-3xl">为什么选择 LabNote Agent</h2>
        </BlurFade>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {reasons.map((r, i) => (
            <BlurFade key={r.title} delay={0.08 * i} inView inViewMargin="-30px">
              {/* 浅色玻璃拟态：磨砂白底 + 顶部内高光 + 柔和外发光 + 噪点纹理 */}
              <div
                className="group relative h-full overflow-hidden rounded-xl border border-border/50 bg-white/60 p-6 backdrop-blur-md transition-all duration-300 hover:border-primary/30"
                style={{
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 24px -10px rgba(59,130,246,0.12)",
                }}
              >
                {/* 噪点纹理（极淡，消除数码塑料感） */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay"
                  style={{ backgroundImage: noiseTexture, backgroundSize: "200px 200px" }}
                />
                {/* 悬停外发光 */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ boxShadow: `0 8px 40px -12px ${r.glow}` }}
                />
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                    <r.icon size={18} className="text-primary" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{r.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.desc}</p>
                </div>
              </div>
            </BlurFade>
          ))}
        </div>

        <BlurFade delay={0.3} inView inViewMargin="-30px">
          <div className="mt-12 flex justify-center">
            <ShineBorder borderRadius={12} duration={12}>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to="/workbench" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90">
                  <Zap size={16} /> 立即开始 <ArrowRight size={16} />
                </Link>
              </motion.div>
            </ShineBorder>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
