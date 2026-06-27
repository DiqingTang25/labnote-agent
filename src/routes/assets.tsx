/**
 * 实验资产包页面 — 所有实验卡片的资产管理视图
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useLab, type Experiment } from "../lib/labStore";
import {
  Layers, Package, Download, FileJson, FileText, ArrowUpRight,
  FlaskConical, Clock, CheckCircle2, TrendingUp, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "../lib/auth-guard";

export const Route = createFileRoute("/assets")({
  head: () => ({
    meta: [
      { title: "实验资产包 – LabNote Agent" },
      { name: "description", content: "所有实验卡片的结构化资产视图，支持批量导出与溯源。" },
    ],
  }),
  component: AssetsPage,
});

function AssetsPage() {
  const { experiments } = useLab();

  const totalParams = experiments.reduce((s, e) => s + e.params.length, 0);
  const completedCards = experiments.filter((e) => e.results && e.purpose).length;
  const disciplines = [...new Set(experiments.map((e) => e.discipline).filter(Boolean))];

  const exportAll = (format: "json" | "md") => {
    if (experiments.length === 0) { toast.error("暂无可导出的实验卡片"); return; }
    if (format === "json") {
      const blob = new Blob([JSON.stringify(experiments, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `LabNote-资产包-${new Date().toISOString().slice(0,10)}.json`; a.click();
      URL.revokeObjectURL(url);
    } else {
      const md = experiments.map(toMarkdownAsset).join("\n\n---\n\n");
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `LabNote-资产包-${new Date().toISOString().slice(0,10)}.md`; a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(`已导出 ${experiments.length} 张卡片`);
  };

  if (experiments.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <Package size={48} className="mx-auto text-muted-foreground"/>
        <h1 className="mt-4 text-2xl font-bold">实验资产包</h1>
        <p className="mt-2 text-muted-foreground">尚无实验卡片，请先到工作台上传实验数据。</p>
        <Link to="/workbench" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground">
          前往工作台 <ArrowUpRight size={14}/>
        </Link>
      </div>
    );
  }

  return (
    <RequireAuth>
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* 页头 */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white"><Layers size={20}/></span>
            实验资产包
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">结构化实验数据资产，可追溯、可导出、可直接用于论文</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportAll("md")}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:border-primary/40 transition">
            <FileText size={14}/> 导出 Markdown
          </button>
          <button onClick={() => exportAll("json")}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition">
            <FileJson size={14}/> 导出 JSON
          </button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatBox icon={<Package size={18}/>} label="实验卡片" value={experiments.length} color="blue"/>
        <StatBox icon={<CheckCircle2 size={18}/>} label="完整卡片" value={completedCards} sub={`/${experiments.length}`} color="green"/>
        <StatBox icon={<TrendingUp size={18}/>} label="参数字段" value={totalParams} color="amber"/>
        <StatBox icon={<BookOpen size={18}/>} label="学科领域" value={disciplines.length} color="violet"/>
      </div>

      {/* 卡片网格 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {experiments.map((exp) => (
          <AssetCard key={exp.id} experiment={exp}/>
        ))}
      </div>
    </div>
    </RequireAuth>
  );
}

function StatBox({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string; color: "blue"|"green"|"amber"|"violet";
}) {
  const borders = { blue: "border-l-blue-400", green: "border-l-green-400", amber: "border-l-amber-400", violet: "border-l-violet-400" };
  return (
    <div className={`card-soft p-4 border-l-4 ${borders[color]}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">
        {value}{sub && <span className="text-base text-muted-foreground font-normal">{sub}</span>}
      </div>
    </div>
  );
}

function AssetCard({ experiment }: { experiment: Experiment }) {
  const paramPreview = experiment.params.slice(0, 4).map((p) => `${p.name}=${p.value}${p.unit}`).join(" · ");
  return (
    <Link
      to="/workbench"
      search={{ id: experiment.id }}
      className="card-soft p-5 hover:border-primary/40 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition">{experiment.name}</h3>
        <ArrowUpRight size={14} className="text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition"/>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft text-primary text-[11px] px-2 py-0.5">
          <FlaskConical size={10}/> {experiment.discipline || "未分类"}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-secondary text-muted-foreground text-[11px] px-2 py-0.5">
          <Clock size={10}/> {experiment.date}
        </span>
      </div>
      <div className="mt-3 text-xs text-muted-foreground line-clamp-1">
        🎯 {experiment.purpose || "（待填写实验目的）"}
      </div>
      {paramPreview && (
        <div className="mt-2 text-[11px] text-muted-foreground/70 border-t border-border pt-2 truncate">
          📐 {paramPreview}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>👤 {experiment.operator || "—"}</span>
        <span>📎 {experiment.source}</span>
      </div>
    </Link>
  );
}

function toMarkdownAsset(e: Experiment): string {
  return `## ${e.name}\n- **时间**：${e.date}\n- **人员**：${e.operator}\n- **学科**：${e.discipline}\n- **来源**：${e.source}\n\n### 目的\n${e.purpose}\n\n### 设备\n${e.device.name} / ${e.device.model}\n\n### 样品\n${e.sample.id} (${e.sample.batch})\n\n### 参数\n${e.params.map(p => `- ${p.name}: ${p.value} ${p.unit}`).join("\n")}\n\n### 结果\n${e.results}\n`;
}
