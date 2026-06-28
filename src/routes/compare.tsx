/**
 * AI 治理对比页 — 多模态实验数据展示
 * 从 Supabase 加载真实实验，按文件类型分组展示 原始材料 → AI 结构化 全流程
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight, FileText, FileSpreadsheet, Image as ImageIcon,
  Sparkles, CheckCircle2, GitBranch, Microscope, Layers,
  BarChart3, Atom, Music, Video, Table2, FileArchive,
  Loader2, ExternalLink,
} from "lucide-react";
import { RequireAuth } from "../lib/auth-guard";
import { useLab, type Experiment, type AttachedFile } from "../lib/labStore";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "AI 治理前后对比 – LabNote Agent" },
      { name: "description", content: "真实科研多模态数据：MD/TXT/CSV/PDF/DOCX/XLSX/PNG/JPG/MP4/WAV/M4A 如何被 AI 治理为结构化卡片。" },
    ],
  }),
  component: ComparePage,
});

/** 文件类型 → 图标和颜色 */
function fileStyle(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, { icon: any; color: string; label: string; isBinary: boolean }> = {
    md:    { icon: FileText, color: "text-purple-500 bg-purple-50 border-purple-200", label: "Markdown", isBinary: false },
    txt:   { icon: FileText, color: "text-gray-500 bg-gray-50 border-gray-200", label: "文本", isBinary: false },
    csv:   { icon: Table2, color: "text-green-500 bg-green-50 border-green-200", label: "CSV 数据表", isBinary: false },
    pdf:   { icon: FileArchive, color: "text-red-500 bg-red-50 border-red-200", label: "PDF 文档", isBinary: true },
    docx:  { icon: FileText, color: "text-blue-500 bg-blue-50 border-blue-200", label: "Word 文档", isBinary: true },
    xlsx:  { icon: FileSpreadsheet, color: "text-emerald-500 bg-emerald-50 border-emerald-200", label: "Excel 表格", isBinary: true },
    png:   { icon: ImageIcon, color: "text-amber-500 bg-amber-50 border-amber-200", label: "PNG 图像", isBinary: true },
    jpg:   { icon: ImageIcon, color: "text-orange-500 bg-orange-50 border-orange-200", label: "JPG 图像", isBinary: true },
    jpeg:  { icon: ImageIcon, color: "text-orange-500 bg-orange-50 border-orange-200", label: "JPEG 图像", isBinary: true },
    mp4:   { icon: Video, color: "text-cyan-500 bg-cyan-50 border-cyan-200", label: "MP4 视频", isBinary: true },
    wav:   { icon: Music, color: "text-pink-500 bg-pink-50 border-pink-200", label: "WAV 音频", isBinary: true },
    m4a:   { icon: Music, color: "text-rose-500 bg-rose-50 border-rose-200", label: "M4A 音频", isBinary: true },
  };
  return map[ext] ?? { icon: FileText, color: "text-muted-foreground bg-secondary border-border", label: ext.toUpperCase(), isBinary: true };
}

/** 判断 textContent 是否是有效的文本（非 ZIP 二进制垃圾） */
function isReadableText(af: AttachedFile): boolean {
  const text = af.textContent ?? "";
  if (text.length < 5) return false;
  // DOCX/XLSX 以 PK 开头（ZIP 魔数）
  if (text.startsWith("PK") || text.startsWith("PK")) return false;
  // 包含过多控制字符的是二进制
  let controlChars = 0;
  for (let i = 0; i < Math.min(text.length, 200); i++) {
    const c = text.charCodeAt(i);
    if (c < 9 || (c > 13 && c < 32)) controlChars++;
  }
  return controlChars < 10;
}

