/**
 * 首页：Hero + 快速上传 + AI 工作流动画 + Dashboard
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { useLab } from "../lib/labStore";
import { setPendingUpload } from "../lib/upload-bridge";
import {
  FileSearch, Sparkles, GitBranch, ArrowRight, Upload,
  CheckCircle2, ListChecks, Database, Brain, FileText,
  MessageSquare, AlertTriangle, BookOpen, Layers,
  Loader2, Zap,
} from "lucide-react";

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
  { icon: <Upload size={16} />, label: "上传实验记录", hint: "PDF · 图片 · 语音" },
  { icon: <Brain size={16} />, label: "AI 解析中…", hint: "多模态抽取" },
  { icon: <FileText size={16} />, label: "生成结构化实验卡片", hint: "28 个字段" },
  { icon: <AlertTriangle size={16} />, label: "发现缺失字段", hint: "2 项待补全" },
  { icon: <ListChecks size={16} />, label: "生成 Checklist", hint: "复现清单" },
  { icon: <Database size={16} />, label: "写入知识库", hint: "向量化沉淀" },
  { icon: <MessageSquare size={16} />, label: "AI 科研问答", hint: "随时追溯" },
];

function Home() {
  const { experiments } = useLab();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const totalCards = experiments.length;
  const completeCards = experiments.filter(e => e.results && e.purpose).length;
  const completeness = experiments.length > 0 ? Math.round((completeCards / experiments.length) * 100) : 0;

  const handleUpload = (files: FileList | null) => {
    if (!files || !files.length) return;
    setPendingUpload(Array.from(files));
    navigate({ to: "/workbench" });
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-soft via-background to-background" />
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-12 md:pt-28 md:pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs text-primary">
              <Sparkles size={12} /> 科研数据治理 · 实验复现 AI Agent
            </div>
            <h1 className="mt-5 text-4xl md:text-6xl font-bold leading-tight tracking-tight">
              让每一次实验<br />
              都成为<span className="brand-gradient-text">可复用的科研资产</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              上传一份实验记录，30秒生成可复现、可追溯的科研数据资产。
            </p>

            {/* 快速上传区 */}
            <div className="mt-8 flex flex-wrap items-start gap-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed px-8 py-6 text-center transition-all ${dragging
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
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <Link to="/workbench" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition">
                  <Zap size={16} /> 进入工作台 <ArrowRight size={16} />
                </Link>
                <Link to="/assets" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium hover:border-primary/40 transition">
                  <Layers size={16} /> 实验资产包
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI 工作流动画 */}
      <WorkflowAnimation />
      {/* Dashboard */}
      <Dashboard experiments={experiments} totalCards={totalCards} completeness={completeness} />
      {/* 能力 */}
      <Capabilities />
      {/* Why */}
      <WhyChoose />
      {/* Timeline */}
      <InteractiveTimeline />
    </div>
  );
}

// ====== 子组件 ======

