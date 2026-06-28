/**
 * AI 治理对比页 — 真实实验数据展示
 * 从 Supabase 加载最完整的实验，展示 原始文件 → AI 治理 → 结构化卡片 全流程
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight, FileText, FileSpreadsheet, Image as ImageIcon,
  Sparkles, CheckCircle2, GitBranch, Microscope, Layers,
  BarChart3, Atom, Beaker, Cpu, ExternalLink, Loader2,
} from "lucide-react";
import { RequireAuth } from "../lib/auth-guard";
import { useLab, type Experiment } from "../lib/labStore";
import { fetchExperimentRelations, RELATION_LABELS, type ExperimentRelation } from "../lib/supabase";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "AI 治理前后对比 – LabNote Agent" },
      { name: "description", content: "真实科研数据：多模态文件如何被 AI Agent 一步治理为结构化实验卡片。" },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { experiments } = useLab();
  const navigate = useNavigate();
  const [exp, setExp] = useState<Experiment | null>(null);
  const [relations, setRelations] = useState<ExperimentRelation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 找最完整的实验：字段最多的那个
    if (experiments.length === 0) return;

    const scored = experiments.map((e) => {
      let s = 0;
      if (e.name && e.name !== "未命名实验") s += 1;
      if (e.discipline) s += 1;
      if (e.operator) s += 1;
      if (e.purpose && e.purpose.length > 20) s += 1;
      if (e.device?.name) s += 1;
      if (e.sample?.id) s += 1;
      if (e.params?.length > 0) s += 1;
      if (e.steps?.length > 2) s += 1;
      if (e.results?.length > 50) s += 1;
      if (e.attachedFiles?.length > 1) s += 1;
      if (e.aiInsights) s += 1;
      return { exp: e, score: s };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0]?.exp ?? null;
    setExp(best);
    setLoading(false);

    if (best) {
      fetchExperimentRelations(best.id).then(setRelations).catch(() => setRelations([]));
    }
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

  if (!exp) {
    return (
      <RequireAuth>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <Microscope size={48} className="mx-auto text-muted-foreground/30" />
          <h2 className="mt-4 text-xl font-bold">暂无实验数据</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            需要先上传实验数据才能查看 AI 治理对比。前往工作台上传你的第一个实验。
          </p>
          <button
            onClick={() => navigate({ to: "/workbench" })}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
          >
            前往工作台
          </button>
        </div>
      </RequireAuth>
    );
  }

  // 去重文件（按名称）
  const seen = new Set<string>();
  const files = (exp.attachedFiles ?? []).filter((f) => {
    if (seen.has(f.name)) return false;
    seen.add(f.name);
    return true;
  });

  const fileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "csv") return <FileSpreadsheet size={14} className="text-green-500" />;
    if (ext === "xlsx") return <FileSpreadsheet size={14} className="text-emerald-500" />;
    if (ext === "docx") return <FileText size={14} className="text-blue-500" />;
    if (ext === "md") return <FileText size={14} className="text-purple-500" />;
    if (ext === "txt") return <FileText size={14} className="text-gray-500" />;
    if (["png", "jpg", "jpeg"].includes(ext ?? "")) return <ImageIcon size={14} className="text-amber-500" />;
    return <FileText size={14} className="text-muted-foreground" />;
  };

  const completenessScore = (() => {
    const fields = ["name","discipline","operator","purpose","device_name","sample_id","params","steps","results","aiInsights"];
    const filled = fields.filter((f) => {
      const v = (exp as any)[f];
      return v && (Array.isArray(v) ? v.length > 0 : v.length > 5);
    }).length;
    return Math.round((filled / fields.length) * 100);
  })();

  return (
    <RequireAuth>
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">上传前 vs AI 治理后</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          从 {files.length} 个原始文件到 1 张结构化实验卡片 — AI Agent 自动完成多模态解析、术语对齐与字段规整。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] items-start">
        {/* ====== 左：原始文件 ====== */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Layers size={14} /> 原始材料 · {files.length} 个文件
          </div>

          {files.map((f) => {
            const textContent = (f.textContent ?? "").replace(/\x00/g, "");
            const isBinary = textContent.length < 30 && f.mediaType === "document";
            return (
              <div key={f.id} className="card-soft p-4 border-dashed">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium min-w-0">
                    <span className="shrink-0">{fileIcon(f.name)}</span>
                    <span className="truncate">{f.name}</span>
                  </div>
                  <span className="text-[10px] rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground shrink-0 ml-2">
                    {f.mediaType} · {(f.size / 1024).toFixed(1)}KB
                  </span>
                </div>
                {isBinary ? (
                  <div className="h-16 rounded-lg bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-xs text-muted-foreground">
                    [{f.name.endsWith(".xlsx") ? "Excel 电子表格" : "Word 文档"} — 结构化表格数据]
                  </div>
                ) : (
                  <pre className="text-[11px] leading-relaxed font-mono text-muted-foreground bg-secondary/40 rounded-lg p-3 overflow-x-auto max-h-[180px] overflow-y-auto whitespace-pre-wrap break-all">
                    {textContent.slice(0, 600)}{textContent.length > 600 ? "…" : ""}
                  </pre>
                )}
              </div>
            );
          })}

          {exp.aiInsights && (
            <div className="card-soft p-4 border-amber-200 bg-amber-50/50">
              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 mb-1">
                <Sparkles size={14} /> AI 原始观察
              </div>
              <p className="text-xs text-amber-800">{exp.aiInsights}</p>
            </div>
          )}
        </div>

        {/* ====== 中：AI 管道 ====== */}
        <div className="hidden lg:flex flex-col items-center justify-center pt-24 gap-4 px-4">
          <div className="brand-gradient h-16 w-16 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <Sparkles size={24} />
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
          <ArrowRight size={32} className="text-primary mt-3" />

          <div className="mt-4 p-3 rounded-xl bg-primary-soft/50 border border-primary/20 text-center">
            <div className="text-2xl font-bold text-primary">{completenessScore}%</div>
            <div className="text-[10px] text-muted-foreground">字段完成度</div>
          </div>
        </div>

        {/* Mobile AI indicator */}
        <div className="lg:hidden flex items-center justify-center gap-2 text-primary text-sm font-semibold py-3">
          <Sparkles size={16} /> AI 自动治理 ({completenessScore}% 完成度) <ArrowRight size={16} />
        </div>

        {/* ====== 右：结构化卡片 ====== */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 size={14} /> AI 治理后 · 实验卡片
          </div>

          {/* 主卡片 */}
          <div className="card-soft p-5 border-primary/30 bg-primary-soft/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">{exp.name}</h3>
              <span className="text-[10px] rounded-md bg-primary text-primary-foreground px-2 py-0.5">结构化</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="px-1.5 py-0.5 rounded bg-secondary">{exp.discipline}</span>
              <span>来源: {exp.source || "AI 解析"}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs">
              <KV k="样品编号" v={exp.sample?.id || "—"} />
              <KV k="批次" v={exp.sample?.batch || "—"} />
              <KV k="设备" v={exp.device?.name || "—"} />
              <KV k="型号" v={exp.device?.model || "—"} />
              <KV k="操作人员" v={exp.operator || "—"} />
              <KV k="实验时间" v={exp.date?.slice(0, 16).replace("T", " ") || "—"} />
            </div>

            {exp.purpose && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="text-[10px] text-muted-foreground mb-1">实验目的</div>
                <p className="text-xs">{exp.purpose}</p>
              </div>
            )}
          </div>

          {/* 参数表 */}
          {exp.params && exp.params.length > 0 && (
            <div className="card-soft p-5">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <BarChart3 size={14} className="text-primary" /> 实验参数
              </h4>
              <table className="mt-2 w-full text-xs">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-1.5 font-medium">参数</th>
                    <th className="text-left font-medium">值</th>
                    <th className="text-left font-medium">单位</th>
                  </tr>
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

          {/* 步骤 */}
          {exp.steps && exp.steps.length > 0 && (
            <div className="card-soft p-5">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Atom size={14} className="text-primary" /> 实验步骤
              </h4>
              <ol className="mt-2 space-y-1 text-xs list-decimal pl-5 text-muted-foreground">
                {exp.steps.map((s: string, i: number) => (
                  <li key={i} className="pl-1">{s}</li>
                ))}
              </ol>
            </div>
          )}

          {/* 结果 */}
          {exp.results && (
            <div className="card-soft p-5">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Microscope size={14} className="text-primary" /> 实验结果
              </h4>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{exp.results}</p>
            </div>
          )}

          {/* 知识图谱关系 */}
          {relations.length > 0 && (
            <div className="card-soft p-5 border-[color:var(--color-success)]/30">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <GitBranch size={14} className="text-emerald-500" /> 知识图谱关联
              </h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {relations.slice(0, 6).map((r) => (
                  <span key={r.id} className="text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <GitBranch size={10} />
                    {RELATION_LABELS[r.relation_type]}
                  </span>
                ))}
                {relations.length > 6 && (
                  <span className="text-[10px] text-muted-foreground px-1">+{relations.length - 6} 条</span>
                )}
              </div>
            </div>
          )}

          {/* 治理摘要 */}
          <div className="card-soft p-5 border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/5">
            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-[color:var(--color-success)]">
              <CheckCircle2 size={14} /> AI 治理完成
            </h4>
            <ul className="mt-2 text-xs space-y-1 text-muted-foreground">
              <li>✓ {files.length} 个文件 → 1 张结构化卡片</li>
              <li>✓ 参数自动提取 ({exp.params?.length ?? 0} 个参数)</li>
              <li>✓ 步骤自动编号 ({exp.steps?.length ?? 0} 步)</li>
              <li>✓ 学科自动识别: {exp.discipline || "—"}</li>
              {exp.aiInsights && <li>✓ AI 洞察已生成</li>}
              {relations.length > 0 && <li>✓ 知识图谱 {relations.length} 条关联</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom: File → Field mapping */}
      <div className="mt-10">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
          <ExternalLink size={16} className="text-primary" /> 文件 → 字段映射追踪
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {files.map((f) => {
            const contributions: string[] = [];
            if (f.textContent?.includes("SEM") || f.textContent?.includes("JEOL")) contributions.push("设备信息");
            if (f.textContent?.includes("nm") || f.textContent?.includes("kV")) contributions.push("实验参数");
            if (f.textContent?.includes("步骤") || f.textContent?.includes("Procedure")) contributions.push("实验步骤");
            if (f.textContent?.includes("TiO2") || f.textContent?.includes("AuNP")) contributions.push("实验结果");
            if (f.textContent?.includes("XRD") || f.textContent?.includes("UV-Vis")) contributions.push("分析方法");
            if (contributions.length === 0) contributions.push("上下文关联");

            return (
              <div key={f.id} className="card-soft p-3 border-dashed">
                <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
                  {fileIcon(f.name)}
                  <span className="truncate">{f.name}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {contributions.map((c, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-soft text-primary">
                      → {c}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