/** 渲染文件内容预览 */
function FileContentPreview({ af }: { af: AttachedFile }) {
  const text = af.textContent ?? "";
  const style = fileStyle(af.name);
  const isBinaryDoc = af.name.match(/\.(docx|xlsx|pdf)$/i);

  // 二进制文档 → 结构化占位符
  if (isBinaryDoc) {
    const lines = text.replace(/[^\x20-\x7E一-鿿　-〿＀-￯\n]/g, "").split("\n").filter(Boolean);
    const readable = lines.slice(0, 8);
    return (
      <div className="text-xs space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <FileArchive size={12} />
          <span>二进制文档 — AI 从 ZIP 内 XML 提取结构化数据</span>
        </div>
        {readable.length > 0 ? (
          <div className="bg-secondary/30 rounded-lg p-3 max-h-[160px] overflow-y-auto">
            {readable.map((line, i) => (
              <div key={i} className="font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {line.slice(0, 120)}{line.length > 120 ? "…" : ""}
              </div>
            ))}
          </div>
        ) : (
          <div className="h-12 rounded-lg bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-[10px] text-muted-foreground">
            [{style.label} — ZIP 压缩格式，AI 自动解压提取]
          </div>
        )}
        {af.parsedRaw && (
          <div className="mt-1 text-[10px] text-primary bg-primary-soft/50 rounded px-2 py-1">
            AI 提取: {af.parsedRaw.slice(0, 150)}
          </div>
        )}
      </div>
    );
  }

  // 图片
  if (af.name.match(/\.(png|jpg|jpeg)$/i)) {
    return (
      <div className="space-y-2">
        <div className="h-24 rounded-lg bg-gradient-to-br from-secondary via-secondary/50 to-muted flex items-center justify-center">
          <div className="text-center">
            <ImageIcon size={24} className="mx-auto text-muted-foreground/40" />
            <p className="text-[10px] text-muted-foreground mt-1">{style.label} — 视觉特征由 AI 识别</p>
          </div>
        </div>
        {af.parsedRaw && (
          <div className="text-[10px] text-primary bg-primary-soft/50 rounded px-2 py-1">
            AI 识别: {af.parsedRaw.slice(0, 150)}
          </div>
        )}
      </div>
    );
  }

  // 音频
  if (af.name.match(/\.(wav|m4a|mp3)$/i)) {
    return (
      <div className="space-y-2">
        <div className="h-16 rounded-lg bg-gradient-to-br from-pink-50 to-rose-100 flex items-center justify-center gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-1.5 bg-pink-300 rounded-full" style={{ height: `${12 + Math.sin(i * 1.2) * 18 + Math.random() * 10}px` }} />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center">{style.label} — {af.name}</p>
        {af.parsedRaw && (
          <div className="text-[10px] text-primary bg-primary-soft/50 rounded px-2 py-1">
            AI 转录/分析: {af.parsedRaw.slice(0, 150)}
          </div>
        )}
      </div>
    );
  }

  // 视频
  if (af.name.match(/\.(mp4|mov|avi)$/i)) {
    return (
      <div className="space-y-2">
        <div className="h-20 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center">
          <div className="text-center">
            <Video size={20} className="mx-auto text-cyan-400" />
            <p className="text-[10px] text-muted-foreground mt-1">{style.label} — 帧序列由 AI 分析</p>
          </div>
        </div>
        {af.parsedRaw && (
          <div className="text-[10px] text-primary bg-primary-soft/50 rounded px-2 py-1">
            AI 分析: {af.parsedRaw.slice(0, 150)}
          </div>
        )}
      </div>
    );
  }

  // 文本文件 → 真实内容预览
  return (
    <pre className="text-[11px] leading-relaxed font-mono text-muted-foreground bg-secondary/40 rounded-lg p-3 overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap break-all">
      {text.slice(0, 800)}{text.length > 800 ? "\n…" : ""}
    </pre>
  );
}

