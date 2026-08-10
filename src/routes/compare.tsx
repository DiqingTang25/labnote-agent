import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, FileText, FileSpreadsheet, Layers, Loader2, Microscope, Sparkles } from "lucide-react";
import { RequireAuth } from "../lib/auth-guard";
import { useLab, type AttachedFile, type ExperimentDoc } from "../lib/labStore";
import { getProperty, getString } from "../lib/property-utils";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "AI 治理前后对比 – LabNote Agent" }] }),
  component: ComparePage,
});

type Parameter = { name: string; value?: string | number; unit?: string };

function getParameters(experiment: ExperimentDoc): Parameter[] {
  const value = getProperty(experiment.properties, "params");
  return Array.isArray(value)
    ? value.filter((item): item is Parameter => item !== null && typeof item === "object" && !Array.isArray(item) && typeof item.name === "string")
    : [];
}

function getSteps(experiment: ExperimentDoc): string[] {
  const value = getProperty(experiment.properties, "steps");
  return Array.isArray(value) ? value.filter((step): step is string => typeof step === "string") : [];
}

function selectBestExperiment(experiments: ExperimentDoc[]): ExperimentDoc | null {
  return experiments.reduce<ExperimentDoc | null>((best, experiment) => {
    const score = Number(Boolean(getString(experiment.properties, "purpose")))
      + Number(Boolean(getString(experiment.properties, "results")))
      + Number(Boolean(getString(experiment.properties, "device.name")))
      + Number(Boolean(getString(experiment.properties, "sample.id")))
      + getParameters(experiment).length
      + getSteps(experiment).length
      + experiment.attachedFiles.length;
    const bestScore = best
      ? Number(Boolean(getString(best.properties, "purpose"))) + Number(Boolean(getString(best.properties, "results"))) + getParameters(best).length + getSteps(best).length + best.attachedFiles.length
      : -1;
    return score > bestScore ? experiment : best;
  }, null);
}

