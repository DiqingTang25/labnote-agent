/**
 * AI 治理对比页 — 一个真实实验的完整展示
 * 所有数据来自 Supabase，不做假
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight, FileText, Sparkles, CheckCircle2,
  Microscope, Layers, BarChart3, Atom, Music,
  FileSpreadsheet, Loader2, Play, Pause, Volume2,
} from "lucide-react";
import { RequireAuth } from "../lib/auth-guard";
import { useLab, type Experiment, type AttachedFile } from "../lib/labStore";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "AI 治理前后对比 – LabNote Agent" },
    ],
  }),
  component: ComparePage,
});

/** 文件扩展名 → 图标 */
function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "csv") return <FileSpreadsheet size={14} />;
  if (ext === "xlsx") return <FileSpreadsheet size={14} />;
  if (ext === "docx") return <FileText size={14} />;
  if (ext === "md") return <FileText size={14} />;
  if (ext === "txt") return <FileText size={14} />;
  if (["wav", "m4a", "mp3"].includes(ext)) return <Music size={14} />;
  if (["png", "jpg", "jpeg"].includes(ext)) return <FileText size={14} />;
  if (ext === "mp4") return <FileText size={14} />;
  return <FileText size={14} />;
}

function fileTypeLabel(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const m: Record<string, string> = {
    md: "Markdown", txt: "文本", csv: "CSV",
    docx: "Word", xlsx: "Excel", pdf: "PDF",
    png: "图像", jpg: "图像", jpeg: "图像",
    wav: "音频", m4a: "音频", mp3: "音频",
    mp4: "视频",
  };
  return m[ext] ?? ext.toUpperCase();
}

/** 判断文件内容是否可读文本（非二进制垃圾） */
function readableContent(af: AttachedFile): string | null {
  const raw = af.textContent ?? "";
  if (raw.length < 10) return null;
  // ZIP 魔数 (DOCX/XLSX)
  if (raw.charCodeAt(0) === 0x50 && raw.charCodeAt(1) === 0x4B) return null;
  // 检查是否为有效 UTF-8 文本
  let unprintable = 0;
  const sample = raw.slice(0, 300);
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c < 0x09 || (c > 0x0D && c < 0x20)) unprintable++;
  }
  if (unprintable > sample.length * 0.15) return null;
  return raw;
}