/** CSV 内容 → 迷你表格 */
function CSVMiniTable({ text }: { text: string }) {
  const lines = text.trim().split("\n").slice(0, 8);
  if (lines.length < 2) return <FileContentPreview af={{ textContent: text, name: "data.csv", mediaType: "csv", mimeType: "text/csv", size: text.length, addedAt: "", parsedRaw: "", id: "" } as AttachedFile} />;

  const headers = lines[0].split(",").map(h => h.trim());
  const rows = lines.slice(1).map(l => l.split(",").map(c => c.trim()));

  return (
    <div className="overflow-x-auto max-h-[180px] overflow-y-auto rounded-lg border border-border">
      <table className="w-full text-[10px]">
        <thead className="bg-secondary/60 sticky top-0">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-2 py-1.5 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t border-border/50 hover:bg-secondary/20">
              {row.map((cell, ci) => (
                <td key={ci} className="px-2 py-1 font-mono whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparePage() {
  const { experiments } = useLab();
  const navigate = useNavigate();
  const [pairs, setPairs] = useState<Array<{ exp: Experiment; files: AttachedFile[] }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (experiments.length === 0) return;

    // 按文件类型多样性选择实验
    const scored = experiments.map((e) => {
      const seen = new Set<string>();
      const uniq = (e.attachedFiles ?? []).filter((f) => {
        if (seen.has(f.name)) return false;
        seen.add(f.name);
        return true;
      });

      const types = new Set(uniq.map(f => f.name.split(".").pop()?.toLowerCase()));
      let typeScore = types.size * 3;

      // 加分：有不同类别的文件
      if (types.has("wav") || types.has("m4a")) typeScore += 2;
      if (types.has("mp4")) typeScore += 2;
      if (types.has("png") || types.has("jpg")) typeScore += 2;
      if (types.has("docx")) typeScore += 1;
      if (types.has("xlsx")) typeScore += 1;
      if (types.has("csv")) typeScore += 1;

      // 字段完整度
      let fieldScore = 0;
      if (e.name && e.name !== "未命名实验") fieldScore++;
      if (e.discipline) fieldScore++;
      if (e.purpose?.length > 15) fieldScore++;
      if (e.device?.name) fieldScore++;
      if (e.params?.length > 0) fieldScore++;
      if (e.steps?.length > 1) fieldScore++;
      if (e.results?.length > 30) fieldScore++;

      return { exp: e, files: uniq, score: typeScore + fieldScore };
    });

    scored.sort((a, b) => b.score - a.score);

    // 取前 3 个不同类型的实验
    const selected: typeof pairs = [];
    const usedTypes = new Set<string>();
    for (const s of scored) {
      const mainType = s.files[0]?.name.split(".").pop() ?? "other";
      if (!usedTypes.has(mainType) || selected.length < 2) {
        usedTypes.add(mainType);
        selected.push({ exp: s.exp, files: s.files });
      }
      if (selected.length >= 3) break;
    }

    setPairs(selected);
    setLoading(false);
  }, [experiments]);

  if (loading) {
    return (
      <RequireAuth>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">加载实验数据...</span>
        </div>
      </RequireAuth>
    );
  }

  if (pairs.length === 0) {
    return (
      <RequireAuth>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <Microscope size={48} className="mx-auto text-muted-foreground/30" />
          <h2 className="mt-4 text-xl font-bold">暂无实验数据</h2>
          <p className="mt-2 text-sm text-muted-foreground">需要先上传实验数据才能查看 AI 治理对比。</p>
          <button onClick={() => navigate({ to: "/workbench" })}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90">
            前往工作台
          </button>
        </div>
      </RequireAuth>
    );
  }

  // 统计覆盖的文件类型
  const allExts = new Set<string>();
  pairs.forEach(p => p.files.forEach(f => allExts.add(f.name.split(".").pop()?.toLowerCase() ?? "")));

  return (
    <RequireAuth>
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">上传前 vs AI 治理后</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          从 {pairs.reduce((s, p) => s + p.files.length, 0)} 个原始文件到 {pairs.length} 张结构化实验卡片 —
          覆盖 {allExts.size} 种文件格式（{[...allExts].map(e => e.toUpperCase()).join(" · ")}）
        </p>
      </div>

      {pairs.map(({ exp, files }, pairIdx) => {
        const completenessScore = (() => {
          const fields = ["name", "discipline", "operator", "purpose", "device_name", "sample_id", "params", "steps", "results"];
          const filled = fields.filter((f) => {
            const v = (exp as any)[f];
            return v && (Array.isArray(v) ? v.length > 0 : String(v).length > 5);
          }).length;
          return Math.round((filled / fields.length) * 100);
        })();

        return (
          <div key={exp.id} className={pairIdx > 0 ? "mt-16 pt-8 border-t-2 border-border/50" : ""}>
            {/* 实验标题 */}
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {pairIdx + 1}
              </span>
              <div>
                <h2 className="text-lg font-bold">{exp.name}</h2>
                <p className="text-xs text-muted-foreground">{exp.discipline} · {files.length} 个文件</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] items-start">
              {/* ====== 左：原始多模态文件 ====== */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Layers size={14} /> 原始材料
                </div>

                {files.map((f) => {
                  const style = fileStyle(f.name);
                  const Icon = style.icon;
                  const isBinaryDoc = f.name.match(/\.(docx|xlsx|pdf)$/i);
                  const isCSV = f.name.endsWith(".csv");
                  const isImage = f.name.match(/\.(png|jpg|jpeg)$/i);
                  const isAudio = f.name.match(/\.(wav|m4a|mp3)$/i);
                  const isVideo = f.name.match(/\.(mp4|mov|avi)$/i);

                  return (
                    <div key={f.id} className={`card-soft border-l-4 ${style.color.split(" ").slice(1, 3).join(" ")} p-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-sm font-medium min-w-0">
                          <Icon size={14} className={style.color.split(" ")[0]} />
                          <span className="truncate">{f.name}</span>
                        </div>
                        <span className="text-[10px] rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground shrink-0 ml-2">
                          {style.label} · {(f.size / 1024).toFixed(1)}KB
                        </span>
                      </div>

                      {/* 按文件类型渲染 */}
                      {isCSV && isReadableText(f) && <CSVMiniTable text={f.textContent ?? ""} />}
                      {isCSV && !isReadableText(f) && <FileContentPreview af={f} />}
                      {!isCSV && <FileContentPreview af={f} />}
                    </div>
                  );
                })}
              </div>

              {/* ====== 中：AI 管道 ====== */}
              <div className="hidden lg:flex flex-col items-center justify-center pt-16 gap-4 px-4">
                <div className="brand-gradient h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
                  <Sparkles size={22} />
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-primary">AI 自动治理</div>
                  <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                    <div>· 多模态解析</div>
                    <div>· 字段提取</div>
                    <div>· 术语规整</div>
                    <div>· 去重合并</div>
                  </div>
                </div>
                <ArrowRight size={28} className="text-primary mt-3" />
                <div className="p-3 rounded-xl bg-primary-soft/50 border border-primary/20 text-center mt-2">
                  <div className="text-2xl font-bold text-primary">{completenessScore}%</div>
                  <div className="text-[10px] text-muted-foreground">字段完成度</div>
                </div>
              </div>

              {/* Mobile */}
              <div className="lg:hidden flex items-center justify-center gap-2 text-primary text-sm font-semibold py-3">
                <Sparkles size={16} /> AI 自动治理 ({completenessScore}%) <ArrowRight size={16} />
              </div>

              {/* ====== 右：结构化卡片 ====== */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={14} /> AI 治理后 · 实验卡片
                </div>

                <div className="card-soft p-5 border-primary/30 bg-primary-soft/30">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">{exp.name}</h3>
                    <span className="text-[10px] rounded-md bg-primary text-primary-foreground px-2 py-0.5">结构化</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="px-1.5 py-0.5 rounded bg-secondary">{exp.discipline || "—"}</span>
                    <span>来源: {exp.source || "AI 解析"}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs">
                    <KV k="样品编号" v={exp.sample?.id || "—"} />
                    <KV k="批次" v={exp.sample?.batch || "—"} />
                    <KV k="设备" v={exp.device?.name || "—"} />
                    <KV k="型号" v={exp.device?.model || "—"} />
                    <KV k="操作人员" v={exp.operator || "—"} />
                    <KV k="实验时间" v={exp.date?.slice(0, 16)?.replace("T", " ") || "—"} />
                  </div>
                  {exp.purpose && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="text-[10px] text-muted-foreground mb-1">实验目的</div>
                      <p className="text-xs">{exp.purpose}</p>
                    </div>
                  )}
                </div>

                {exp.params?.length > 0 && (
                  <div className="card-soft p-5">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5"><BarChart3 size={14} className="text-primary" /> 实验参数</h4>
                    <table className="mt-2 w-full text-xs">
                      <thead className="text-muted-foreground border-b border-border">
                        <tr><th className="text-left py-1.5 font-medium">参数</th><th className="text-left font-medium">值</th><th className="text-left font-medium">单位</th></tr>
                      </thead>
                      <tbody>
                        {exp.params.filter((p: any) => p?.name).map((p: any, i: number) => (
                          <tr key={i} className="border-t border-border/50">
                            <td className="py-1.5">{p.name}</td>
                            <td className="font-mono">{p.value || "—"}</td>
                            <td className="text-muted-foreground">{p.unit || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {exp.steps?.length > 0 && (
                  <div className="card-soft p-5">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5"><Atom size={14} className="text-primary" /> 实验步骤</h4>
                    <ol className="mt-2 space-y-1 text-xs list-decimal pl-5 text-muted-foreground">
                      {exp.steps.map((s: string, i: number) => <li key={i} className="pl-1">{s}</li>)}
                    </ol>
                  </div>
                )}

                {exp.results && (
                  <div className="card-soft p-5">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5"><Microscope size={14} className="text-primary" /> 实验结果</h4>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{exp.results}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 文件→字段映射 */}
            <div className="mt-6">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
                <ExternalLink size={12} /> 文件 → 字段映射追踪
              </h4>
              <div className="flex flex-wrap gap-2">
                {files.map((f) => {
                  const contributions: string[] = [];
                  const text = f.textContent ?? "";
                  const parsed = f.parsedRaw ?? "";
                  if (text.includes("SEM") || text.includes("JEOL") || parsed.includes("JEOL")) contributions.push("设备");
                  if (text.includes("样品") || text.includes("Sample") || text.includes("DION") || text.includes("AuNP")) contributions.push("样品");
                  if (text.includes("nm") || text.includes("kV") || text.includes("℃") || text.includes("Hz") || text.includes("μV")) contributions.push("参数");
                  if (text.includes("步骤") || text.includes("Step") || text.includes("Procedure") || text.includes("Protocol")) contributions.push("步骤");
                  if (text.includes("结果") || text.includes("Result") || text.includes("Conclusion")) contributions.push("结果");
                  if (text.includes("XRD") || text.includes("UV-Vis") || text.includes("SEM") || text.includes("TEM")) contributions.push("分析方法");
                  if (text.includes("Dr.") || text.includes("操作人") || text.includes("Operator")) contributions.push("操作人");
                  if (contributions.length === 0) contributions.push("上下文");
                  return (
                    <div key={f.id} className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full bg-secondary/50 border border-border/50">
                      <span className="text-muted-foreground">{f.name.slice(0, 20)}</span>
                      {contributions.map((c, i) => (
                        <span key={i} className="text-primary">→{c}</span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
    </RequireAuth>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right truncate">{v}</span>
    </>
  );
}
