/**
 * 实验结束总结面板 — 解析完成后弹出
 */
import { useState } from "react";
import { useLab, type Experiment } from "../lib/labStore";
import {
  X, CheckCircle2, TrendingUp, Package, Download, FileJson, FileText,
  ClipboardList, BookOpen, Share2, Sparkles, Clock, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  experiments: Experiment[];
  fileCount: number;
  onClose: () => void;
}

export function ExperimentSummary({ experiments, fileCount, onClose }: Props) {
  const totalParams = experiments.reduce((s, e) => s + e.params.length, 0);
  const totalSteps = experiments.reduce((s, e) => s + e.steps.length, 0);

  const exportPackage = () => {
    const md = experiments.map(toMD).join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `LabNote-复现包-${new Date().toISOString().slice(0,10)}.md`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("复现包已下载");
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card-soft w-full max-w-2xl max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-success)] text-white">
              <CheckCircle2 size={20}/>
            </span>
            <div>
              <h2 className="text-lg font-bold">实验解析完成</h2>
              <p className="text-xs text-muted-foreground">{fileCount} 个文件 → {experiments.length} 张结构化卡片</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg"><X size={18}/></button>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-4 gap-3 p-5 border-b border-border">
          <MiniStat icon={<Package size={14}/>} label="实验卡片" value={experiments.length}/>
          <MiniStat icon={<TrendingUp size={14}/>} label="参数字段" value={totalParams}/>
          <MiniStat icon={<ClipboardList size={14}/>} label="实验步骤" value={totalSteps}/>
          <MiniStat icon={<BookOpen size={14}/>} label="学科" value={[...new Set(experiments.map(e=>e.discipline))].length}/>
        </div>

        {/* 卡片列表 */}
        <div className="p-5 space-y-2 max-h-60 overflow-auto">
          {experiments.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg bg-secondary/40 p-3 text-sm">
              <span className="text-xs">📋</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{e.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {e.date} · {e.operator} · {e.sample.id}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
                {e.params.length} 参数
              </span>
            </div>
          ))}
        </div>

        {/* 操作 */}
        <div className="flex gap-3 p-5 border-t border-border">
          <button onClick={exportPackage}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground hover:bg-primary/90 transition">
            <Download size={15}/> 下载复现包
          </button>
          <button onClick={() => {
            navigator.clipboard.writeText(experiments.map(toMD).join("\n\n---\n\n"));
            toast.success("已复制到剪贴板");
          }}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary transition">
            <Share2 size={15}/> 复制
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="text-center p-2">
      <div className="flex justify-center text-muted-foreground">{icon}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function toMD(e: Experiment): string {
  return `## ${e.name}\n- 时间：${e.date}\n- 人员：${e.operator}\n- 样品：${e.sample.id}\n\n### 目的\n${e.purpose}\n\n### 设备\n${e.device.name} / ${e.device.model}\n\n### 参数\n${e.params.map(p => `- ${p.name}: ${p.value} ${p.unit}`).join("\n")}\n\n### 步骤\n${e.steps.map((s,i) => `${i+1}. ${s}`).join("\n")}\n\n### 结果\n${e.results}\n\n### 备注\n${e.notes}`;
}
