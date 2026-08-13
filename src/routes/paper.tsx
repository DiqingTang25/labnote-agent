/**
 * 论文辅助页：实验记录 → AI 整理 → Methods 草稿 → 导出
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useLab, generateMethods } from "../lib/labStore";
import { getString } from "../lib/property-utils";
import { FileText, Sparkles, Download, ArrowRight, CheckCircle2, BookOpen, Edit3, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "../lib/auth-guard";

export const Route = createFileRoute("/paper")({
  head: () => ({
    meta: [
      { title: "论文辅助 – LabNote Agent" },
      { name: "description", content: "实验记录 → AI 整理 → Methods 初稿 → 人工确认 → 导出 Word。" },
    ],
  }),
  component: PaperPage,
});

function PaperPage() {
  const { experiments } = useLab();
  const [picked, setPicked] = useState<Set<string>>(new Set(experiments.slice(0,2).map(e=>e.id)));
  const [draft, setDraft] = useState("");
  const [step, setStep] = useState<0|1|2|3|4>(0);

  const selected = experiments.filter(e=>picked.has(e.id));

  const generate = () => {
    setStep(1);
    setTimeout(()=>{
      setStep(2);
      const text = "## Methods\n\n" + selected.map((e,i)=>`### ${i+1}. ${e.name}\n${generateMethods(e)}`).join("\n\n");
      setDraft(text);
      setStep(3);
      toast.success("Methods 初稿已生成");
    }, 1100);
  };

  const exportWord = () => {
    setStep(4);
    const blob = new Blob([draft], { type: "application/msword" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "Methods.doc"; a.click();
    toast.success("已导出 Word");
  };

  const toggle = (id: string) => {
    const next = new Set(picked);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
  };

  return (
    <RequireAuth>
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white"><BookOpen size={20}/></div>
        <div>
          <h1 className="text-2xl font-bold">论文辅助</h1>
          <p className="text-sm text-muted-foreground">AI 整理实验记录，生成 Methods 初稿</p>
        </div>
      </div>

      {/* 流程指示 */}
      <div className="card-soft p-4 mb-6">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {[
            {l:"实验记录", i:<FileText size={14}/>},
            {l:"AI 整理", i:<Sparkles size={14}/>},
            {l:"Methods 初稿", i:<Edit3 size={14}/>},
            {l:"人工确认", i:<CheckCircle2 size={14}/>},
            {l:"导出 Word", i:<Download size={14}/>},
          ].map((s, i)=>(
            <div key={s.l} className="flex items-center gap-2 flex-shrink-0">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                step>=i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>{s.i}{s.l}</div>
              {i<4 && <ArrowRight size={14} className="text-muted-foreground"/>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        {/* 左：选实验 */}
        <div className="card-soft p-5">
          <h3 className="text-sm font-semibold mb-3">① 选择要纳入论文的实验</h3>
          <ul className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {experiments.map(e=>(
              <li key={e.id}>
                <label className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition ${
                  picked.has(e.id) ? "border-primary bg-primary-soft/40" : "border-border hover:border-primary/30"
                }`}>
                  <input type="checkbox" checked={picked.has(e.id)} onChange={()=>toggle(e.id)}
                    className="mt-0.5 accent-[color:var(--color-primary)]"/>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{e.date} · {getString(e.properties, "device.name") || "—"} · {getString(e.properties, "sample.id") || "无样品"}</div>
                  </div>
                </label>
              </li>
            ))}
          </ul>
          <button onClick={generate} disabled={!selected.length}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <Sparkles size={14}/> AI 生成 Methods 初稿（已选 {selected.length}）
          </button>
        </div>

        {/* 右：草稿编辑 */}
        <div className="card-soft p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">② Methods 初稿（可编辑确认）</h3>
            <button onClick={exportWord} disabled={!draft}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:border-primary/40 disabled:opacity-50">
              <Download size={12}/> 导出 Word
            </button>
          </div>
          {step===1 ? (
            <div className="flex flex-col items-center justify-center py-16 text-primary">
              <Sparkles size={28} className="animate-pulse"/>
              <p className="mt-3 text-sm">AI 正在整理 {selected.length} 条实验记录…</p>
            </div>
          ) : (
            <textarea value={draft} onChange={(e)=>setDraft(e.target.value)} placeholder="点击左侧『AI 生成』按钮，自动整理实验记录为 Methods 初稿…"
              className="w-full min-h-[420px] rounded-lg border border-border bg-background p-4 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"/>
          )}
          <div className="mt-4 rounded-lg bg-[color:var(--color-warning)]/10 border border-[color:var(--color-warning)]/30 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-[color:var(--color-warning)] inline-flex items-center gap-1"><AlertTriangle size={13} /> 科研规范提示：</span>
            AI 仅辅助整理实验方法学描述，不替代科研结论。请研究者在投稿前对内容做严谨核对与署名确认。
          </div>
        </div>
      </div>
    </div>
    </RequireAuth>
  );
}
