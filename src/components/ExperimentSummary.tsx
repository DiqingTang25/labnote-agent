/**
 * 实验结束总结面板 — 解析完成后弹出
 */
import {
  X, CheckCircle2, TrendingUp, Package, Download,
  ClipboardList, BookOpen, Share2,
} from "lucide-react";
import { toast } from "sonner";
import type { ExperimentDoc } from "../lib/labStore";
import { flattenProperties, getString } from "../lib/property-utils";

interface Props {
  experiments: ExperimentDoc[];
  fileCount: number;
  onClose: () => void;
}

export function ExperimentSummary({ experiments, fileCount, onClose }: Props) {
  const totalFields = experiments.reduce((s, e) => s + flattenProperties(e.properties).length, 0);
  const disciplines = new Set(experiments.map((e) => getString(e.properties, "discipline") || "未知"));

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

        <div className="grid grid-cols-4 gap-3 p-5 border-b border-border">
          <MiniStat icon={<Package size={14}/>} label="实验卡片" value={experiments.length}/>
          <MiniStat icon={<TrendingUp size={14}/>} label="提取字段" value={totalFields}/>
          <MiniStat icon={<ClipboardList size={14}/>} label="文件数" value={fileCount}/>
          <MiniStat icon={<BookOpen size={14}/>} label="学科" value={disciplines.size}/>
        </div>

        <div className="p-5 space-y-2 max-h-60 overflow-auto">
          {experiments.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg bg-secondary/40 p-3 text-sm">
              <ClipboardList size={14} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{e.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {e.date} · {e.operator} · {getString(e.properties, "sample.id") || "—"}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
                {flattenProperties(e.properties).length} 字段
              </span>
            </div>
          ))}
        </div>

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

function toMD(e: ExperimentDoc): string {
  const props = e.properties as Record<string, unknown>;
  const purpose = (props["purpose"] as string) ?? "";
  const device = props["device"] as Record<string, unknown> | undefined;
  const deviceName = (device?.["name"] as string) || "";
  const deviceModel = (device?.["model"] as string) || "";
  const sample = props["sample"] as Record<string, unknown> | undefined;
  const sampleId = (sample?.["id"] as string) || "";
  const results = (props["results"] as string) ?? "";
  const notes = (props["notes"] as string) ?? "";
  const params = props["params"] as Array<{ name: string; value: string; unit?: string }> | undefined;
  const steps = props["steps"] as string[] | undefined;

  const paramsStr = params?.map((p) => `- ${p.name}: ${p.value} ${p.unit ?? ""}`).join("\n") ?? "";
  const stepsStr = steps?.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n") ?? "";

  return `## ${e.name}\n- 时间：${e.date}\n- 人员：${e.operator}\n- 样品：${sampleId}\n\n### 目的\n${purpose}\n\n### 设备\n${deviceName} / ${deviceModel}\n\n${paramsStr ? `### 参数\n${paramsStr}\n\n` : ""}${stepsStr ? `### 步骤\n${stepsStr}\n\n` : ""}### 结果\n${results}\n\n### 备注\n${notes}`;
}