function ComparePage() {
  const { experiments } = useLab();
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState<ExperimentDoc | null>(null);

  useEffect(() => setExperiment(selectBestExperiment(experiments)), [experiments]);

  if (!experiment) {
    return <RequireAuth><div className="mx-auto max-w-3xl px-4 py-20 text-center"><Microscope size={48} className="mx-auto text-muted-foreground/30"/><h2 className="mt-4 text-xl font-bold">暂无实验数据</h2><p className="mt-2 text-sm text-muted-foreground">需要先上传实验数据。</p><button onClick={() => navigate({ to: "/workbench" })} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">前往工作台</button></div></RequireAuth>;
  }

  const files = uniqueFiles(experiment.attachedFiles);
  const purpose = getString(experiment.properties, "purpose");
  const background = getString(experiment.properties, "background");
  const results = getString(experiment.properties, "results");
  const notes = getString(experiment.properties, "notes");
  const parameters = getParameters(experiment);
  const steps = getSteps(experiment);
  const fields = [
    ["名称", experiment.name !== "未命名实验"], ["学科", Boolean(getString(experiment.properties, "discipline"))], ["操作人", Boolean(experiment.operator)],
    ["目的", purpose.length > 15], ["设备", Boolean(getString(experiment.properties, "device.name"))], ["样品", Boolean(getString(experiment.properties, "sample.id"))],
    ["参数", parameters.length > 0], ["步骤", steps.length > 0], ["结果", results.length > 30], ["AI 洞察", Boolean(experiment.aiInsights)],
  ] as const;
  const filled = fields.filter(([, complete]) => complete).length;
  const coverage = Math.round((filled / fields.length) * 100);

  return <RequireAuth><div className="mx-auto max-w-7xl px-4 py-10">
    <h1 className="text-2xl md:text-3xl font-bold">上传前 vs AI 治理后</h1><p className="mt-2 text-sm text-muted-foreground">从 {files.length} 个原始文件到动态结构化实验卡片</p>
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto_1fr] items-start">
      <section className="space-y-3"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Layers size={14}/> 原始文件 · {files.length} 个</div>{files.map((file) => <FileCard key={file.id} file={file}/>)}</section>
      <div className="hidden lg:flex flex-col items-center justify-center pt-16 gap-4 px-4"><div className="brand-gradient h-14 w-14 rounded-2xl flex items-center justify-center text-white"><Sparkles size={22}/></div><div className="text-center text-sm font-bold text-primary">AI 自动治理</div><ArrowRight size={28} className="text-primary"/><div className="p-3 rounded-xl bg-primary-soft/50 border border-primary/20 text-center"><div className="text-2xl font-bold text-primary">{coverage}%</div><div className="text-[10px] text-muted-foreground">字段覆盖</div></div></div>
      <section className="space-y-3"><div className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2"><CheckCircle2 size={14}/> AI 治理后 · 实验卡片</div><div className="card-soft p-5 border-primary/30 bg-primary-soft/30"><h3 className="font-semibold text-base">{experiment.name}</h3><p className="mt-1 text-xs text-muted-foreground">{getString(experiment.properties, "discipline") || "未分类"} · {getString(experiment.properties, "source") || "AI 解析"}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><KV label="样品编号" value={getString(experiment.properties, "sample.id")}/><KV label="设备" value={getString(experiment.properties, "device.name")}/><KV label="型号" value={getString(experiment.properties, "device.model")}/><KV label="操作人" value={experiment.operator}/></div></div>{purpose && <TextSection title="实验目的" value={purpose}/>} {background && <TextSection title="实验背景" value={background}/>} {parameters.length > 0 && <div className="card-soft p-4"><h4 className="text-sm font-semibold mb-2">实验参数</h4>{parameters.map((parameter, index) => <p key={`${parameter.name}-${index}`} className="text-xs text-muted-foreground">{parameter.name}: {parameter.value ?? "—"} {parameter.unit ?? ""}</p>)}</div>} {steps.length > 0 && <div className="card-soft p-4"><h4 className="text-sm font-semibold mb-2">实验步骤</h4><ol className="list-decimal pl-5 text-xs text-muted-foreground">{steps.map((step, index) => <li key={index}>{step}</li>)}</ol></div>} {results && <TextSection title="实验结果" value={results}/>} {notes && <TextSection title="备注" value={notes}/>} {experiment.aiInsights && <TextSection title="AI 洞察" value={experiment.aiInsights}/>}<div className="card-soft p-4"><h4 className="text-xs font-semibold text-muted-foreground mb-2">字段覆盖度 ({filled}/{fields.length})</h4><div className="flex flex-wrap gap-1">{fields.map(([label, complete]) => <span key={label} className={`text-[10px] px-1.5 py-0.5 rounded-full ${complete ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-500"}`}>{complete ? "✓" : "✗"} {label}</span>)}</div></div></section>
    </div>
  </div></RequireAuth>;
}

function uniqueFiles(files: AttachedFile[]): AttachedFile[] { const seen = new Set<string>(); return files.filter((file) => !seen.has(file.name) && (seen.add(file.name), true)); }
function FileCard({ file }: { file: AttachedFile }) { const text = file.textContent; return <div className="card-soft p-4"><div className="flex gap-2 text-sm font-medium">{file.name.endsWith(".csv") ? <FileSpreadsheet size={14}/> : <FileText size={14}/>} {file.name}</div><div className="mt-2 text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>{text ? <pre className="mt-2 max-h-40 overflow-auto text-[11px] text-muted-foreground whitespace-pre-wrap">{text.slice(0, 800)}</pre> : file.parsedRaw ? <p className="mt-2 text-[11px] text-muted-foreground">{file.parsedRaw.slice(0, 300)}</p> : null}</div>; }
function KV({ label, value }: { label: string; value: string }) { return <><span className="text-muted-foreground">{label}</span><span className="font-medium text-right truncate">{value || "—"}</span></>; }
function TextSection({ title, value }: { title: string; value: string }) { return <div className="card-soft p-4"><h4 className="text-sm font-semibold mb-1">{title}</h4><p className="text-xs text-muted-foreground leading-relaxed">{value}</p></div>; }