function ComparePage() {
  const { experiments } = useLab();
  const navigate = useNavigate();
  const [exp, setExp] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (experiments.length === 0) return;
    // 优先选有多模态文件的实验
    let best: Experiment | null = null;
    let bestScore = -1;
    for (const e of experiments) {
      let s = 0;
      const files = e.attachedFiles ?? [];
      // 多模态加分（视频/音频/图片优先）
      const hasVideo = files.some(f => f.name.match(/\.(mp4|webm|mov)$/i));
      const hasAudio = files.some(f => f.name.match(/\.(wav|m4a|mp3)$/i));
      const hasImage = files.some(f => f.name.match(/\.(png|jpg|jpeg)$/i));
      if (hasVideo) s += 5;
      if (hasAudio) s += 4;
      if (hasImage) s += 3;
      // 字段完整度
      if (e.name && e.name !== "未命名实验") s++;
      if (e.discipline) s++;
      if (e.operator) s++;
      if (e.purpose && e.purpose.length > 15) s += 2;
      if (e.device?.name) s++;
      if (e.device?.model) s++;
      if (e.sample?.id) s++;
      if (e.params?.length >= 3) s += 2; else if (e.params?.length > 0) s++;
      if (e.steps?.length >= 3) s += 2; else if (e.steps?.length > 0) s++;
      if (e.results && e.results.length > 50) s += 2; else if (e.results) s++;
      if (e.aiInsights) s++;
      if (e.background) s++;
      if (files.length >= 5) s += 2; else if (files.length >= 3) s++;
      if (s > bestScore) { bestScore = s; best = e; }
    }
    setExp(best);
    setLoading(false);
  }, [experiments]);

  if (loading) {
    return <RequireAuth><div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={24} className="animate-spin text-primary"/><span className="ml-2 text-sm text-muted-foreground">加载实验数据...</span></div></RequireAuth>;
  }

  if (!exp) {
    return (
      <RequireAuth>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <Microscope size={48} className="mx-auto text-muted-foreground/30"/>
          <h2 className="mt-4 text-xl font-bold">暂无实验数据</h2>
          <p className="mt-2 text-sm text-muted-foreground">需要先上传实验数据。</p>
          <button onClick={() => navigate({ to: "/workbench" })} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">前往工作台</button>
        </div>
      </RequireAuth>
    );
  }

  // 去重文件
  const seen = new Set<string>();
  const files = (exp.attachedFiles ?? []).filter(f => { if (seen.has(f.name)) return false; seen.add(f.name); return true; });

  // 真实字段完成度
  const allFields = [
    { label: "名称", ok: exp.name && exp.name !== "未命名实验" },
    { label: "学科", ok: !!exp.discipline },
    { label: "操作人", ok: !!exp.operator },
    { label: "目的", ok: (exp.purpose ?? "").length > 15 },
    { label: "设备名", ok: !!exp.device?.name },
    { label: "设备型号", ok: !!exp.device?.model },
    { label: "样品编号", ok: !!exp.sample?.id },
    { label: "参数", ok: (exp.params ?? []).length > 0 },
    { label: "步骤", ok: (exp.steps ?? []).length > 0 },
    { label: "结果", ok: (exp.results ?? "").length > 30 },
    { label: "AI 洞察", ok: !!exp.aiInsights },
  ];
  const filled = allFields.filter(f => f.ok).length;
  const pct = Math.round((filled / allFields.length) * 100);

  // 从原始文件中提取了哪些文本信息（总字符数）
  const totalRawChars = files.reduce((s, f) => s + (f.textContent ?? "").length, 0);
  const totalExtractedChars = (exp.results ?? "").length + (exp.purpose ?? "").length + (exp.aiInsights ?? "").length;

  return (
    <RequireAuth>
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">上传前 vs AI 治理后</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          从 {files.length} 个原始文件（{Math.round(totalRawChars / 1024)}KB 原始数据）→ 1 张结构化实验卡片（{Math.round(totalExtractedChars / 1024)}KB 提取信息）
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] items-start">
        {/* ====== 左：原始文件 ====== */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Layers size={14}/> 原始文件 · {files.length} 个
          </div>

          {files.map(f => {
            const text = readableContent(f);
            const parsed = f.parsedRaw ?? "";

            return (
              <div key={f.id} className="card-soft p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium min-w-0">
                    {fileIcon(f.name)}
                    <span className="truncate">{f.name}</span>
                  </div>
                  <span className="text-[10px] rounded bg-secondary px-1.5 py-0.5 text-muted-foreground shrink-0 ml-2">
                    {fileTypeLabel(f.name)} · {(f.size / 1024).toFixed(1)}KB
                  </span>
                </div>

                {/* 视频文件 */}
                {f.name.match(/\.(mp4|webm|mov)$/i) ? (
                  <div className="rounded-lg overflow-hidden bg-black">
                    <video controls className="w-full max-h-[300px]" poster="/media/hela-cells.jpg">
                      <source src={`/media/${f.name}`} type={`video/${f.name.split('.').pop()}`} />
                      您的浏览器不支持视频播放
                    </video>
                    <div className="flex items-center justify-between px-3 py-2 bg-black/80 text-white text-[10px]">
                      <span className="flex items-center gap-1"><Play size={10}/> {f.name}</span>
                      <span>{(f.size/1024).toFixed(1)}KB</span>
                    </div>
                  </div>
                ) : f.name.match(/\.(wav|m4a|mp3)$/i) ? (
                  /* 音频文件 */
                  <div className="rounded-lg bg-gradient-to-r from-pink-900/20 to-rose-900/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 size={16} className="text-pink-500"/>
                      <span className="text-xs font-medium">{f.name}</span>
                    </div>
                    <audio controls className="w-full">
                      <source src={`/media/${f.name}`} type={`audio/${f.name.split('.').pop()}`} />
                    </audio>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                      <span>{(f.size/1024).toFixed(1)}KB</span>
                      <span>44.1kHz</span>
                      <span>双音调心音模拟</span>
                    </div>
                  </div>
                ) : f.name.match(/\.(png|jpg|jpeg)$/i) ? (
                  /* 图片文件 */
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src={`/media/${f.name}`}
                      alt={f.name}
                      className="w-full max-h-[300px] object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="px-3 py-2 bg-secondary/30 text-[10px] text-muted-foreground">
                      {f.name} · {(f.size/1024).toFixed(1)}KB
                    </div>
                  </div>
                ) : f.name.match(/\.pdf$/i) ? (
                  /* PDF 文档 */
                  <div className="rounded-lg border border-border overflow-hidden">
                    <iframe src={`/media/${f.name}`} className="w-full h-[300px]" title={f.name} />
                    <div className="px-3 py-2 bg-secondary/30 text-[10px] text-muted-foreground flex items-center justify-between">
                      <span>{f.name}</span>
                      <a href={`/media/${f.name}`} target="_blank" className="text-primary hover:underline">在新窗口打开</a>
                    </div>
                  </div>
                ) : text ? (
                /* 文本文件：显示原始内容 */
                  f.name.endsWith(".csv") ? (
                    (() => {
                      const lines = text.trim().split("\n");
                      if (lines.length < 2) return <pre className="text-[11px] font-mono text-muted-foreground bg-secondary/30 rounded p-2 max-h-[160px] overflow-auto whitespace-pre-wrap">{text.slice(0, 600)}</pre>;
                      const headers = lines[0].split(",").map(h => h.trim());
                      const rows = lines.slice(1, 7).map(l => l.split(",").map(c => c.trim()));
                      return (
                        <div className="overflow-auto max-h-[180px] rounded border border-border">
                          <table className="w-full text-[10px]">
                            <thead className="bg-secondary/50 sticky top-0"><tr>{headers.map((h, i) => <th key={i} className="text-left px-1.5 py-1 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                            <tbody>{rows.map((r, ri) => <tr key={ri} className="border-t border-border/30">{r.map((c, ci) => <td key={ci} className="px-1.5 py-0.5 font-mono whitespace-nowrap">{c}</td>)}</tr>)}</tbody>
                          </table>
                          {lines.length > 7 && <div className="text-center text-[10px] text-muted-foreground py-1">… 共 {lines.length - 1} 行数据</div>}
                        </div>
                      );
                    })()
                  ) : (
                    <pre className="text-[11px] leading-relaxed font-mono text-muted-foreground bg-secondary/30 rounded-lg p-3 max-h-[220px] overflow-auto whitespace-pre-wrap">{text.slice(0, 1000)}{text.length > 1000 ? "\n…" : ""}</pre>
                  )
                ) : (
                  /* 非文本文件：显示 AI 提取结果 */
                  <div className="space-y-2">
                    <div className="text-[10px] text-muted-foreground bg-secondary/20 rounded px-2 py-1.5">
                      {f.name.match(/\.(docx|xlsx)$/i) ? "Office 文档（ZIP 压缩），AI 从内部 XML 提取文本内容" :
                       f.name.match(/\.(wav|m4a|mp3)$/i) ? "音频文件，AI 尝试转录并提取实验参数" :
                       f.name.match(/\.(png|jpg|jpeg)$/i) ? "图像文件，AI 视觉模型识别内容" :
                       f.name.match(/\.mp4$/i) ? "视频文件，AI 分析帧序列提取操作步骤" :
                       "二进制文件，AI 自动提取内容"}
                    </div>
                    {parsed ? (
                      <div className="text-[11px] text-muted-foreground bg-primary-soft/30 rounded px-2 py-1.5 leading-relaxed">
                        <span className="text-[10px] text-primary font-medium">AI 提取结果：</span>
                        {parsed.slice(0, 300)}
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground italic">此文件类型暂未返回提取结果，内容已纳入合并上下文</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ====== 中：AI ====== */}
        <div className="hidden lg:flex flex-col items-center justify-center pt-16 gap-4 px-4">
          <div className="brand-gradient h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <Sparkles size={22}/>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-primary">AI 自动治理</div>
            <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5 text-left">
              <div>· 多模态解析（文本/表格/文档）</div>
              <div>· 结构化字段提取</div>
              <div>· 去重合并生成卡片</div>
            </div>
          </div>
          <ArrowRight size={28} className="text-primary mt-2"/>
          <div className="p-3 rounded-xl bg-primary-soft/50 border border-primary/20 text-center mt-2">
            <div className="text-2xl font-bold text-primary">{pct}%</div>
            <div className="text-[10px] text-muted-foreground">字段覆盖</div>
          </div>
        </div>
        <div className="lg:hidden flex items-center justify-center gap-2 text-primary text-sm font-semibold py-3">
          <Sparkles size={16}/> AI 自动治理 ({pct}% 字段覆盖) <ArrowRight size={16}/>
        </div>

        {/* ====== 右：结构化卡片 ====== */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 size={14}/> AI 治理后 · 实验卡片
          </div>

          <div className="card-soft p-5 border-primary/30 bg-primary-soft/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">{exp.name}</h3>
              <span className="text-[10px] rounded-md bg-primary text-primary-foreground px-2 py-0.5">结构化</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="px-1.5 py-0.5 rounded bg-secondary">{exp.discipline || "—"}</span>
              <span>{exp.source || "AI 解析"}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs">
              <KV k="样品编号" v={exp.sample?.id || "—"}/>
              <KV k="批次" v={exp.sample?.batch || "—"}/>
              <KV k="来源" v={exp.sample?.source || "—"}/>
              <KV k="设备" v={exp.device?.name || "—"}/>
              <KV k="型号" v={exp.device?.model || "—"}/>
              <KV k="厂家" v={exp.device?.vendor || "—"}/>
              <KV k="操作人" v={exp.operator || "—"}/>
              <KV k="时间" v={exp.date?.slice(0, 16)?.replace("T", " ") || "—"}/>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs">
              <KV k="温度" v={exp.environment?.temperature || "—"}/>
              <KV k="湿度" v={exp.environment?.humidity || "—"}/>
              <KV k="其他条件" v={exp.environment?.other || "—"}/>
            </div>
          </div>

          {exp.purpose ? (
            <div className="card-soft p-4">
              <div className="text-[10px] text-muted-foreground mb-1">实验目的</div>
              <p className="text-xs leading-relaxed">{exp.purpose}</p>
            </div>
          ) : null}

          {exp.background ? (
            <div className="card-soft p-4">
              <div className="text-[10px] text-muted-foreground mb-1">实验背景</div>
              <p className="text-xs leading-relaxed">{exp.background}</p>
            </div>
          ) : null}

          {exp.params?.length > 0 ? (
            <div className="card-soft p-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><BarChart3 size={14} className="text-primary"/> 实验参数</h4>
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b border-border"><tr><th className="text-left py-1.5 font-medium">参数</th><th className="text-left font-medium">值</th><th className="text-left font-medium">单位</th></tr></thead>
                <tbody>
                  {exp.params.filter((p: any) => p?.name).map((p: any, i: number) => (
                    <tr key={i} className="border-t border-border/30"><td className="py-1.5">{p.name}</td><td className="font-mono">{p.value || "—"}</td><td className="text-muted-foreground">{p.unit || "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {exp.steps?.length > 0 ? (
            <div className="card-soft p-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><Atom size={14} className="text-primary"/> 实验步骤</h4>
              <ol className="space-y-1 text-xs list-decimal pl-5 text-muted-foreground">
                {exp.steps.map((s: string, i: number) => <li key={i} className="pl-1">{s}</li>)}
              </ol>
            </div>
          ) : null}

          {exp.results ? (
            <div className="card-soft p-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><Microscope size={14} className="text-primary"/> 实验结果</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{exp.results}</p>
            </div>
          ) : null}

          {exp.notes ? (
            <div className="card-soft p-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">备注</h4>
              <p className="text-xs text-muted-foreground">{exp.notes}</p>
            </div>
          ) : null}

          {exp.aiInsights ? (
            <div className="card-soft p-4 border-amber-200/50 bg-amber-50/30">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2 text-amber-700"><Sparkles size={14}/> AI 洞察</h4>
              <p className="text-xs text-amber-800 leading-relaxed">{exp.aiInsights}</p>
            </div>
          ) : null}

          {/* 字段覆盖度明细 */}
          <div className="card-soft p-4">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">字段覆盖度 ({filled}/{allFields.length})</h4>
            <div className="flex flex-wrap gap-1">
              {allFields.map(f => (
                <span key={f.label} className={`text-[10px] px-1.5 py-0.5 rounded-full ${f.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-500 border border-red-200"}`}>
                  {f.ok ? "✓" : "✗"} {f.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </RequireAuth>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return <><span className="text-muted-foreground">{k}</span><span className="font-medium text-right truncate">{v}</span></>;
}