function WorkflowAnimation() {
  const [active, setActive] = useState(0);
  useState(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % flowSteps.length), 1800);
    return () => clearInterval(t);
  });
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">AI 工作流</h2>
        <p className="text-xs text-muted-foreground mt-1">从原始数据到可复现实验卡片的完整链路</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {flowSteps.map((s, i) => (
          <div key={i}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs transition-all ${i === active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
              : i < active ? "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]"
                : "bg-secondary text-muted-foreground"
              }`}
          >
            {s.icon}
            <div className="text-left leading-tight">
              <div className="font-medium">{s.label}</div>
              <div className="text-[10px] opacity-70">{s.hint}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Dashboard({ experiments, totalCards, completeness }: {
  experiments: ReturnType<typeof useLab>["experiments"];
  totalCards: number; completeness: number;
}) {
  const completeCards = experiments.filter(e => e.results && e.purpose).length;
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex items-end justify-between flex-wrap gap-2 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">数据中心</h2>
          <p className="mt-1 text-sm text-muted-foreground">实时数据，来自 Supabase</p>
        </div>
        <Link to="/workbench" className="text-sm text-primary hover:underline flex items-center gap-1">
          进入工作台 <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="blue" icon={<FileText size={18} />} label="实验卡片总数" value={totalCards} />
        <StatCard tone="green" icon={<CheckCircle2 size={18} />} label="完整卡片数" value={completeCards} />
        <StatCard tone="amber" icon={<Layers size={18} />} label="参数完整率" value={`${completeness}%`} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RecentList title="最近实验" items={experiments.slice(0, 5).map(e => ({ title: e.name, sub: `${e.date} · ${e.operator || "—"}`, to: "/workbench", id: e.id }))} icon={<FileText size={14} />} />
        <RecentList title="待补全实验" items={experiments.filter(e => !e.results || !e.purpose).slice(0, 5).map(e => ({ title: e.name, sub: `待补关键字段`, to: "/workbench", id: e.id }))} icon={<AlertTriangle size={14} />} />
      </div>
    </section>
  );
}

function Capabilities() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold">三大核心能力</h2>
        <p className="mt-3 text-muted-foreground">从原始记录到可复现的科研资产，全流程 AI 赋能</p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <FeatureCard icon={<FileSearch size={22} />} title="多源数据采集与解析"
          desc="一键导入 PDF / Word / Excel / 图片 / 仪器日志 / 语音，多模态大模型自动抽取实验信息。"
          tags={["PDF/DOCX", "Excel/CSV", "仪器截图", "语音 ASR"]} />
        <FeatureCard icon={<Sparkles size={22} />} title="智能清洗与完整性检查"
          desc="自动补全缺失字段、统一术语与单位、识别异常参数，输出可信可复核的结构化卡片。"
          tags={["术语对齐", "单位规整", "完整性检查", "异常识别"]} />
        <FeatureCard icon={<GitBranch size={22} />} title="复现实验与知识库问答"
          desc="自动生成复现清单与论文 Methods 草稿，基于 RAG 知识库支持自然语言追溯。"
          tags={["复现清单", "Methods 草稿", "RAG 检索", "实验追溯"]} />
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, desc, tags }: { icon: React.ReactNode; title: string; desc: string; tags: string[] }) {
  return (
    <div className="card-soft p-6 hover:border-primary/30 transition">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">{icon}</div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => <span key={t} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>)}
      </div>
    </div>
  );
}

function useCountUp(targetValue: number | string, duration: number = 1500) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          hasAnimated.current = true;
          observer.disconnect();

          const target = typeof targetValue === "string"
            ? parseFloat(targetValue.replace(/[^0-9.]/g, ""))
            : targetValue;

          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = target * easeOut;

            setDisplayValue(currentValue);

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [targetValue, duration]);

  const formatValue = useCallback(() => {
    const rawValue = typeof targetValue === "string"
      ? parseFloat(targetValue.replace(/[^0-9.]/g, ""))
      : targetValue;

    if (Number.isInteger(rawValue)) {
      return Math.round(displayValue).toString();
    }

    if (targetValue.toString().includes("%")) {
      return `${Math.round(displayValue)}%`;
    }

    return Math.round(displayValue).toString();
  }, [displayValue, targetValue]);

  return { ref, displayValue, formatValue };
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone: "blue" | "green" | "amber" | "violet" }) {
  const { ref, formatValue } = useCountUp(value, 1500);
  const colors = { blue: "border-blue-200 bg-blue-50", green: "border-green-200 bg-green-50", amber: "border-amber-200 bg-amber-50", violet: "border-violet-200 bg-violet-50" };
  return (
    <div className={`card-soft p-4 border-l-4 ${colors[tone]}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
      <div ref={ref} className="mt-1 text-2xl font-bold tabular-nums">{formatValue()}</div>
    </div>
  );
}

function RecentList({ title, items, icon, tone }: {
  title: string; items: Array<{ title: string; sub: string; to?: string; id?: string }>;
  icon: React.ReactNode; tone?: string;
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

// 保留 WhyChoose 和 InteractiveTimeline（组件在下方定义但保持原有实现在末尾）
function WhyChoose() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="text-3xl font-bold text-center">为什么选择 LabNote Agent</h2>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {[
          { title: "全模态输入", desc: "文本、图像、语音、视频，实验数据格式不设限" },
          { title: "结构化治理", desc: "28个标准字段自动提取，参数标准化，术语统一" },
          { title: "可复现追溯", desc: "每张卡片可生成复现包，包含完整的实验条件与步骤" },
        ].map((c) => (
          <div key={c.title} className="card-soft p-6 text-center">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function InteractiveTimeline() {
  const steps = [
    { step: "01", label: "数据上传", desc: "拖拽或选择实验文件" },
    { step: "02", label: "AI 解析", desc: "多模态抽取结构化信息" },
    { step: "03", label: "卡片生成", desc: "自动填充实验卡片" },
    { step: "04", label: "复现准备", desc: "生成 Checklist + Methods" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="text-3xl font-bold text-center mb-8">四步开始</h2>
      <div className="flex flex-wrap justify-center gap-6">
        {steps.map((s, i) => (
          <div key={i} className="card-soft p-6 w-52 text-center">
            <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-full text-white mx-auto text-sm font-bold">{s.step}</div>
            <h3 className="mt-3 font-semibold">{s.label}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
