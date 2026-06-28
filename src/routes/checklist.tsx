/**
 * Reproduction Audit — 复现审计页面
 *
 * 核心功能：
 *   1. 论文 Methods 输入 → AI 拆解为结构化参数
 *   2. 参数确定性标注（论文明确/隐含/推断/未知）
 *   3. 缺口识别 + 置信度推断 + 领域知识增强
 *   4. 研究者审核/修改/补全
 *   5. 生成可执行复现协议
 *
 * 所有测试数据使用真实论文：SrTiO₃/rGO/g-C₃N₄ (Sci Rep 2024)
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ListChecks, Sparkles, FileText, AlertTriangle,
  CheckCircle2, Lightbulb, RotateCcw, ChevronDown, ChevronUp,
  Download, Loader2, Target, Shield, Zap,
  BookOpen, Beaker, Gauge, Copy,
  Info, ExternalLink, HelpCircle, X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  ReproductionAudit,
  ReproductionParameter,
  ReproductionGap,
  ParameterCategory,
  CertaintyLevel,
} from "../lib/reproduction-audit";
import {
  prioritizeGaps,
  generateReproductionProtocol,
  calculateReproducibilityScore,
} from "../lib/reproduction-audit";
import { decomposePaperMethods } from "../lib/paper-decomposer";
import type { DecompositionStep, DecompositionProgress } from "../lib/paper-decomposer";
import { queryDomainKnowledge } from "../lib/domain-knowledge";
import { SRTIO3_PAPER, SRTIO3_PRESET_AUDIT, REAL_PAPERS, PLANT_EP_PAPER, SPATIAL_TRANSCRIPTOMICS_PAPER } from "../lib/paper-test-data";
import { RequireAuth } from "../lib/auth-guard";
import { saveAudit, fetchAudits, deleteAudit } from "../lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";

export const Route = createFileRoute("/checklist")({
  head: () => ({
    meta: [
      { title: "复现审计 – LabNote Agent" },
      { name: "description", content: "论文实验方法拆解、复现参数提取、缺口分析、置信度评估——让实验真正可复现。" },
    ],
  }),
  component: ReproductionAuditPage,
});

// ═══════════════════════════════════════════════════════
// 主页面
// ═══════════════════════════════════════════════════════

function ReproductionAuditPage() {
  // 输入状态
  const [paperSource, setPaperSource] = useState<"preset-srtio3" | "preset-co3o4" | "preset-plant-ep" | "preset-spatial" | "custom">("preset-srtio3");
  const [customPaperTitle, setCustomPaperTitle] = useState("");
  const [customPaperDoi, setCustomPaperDoi] = useState("");
  const [customMethods, setCustomMethods] = useState("");
  const [discipline, setDiscipline] = useState("材料科学");

  // 处理状态
  const [decomposing, setDecomposing] = useState(false);
  const [progress, setProgress] = useState<DecompositionProgress>({ step: "connecting" });
  const [audit, setAudit] = useState<ReproductionAudit | null>(null);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null);

  // 历史存档
  const [auditHistory, setAuditHistory] = useState<ReproductionAudit[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // UI 状态
  const [activeTab, setActiveTab] = useState<"params" | "gaps" | "protocol">("params");
  const [filterCategory, setFilterCategory] = useState<ParameterCategory | "all">("all");
  const [filterCertainty, setFilterCertainty] = useState<CertaintyLevel | "all">("all");
  const [expandedParam, setExpandedParam] = useState<Set<string>>(new Set());
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [gapFillValues, setGapFillValues] = useState<Record<string, string>>({});

  // ===== 加载历史审计记录 =====
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const audits = await fetchAudits();
    setAuditHistory(audits);
    setLoadingHistory(false);
  }, []);

  // 页面加载时获取历史
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ===== 保存审计到云端 =====
  const saveCurrentAudit = useCallback(async (a: ReproductionAudit) => {
    const id = await saveAudit(a, discipline);
    if (id) {
      setSavedAuditId(id);
      // 刷新历史列表
      loadHistory();
      return true;
    }
    return false;
  }, [discipline, loadHistory]);

  // ===== 删除历史审计 =====
  const handleDeleteHistory = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await deleteAudit(id);
    if (ok) {
      toast.success("已删除");
      if (savedAuditId === id) setSavedAuditId(null);
      loadHistory();
    } else {
      toast.error("删除失败");
    }
  }, [savedAuditId, loadHistory]);

  // ===== 获取当前论文内容 =====
  const getCurrentPaperData = useCallback(() => {
    if (paperSource === "preset-srtio3") {
      return { title: SRTIO3_PAPER.title, doi: SRTIO3_PAPER.doi, methods: SRTIO3_PAPER.methods, discipline: SRTIO3_PAPER.discipline };
    }
    if (paperSource === "preset-co3o4") {
      return { title: REAL_PAPERS[1].title, doi: REAL_PAPERS[1].doi, methods: REAL_PAPERS[1].methods, discipline: REAL_PAPERS[1].discipline };
    }
    if (paperSource === "preset-plant-ep") {
      return { title: PLANT_EP_PAPER.title, doi: PLANT_EP_PAPER.doi, methods: PLANT_EP_PAPER.methods, discipline: PLANT_EP_PAPER.discipline };
    }
    if (paperSource === "preset-spatial") {
      return { title: SPATIAL_TRANSCRIPTOMICS_PAPER.title, doi: SPATIAL_TRANSCRIPTOMICS_PAPER.doi, methods: SPATIAL_TRANSCRIPTOMICS_PAPER.methods, discipline: SPATIAL_TRANSCRIPTOMICS_PAPER.discipline };
    }
    return {
      title: customPaperTitle || "未命名论文",
      doi: customPaperDoi || "手动输入",
      methods: customMethods,
      discipline,
    };
  }, [paperSource, customPaperTitle, customPaperDoi, customMethods, discipline]);

  // ===== 使用预设 Audit =====
  const loadPresetAudit = useCallback(() => {
    setAudit(SRTIO3_PRESET_AUDIT);
    saveAudit(SRTIO3_PRESET_AUDIT, "材料科学").then((id) => {
      if (id) { setSavedAuditId(id); loadHistory(); }
    });
    toast.success("已加载预设 Audit 并保存到云端");
  }, [loadHistory]);

  // ===== AI 拆解 =====
  const runDecomposition = useCallback(async () => {
    const paper = getCurrentPaperData();
    if (!paper.methods.trim()) {
      toast.error("请先输入论文的实验方法段落");
      return;
    }

    setDecomposing(true);
    setProgress({ step: "connecting" });
    try {
      const result = await decomposePaperMethods(
        paper.title,
        paper.doi,
        paper.methods,
        paper.discipline || discipline,
        (p) => setProgress(p),
      );
      setAudit(result);
      toast.success(`拆解完成：${result.parameters.length} 个参数，${result.gaps.length} 个缺口`);
      // 自动保存到 Supabase
      const savedId = await saveAudit(result, paper.discipline || discipline);
      if (savedId) {
        setSavedAuditId(savedId);
        toast.success("📤 已保存到云端");
        loadHistory();
      } else {
        toast.error("⚠️ 云端保存失败，数据仅存于当前会话");
      }
    } catch (err) {
      console.error("[Audit] decomposition failed:", err);
      toast.error(`拆解失败: ${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setDecomposing(false);
    }
  }, [getCurrentPaperData, discipline, loadHistory]);

  // ===== 参数操作 =====
  const confirmParam = useCallback((paramName: string, value: string) => {
    if (!audit) return;
    const updated: ReproductionAudit = {
      ...audit,
      parameters: audit.parameters.map((p) =>
        p.name === paramName
          ? { ...p, userConfirmed: true, userValue: value || p.value }
          : p,
      ),
    };
    const { score, breakdown } = calculateReproducibilityScore(updated.parameters, updated.gaps);
    updated.reproducibilityScore = score;
    updated.scoreBreakdown = breakdown;
    setAudit(updated);
    saveAudit(updated, discipline).then((id) => { if (id) setSavedAuditId(id); });
    toast.success(`已确认: ${paramName}`);
  }, [audit, discipline]);

  const fillGap = useCallback((gapDesc: string, value: string) => {
    if (!audit) return;
    const updated: ReproductionAudit = {
      ...audit,
      gaps: audit.gaps.map((g) =>
        g.description === gapDesc
          ? { ...g, userFill: value, status: "user-filled" as const }
          : g,
      ),
    };
    const { score, breakdown } = calculateReproducibilityScore(updated.parameters, updated.gaps);
    updated.reproducibilityScore = score;
    updated.scoreBreakdown = breakdown;
    setAudit(updated);
    setGapFillValues((prev) => ({ ...prev, [gapDesc]: "" }));
    saveAudit(updated, discipline).then((id) => { if (id) setSavedAuditId(id); });
    toast.success("缺口已补全");
  }, [audit, discipline]);

  const acceptAISuggestion = useCallback((gapDesc: string) => {
    if (!audit) return;
    const gap = audit.gaps.find((g) => g.description === gapDesc);
    if (!gap?.aiSuggestion) return;
    fillGap(gapDesc, gap.aiSuggestion);
  }, [audit, fillGap]);

  // ===== 导出协议 =====
  const exportProtocol = useCallback(() => {
    if (!audit) return;
    const md = generateReproductionProtocol(audit);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `复现协议-${audit.paperTitle.slice(0, 40)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("复现协议已下载");
  }, [audit]);

  // ===== 过滤后的参数 =====
  const filteredParams = useMemo(() => {
    if (!audit) return [];
    return audit.parameters.filter((p) => {
      if (filterCategory !== "all" && p.category !== filterCategory) return false;
      if (filterCertainty !== "all" && p.certainty !== filterCertainty) return false;
      return true;
    });
  }, [audit, filterCategory, filterCertainty]);

  // ===== 排序后的缺口 =====
  const sortedGaps = useMemo(() => {
    if (!audit) return [];
    return prioritizeGaps(audit.gaps);
  }, [audit]);

  const categoryLabels: Record<ParameterCategory, string> = {
    safety: "🦺 安全",
    precursor: "🧪 前驱体",
    equipment: "🔬 设备",
    synthesis: "⚗️ 合成",
    "post-processing": "🔥 后处理",
    characterization: "📊 表征",
    testing: "🧫 测试",
    environment: "🌡️ 环境",
  };

  const certaintyConfig: Record<CertaintyLevel, { icon: string; color: string; bg: string; label: string }> = {
    explicit: { icon: "✅", color: "text-green-600", bg: "bg-green-50 border-green-200", label: "论文明确" },
    implied: { icon: "📖", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "论文隐含" },
    inferred: { icon: "🤖", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "AI 推断" },
    unknown: { icon: "❓", color: "text-red-600", bg: "bg-red-50 border-red-200", label: "未知" },
  };

  // ═══════════════════════════════
  // Paper Input Section
  // ═══════════════════════════════
  const renderPaperInput = () => (
    <div className="card-soft p-5 mb-6">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
        <BookOpen size={16} className="text-primary"/> 论文输入
      </h3>

      {/* Preset / Custom toggle */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["preset-srtio3", "preset-co3o4", "preset-plant-ep", "preset-spatial", "custom"] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setPaperSource(opt)}
            className={`px-3 py-2 rounded-lg text-xs transition ${
              paperSource === opt
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:border-primary/40"
            }`}
          >
            {opt === "preset-srtio3" ? "📄 SrTiO₃ (Sci Rep)" :
             opt === "preset-co3o4" ? "📄 Co₃O₄-rGO (Catalysts)" :
             opt === "preset-plant-ep" ? "🌿 植物电生理 (Sci Data)" :
             opt === "preset-spatial" ? "🧬 空间转录组 (bioRxiv)" :
             "✏️ 自定义输入"}
          </button>
        ))}
      </div>

      {paperSource === "custom" ? (
        <div className="space-y-3">
          <input
            value={customPaperTitle}
            onChange={(e) => setCustomPaperTitle(e.target.value)}
            placeholder="论文标题"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex gap-3">
            <input
              value={customPaperDoi}
              onChange={(e) => setCustomPaperDoi(e.target.value)}
              placeholder="DOI (可选)"
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <option>材料科学</option>
              <option>化学</option>
              <option>物理</option>
              <option>生物学</option>
              <option>环境科学</option>
            </select>
          </div>
          <textarea
            value={customMethods}
            onChange={(e) => setCustomMethods(e.target.value)}
            placeholder="在此粘贴论文的实验方法/Methods/Experimental 段落…"
            rows={8}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono"
          />
        </div>
      ) : (
        <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground mb-1">
            <FileText size={14}/>
            {paperSource === "preset-srtio3" ? SRTIO3_PAPER.title :
             paperSource === "preset-co3o4" ? REAL_PAPERS[1].title :
             paperSource === "preset-plant-ep" ? PLANT_EP_PAPER.title :
             SPATIAL_TRANSCRIPTOMICS_PAPER.title}
          </div>
          <p>DOI: {paperSource === "preset-srtio3" ? SRTIO3_PAPER.doi :
                   paperSource === "preset-co3o4" ? REAL_PAPERS[1].doi :
                   paperSource === "preset-plant-ep" ? PLANT_EP_PAPER.doi :
                   SPATIAL_TRANSCRIPTOMICS_PAPER.doi}</p>
          <p className="mt-1">Methods 段落已预加载（真实论文内容），可直接拆解或使用预设结果。</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={runDecomposition}
          disabled={decomposing}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
        >
          {decomposing ? (
            <><Loader2 size={15} className="animate-spin"/> AI 拆解中…</>
          ) : (
            <><Sparkles size={15}/> AI 拆解论文 → 复现参数</>
          )}
        </button>
        <button
          onClick={loadPresetAudit}
          disabled={decomposing}
          className="flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm hover:border-primary/40 hover:bg-primary-soft/10 transition"
        >
          <Zap size={15}/> 使用预设 Audit（快速演示）
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════
  // Score Dashboard
  // ═══════════════════════════════
  const renderScoreDashboard = () => {
    if (!audit) return null;
    const explicitCount = audit.parameters.filter((p) => p.certainty === "explicit").length;
    const inferredCount = audit.parameters.filter((p) => p.certainty === "inferred").length;
    const unknownCount = audit.parameters.filter((p) => p.certainty === "unknown").length;
    const openGaps = audit.gaps.filter((g) => g.status === "open").length;
    const confirmedCount = audit.parameters.filter((p) => p.userConfirmed).length;

    const scoreColor = audit.reproducibilityScore >= 80 ? "text-green-600" :
      audit.reproducibilityScore >= 60 ? "text-amber-600" : "text-red-600";

    return (
      <div className="card-soft p-5 mb-6">
        <div className="flex flex-wrap items-center gap-6">
          {/* Score ring */}
          <div className="text-center">
            <div className={`text-3xl font-bold ${scoreColor}`}>{audit.reproducibilityScore}</div>
            <div className="text-[10px] text-muted-foreground">复现可行性 /100</div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 flex-1">
            <MiniStat label="总参数" value={audit.parameters.length.toString()} icon={<Beaker size={14}/>}/>
            <MiniStat label="论文明确" value={explicitCount.toString()} icon={<CheckCircle2 size={14} className="text-green-600"/>}/>
            <MiniStat label="AI 推断" value={(inferredCount + unknownCount).toString()} icon={<Sparkles size={14} className="text-amber-600"/>}/>
            <MiniStat label="待补缺口" value={openGaps.toString()} icon={<AlertTriangle size={14} className={openGaps > 0 ? "text-red-600" : "text-green-600"}/>}/>
          </div>

          {/* Progress bar */}
          <div className="w-full">
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  audit.reproducibilityScore >= 80 ? "bg-green-500" :
                  audit.reproducibilityScore >= 60 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${audit.reproducibilityScore}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{audit.scoreBreakdown}</p>
          </div>

          {/* Confirmed count */}
          {confirmedCount > 0 && (
            <p className="text-[11px] text-muted-foreground">
              ✅ {confirmedCount} 个参数已由你确认
            </p>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════
  // Critical Risks
  // ═══════════════════════════════
  const renderCriticalRisks = () => {
    if (!audit || !audit.criticalRisks.length) return null;
    return (
      <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4">
        <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-2">
          <Shield size={15}/> 关键风险（{audit.criticalRisks.length} 项）
        </h3>
        <ul className="space-y-1.5">
          {audit.criticalRisks.map((risk, i) => (
            <li key={i} className="text-xs text-red-800 flex items-start gap-2">
              <span className="mt-0.5">🔴</span>
              <span>{risk}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // ═══════════════════════════════
  // AI Assessment
  // ═══════════════════════════════
  const renderAIAssessment = () => {
    if (!audit?.aiAssessment) return null;
    return (
      <div className="mb-6 rounded-xl bg-primary-soft/10 border border-primary/15 p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 text-primary">
          <Lightbulb size={15}/> AI 总体评估
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{audit.aiAssessment}</p>
      </div>
    );
  };

  // ═══════════════════════════════
  // Parameters Tab
  // ═══════════════════════════════
  const renderParameters = () => {
    if (!audit) return null;

    // Group by category
    const grouped = new Map<ParameterCategory, ReproductionParameter[]>();
    for (const p of filteredParams) {
      if (!grouped.has(p.category)) grouped.set(p.category, []);
      grouped.get(p.category)!.push(p);
    }

    if (filteredParams.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          无匹配参数 — 请调整筛选条件
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([cat, params]) => (
          <div key={cat}>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              {categoryLabels[cat]}
              <span className="text-[10px] text-muted-foreground/70">({params.length})</span>
            </h4>
            <div className="space-y-2">
              {params.map((p) => renderParamRow(p))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderParamRow = (p: ReproductionParameter) => {
    const config = certaintyConfig[p.certainty];
    const isExpanded = expandedParam.has(p.name);
    const isEditing = editingParam === p.name;
    const impactColors = {
      critical: "border-l-red-500",
      major: "border-l-amber-500",
      minor: "border-l-blue-500",
    };

    return (
      <div
        key={p.name}
        className={`rounded-lg border border-border border-l-2 ${impactColors[p.impactIfWrong]} ${
          p.userConfirmed ? "bg-green-50/30" : "bg-card"
        } p-3 transition`}
      >
        <div className="flex items-center gap-3">
          {/* Certainty badge */}
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${config.bg} ${config.color} border shrink-0`}>
            {config.icon} {config.label}
          </span>

          {/* Param name */}
          <span className="text-sm font-medium flex-1 min-w-0 truncate">{p.name}</span>

          {/* Value */}
          <span className="text-sm font-bold tabular-nums shrink-0">
            {p.userConfirmed ? (
              <span className="text-green-700">{p.userValue || p.value}</span>
            ) : (
              p.value || <span className="text-red-400 italic">未知</span>
            )}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">{p.unit}</span>

          {/* Confidence bar */}
          <div className="w-16 shrink-0 hidden lg:block">
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition ${
                  p.confidence >= 80 ? "bg-green-500" :
                  p.confidence >= 50 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${p.confidence}%` }}
              />
            </div>
            <p className="text-[9px] text-muted-foreground text-right mt-0.5">{p.confidence}%</p>
          </div>

          {/* Actions */}
          <button
            onClick={() => setExpandedParam((prev) => {
              const next = new Set(prev);
              next.has(p.name) ? next.delete(p.name) : next.add(p.name);
              return next;
            })}
            className="p-1 text-muted-foreground hover:text-foreground shrink-0"
          >
            {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>

          {!p.userConfirmed && p.certainty !== "explicit" && (
            <button
              onClick={() => { setEditingParam(p.name); setEditValue(p.value); }}
              className="p-1 text-primary hover:bg-primary-soft/20 rounded shrink-0"
              title="修改/确认"
            >
              <Edit2 size={14}/>
            </button>
          )}

          {p.userConfirmed && (
            <CheckCircle2 size={16} className="text-green-600 shrink-0"/>
          )}
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            {p.paperQuote && (
              <div className="text-[11px] text-muted-foreground">
                <span className="font-medium">论文原文：</span>
                <span className="italic">"{p.paperQuote}"</span>
              </div>
            )}
            {p.inferenceRationale && (
              <div className="text-[11px] text-muted-foreground">
                <span className="font-medium">推断依据：</span>
                {p.inferenceRationale}
              </div>
            )}
            {p.alternativeRange && (
              <div className="text-[11px] text-muted-foreground">
                <span className="font-medium">参考范围：</span>
                {p.alternativeRange}
              </div>
            )}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>来源：{p.source}</span>
              <span>·</span>
              <span>影响等级：{p.impactIfWrong === "critical" ? "🔴 关键" : p.impactIfWrong === "major" ? "🟡 重要" : "🟢 轻微"}</span>
            </div>
            {p.relatedParams.length > 0 && (
              <div className="text-[10px] text-muted-foreground">
                关联参数：{p.relatedParams.join("、")}
              </div>
            )}
          </div>
        )}

        {/* Edit inline */}
        {isEditing && (
          <div className="mt-2 flex gap-2">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 rounded-lg border border-primary/40 bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={`输入 ${p.name} 的值${p.unit ? ` (${p.unit})` : ""}`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  confirmParam(p.name, editValue);
                  setEditingParam(null);
                }
                if (e.key === "Escape") setEditingParam(null);
              }}
            />
            <button
              onClick={() => { confirmParam(p.name, editValue); setEditingParam(null); }}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/90"
            >
              确认
            </button>
            <button
              onClick={() => setEditingParam(null)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary"
            >
              取消
            </button>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════
  // Gaps Tab
  // ═══════════════════════════════
  const renderGaps = () => {
    if (!audit) return null;

    if (sortedGaps.length === 0) {
      return (
        <div className="text-center py-8">
          <CheckCircle2 size={32} className="mx-auto text-green-500"/>
          <p className="mt-2 text-sm text-muted-foreground">所有信息已完整，无复现缺口 🎉</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {sortedGaps.map((gap) => renderGapRow(gap))}
      </div>
    );
  };

  const renderGapRow = (gap: ReproductionGap) => {
    const impactConfig = {
      critical: { icon: "🔴", color: "border-red-300 bg-red-50/50", label: "关键" },
      major: { icon: "🟡", color: "border-amber-300 bg-amber-50/50", label: "重要" },
      minor: { icon: "🟢", color: "border-blue-300 bg-blue-50/50", label: "轻微" },
    };
    const ic = impactConfig[gap.impactIfWrong];
    const isResolved = gap.status === "user-filled" || gap.status === "resolved";

    return (
      <div key={gap.description} className={`rounded-lg border ${ic.color} p-4 ${isResolved ? "opacity-70" : ""}`}>
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5">{ic.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold">{gap.description}</h4>
              <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {ic.label}缺口
              </span>
              {isResolved && (
                <span className="text-[10px] text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                  ✅ 已补全
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{gap.importanceRationale}</p>

            {/* AI Suggestion */}
            {gap.aiSuggestion && (
              <div className="mt-2 rounded-lg bg-primary-soft/10 border border-primary/15 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={12} className="text-primary"/>
                  <span className="text-[11px] font-semibold text-primary">AI 建议</span>
                  <span className="text-[10px] text-muted-foreground">置信度 {gap.confidence}%</span>
                </div>
                <p className="text-xs">{gap.aiSuggestion}</p>
                {gap.inferenceBasis && (
                  <p className="mt-1 text-[10px] text-muted-foreground">依据：{gap.inferenceBasis}</p>
                )}
                {!isResolved && (
                  <button
                    onClick={() => acceptAISuggestion(gap.description)}
                    className="mt-2 text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    <CheckCircle2 size={11}/> 采纳此建议
                  </button>
                )}
              </div>
            )}

            {/* DB Reference */}
            {gap.dbReference && (
              <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                <ExternalLink size={11}/>
                数据库参考：{gap.dbReference}
              </div>
            )}

            {/* User fill */}
            {!isResolved && (
              <div className="mt-3 flex gap-2">
                <input
                  value={gapFillValues[gap.description] ?? ""}
                  onChange={(e) => setGapFillValues((prev) => ({ ...prev, [gap.description]: e.target.value }))}
                  placeholder="输入你确定的值…"
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && gapFillValues[gap.description]?.trim()) {
                      fillGap(gap.description, gapFillValues[gap.description]);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (gapFillValues[gap.description]?.trim()) {
                      fillGap(gap.description, gapFillValues[gap.description]);
                    }
                  }}
                  disabled={!gapFillValues[gap.description]?.trim()}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/90 disabled:opacity-40"
                >
                  提交
                </button>
              </div>
            )}

            {/* Show filled value */}
            {isResolved && gap.userFill && (
              <div className="mt-2 text-xs text-green-700 flex items-center gap-1">
                <CheckCircle2 size={11}/>
                已填入：{gap.userFill}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════
  // Protocol Tab
  // ═══════════════════════════════
  const renderProtocol = () => {
    if (!audit) return null;
    const md = generateReproductionProtocol(audit);
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <button
            onClick={exportProtocol}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs text-primary-foreground hover:bg-primary/90"
          >
            <Download size={14}/> 下载 Markdown 协议
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(md);
              toast.success("协议已复制到剪贴板");
            }}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs hover:bg-secondary"
          >
            <Copy size={14}/> 复制全文
          </button>
        </div>
        <pre className="rounded-xl bg-secondary/50 p-5 text-xs leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-auto font-mono">
          {md}
        </pre>
      </div>
    );
  };

  // ═══════════════════════════════
  // Empty State
  // ═══════════════════════════════
  if (!audit && !decomposing) {
    return (
      <RequireAuth>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <ListChecks size={20}/>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">复现审计</h1>
            <p className="text-sm text-muted-foreground">
              论文实验方法拆解 · 参数确定性标注 · 缺口智能推断 · 复现协议生成
            </p>
          </div>
          <HelpButton />
        </div>

        {/* ── 历史审计记录 ── */}
        <div className="mb-6">
          <button
            onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
          >
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <ListChecks size={14} />
            历史审计记录
            {auditHistory.length > 0 && (
              <span className="bg-primary/10 text-primary text-[11px] px-1.5 py-0.5 rounded-full">{auditHistory.length}</span>
            )}
          </button>

          {showHistory && (
            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={16} className="animate-spin text-muted-foreground" />
                </div>
              ) : auditHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  暂无保存的审计记录。输入论文并点击 AI 拆解后会自动保存到云端。
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {auditHistory.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => { setAudit(h); setSavedAuditId(h.id); setShowHistory(false); toast.success(`已加载: ${h.paperTitle.slice(0, 30)}…`); }}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/60 cursor-pointer transition group"
                    >
                      <div className={`text-lg shrink-0 ${
                        h.reproducibilityScore >= 80 ? "" :
                        h.reproducibilityScore >= 60 ? "opacity-70" : "opacity-50"
                      }`}>
                        {h.reproducibilityScore >= 80 ? "🟢" : h.reproducibilityScore >= 60 ? "🟡" : "🔴"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{h.paperTitle}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(h.auditedAt).toLocaleDateString("zh-CN", { year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })} · {h.reproducibilityScore}分 · {h.parameters.length}参数 · {h.gaps.length}缺口
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteHistory(h.id, e)}
                        className="p-1 text-muted-foreground/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition shrink-0"
                        title="删除"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Paper Input */}
        {renderPaperInput()}
      </div>
      </RequireAuth>
    );
  }

  // ═══════════════════════════════
  // Main Audit View
  // ═══════════════════════════════
  return (
    <RequireAuth>
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white">
          <ListChecks size={20}/>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">复现审计</h1>
          <p className="text-sm text-muted-foreground">
            论文实验方法拆解 · 参数确定性标注 · 缺口智能推断
          </p>
        </div>
        <button
          onClick={() => { setAudit(null); }}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
        >
          <RotateCcw size={14}/> 重新开始
        </button>
        <HelpButton />
      </div>

      {/* Paper info */}
      {audit && (
        <div className="mb-4 text-xs text-muted-foreground flex items-center gap-2">
          <FileText size={12}/>
          <span className="font-medium text-foreground truncate">{audit.paperTitle}</span>
          <span>·</span>
          <span>{audit.paperSource}</span>
        </div>
      )}

      {/* Loading — 多步骤进度 */}
      {decomposing && <DecompositionProgressBar progress={progress} />}

      {/* Score */}
      {audit && renderScoreDashboard()}

      {/* Critical Risks */}
      {audit && renderCriticalRisks()}

      {/* AI Assessment */}
      {audit && renderAIAssessment()}

      {/* Tabs */}
      {audit && (
        <>
          {/* Tab bar */}
          <div className="flex items-center gap-1 mb-4">
            {(["params", "gaps", "protocol"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-muted-foreground"
                }`}
              >
                {tab === "params" ? `📋 参数 (${audit.parameters.length})` :
                 tab === "gaps" ? `🔍 缺口 (${audit.gaps.length})` :
                 "📄 协议"}
              </button>
            ))}

            <div className="flex-1"/>

            {/* Filters (only for params) */}
            {activeTab === "params" && (
              <div className="flex gap-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as ParameterCategory | "all")}
                  className="rounded-lg border border-border bg-card px-2 py-1.5 text-[11px]"
                >
                  <option value="all">全部类别</option>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <select
                  value={filterCertainty}
                  onChange={(e) => setFilterCertainty(e.target.value as CertaintyLevel | "all")}
                  className="rounded-lg border border-border bg-card px-2 py-1.5 text-[11px]"
                >
                  <option value="all">全部确定性</option>
                  <option value="explicit">✅ 论文明确</option>
                  <option value="implied">📖 论文隐含</option>
                  <option value="inferred">🤖 AI 推断</option>
                  <option value="unknown">❓ 未知</option>
                </select>
              </div>
            )}
          </div>

          {/* Tab content */}
          <div className="card-soft p-5">
            {activeTab === "params" && renderParameters()}
            {activeTab === "gaps" && renderGaps()}
            {activeTab === "protocol" && renderProtocol()}
          </div>
        </>
      )}
    </div>
    </RequireAuth>
  );
}

// ═══════════════════════════════════════════════════════
// Small components
// ═══════════════════════════════════════════════════════

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
        {icon}
      </div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 多步骤进度条
// ═══════════════════════════════════════════════════════

const PIPELINE_STEPS: { step: DecompositionStep; icon: string; label: string }[] = [
  { step: "connecting",       icon: "🔗", label: "连接 AI 引擎" },
  { step: "decomposing",      icon: "🧠", label: "AI 拆解论文 Methods" },
  { step: "enhancing-static", icon: "📚", label: "静态领域知识库匹配" },
  { step: "enhancing-mp",     icon: "🌐", label: "Materials Project 查询" },
  { step: "done",             icon: "✅", label: "生成复现审计报告" },
];

function DecompositionProgressBar({ progress }: { progress: DecompositionProgress }) {
  const currentIdx = PIPELINE_STEPS.findIndex((s) => s.step === progress.step);

  return (
    <div className="card-soft p-6 mb-6">
      <p className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Loader2 size={15} className="animate-spin text-primary" />
        AI 拆解进行中…
      </p>

      {/* 步骤列表 */}
      <div className="space-y-1">
        {PIPELINE_STEPS.map((s, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isPending = i > currentIdx;

          return (
            <div
              key={s.step}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isCurrent ? "bg-primary/10 text-primary font-medium" :
                isDone ? "text-muted-foreground" : "text-muted-foreground/50"
              }`}
            >
              {/* 状态图标 */}
              <span className="flex-shrink-0 w-5 text-center">
                {isDone ? <CheckCircle2 size={14} className="text-green-500 inline" /> :
                 isCurrent ? <Loader2 size={14} className="animate-spin inline text-primary" /> :
                 <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30" />}
              </span>
              <span className={`w-5 text-center ${isPending ? "opacity-40" : ""}`}>{s.icon}</span>
              <span className={isPending ? "opacity-40" : ""}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* 当前步骤详情 */}
      {progress.detail && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Info size={12} />
            {progress.detail}
          </p>
        </div>
      )}

      {/* 进度条 */}
      <div className="mt-4 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
          style={{ width: `${((currentIdx + 0.5) / PIPELINE_STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 帮助按钮 + 帮助弹窗
// ═══════════════════════════════════════════════════════

function HelpButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary-soft/10 transition"
          title="了解复现审计如何工作"
        >
          <HelpCircle size={14} />
          <span className="hidden sm:inline">帮助</span>
        </button>
      </DialogTrigger>
      <HelpModal />
    </Dialog>
  );
}

function HelpModal() {
  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold flex items-center gap-2">
          <HelpCircle size={18} className="text-primary" /> 复现审计 — 帮助指南
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6 text-sm leading-relaxed mt-2">

        {/* ── 如何使用 ── */}
        <section>
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Target size={14} className="text-primary" /> 如何解决"AI 只能靠推测"？
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">1</span>
                <h5 className="text-xs font-semibold">拆解而非猜测</h5>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">AI 系统性提取论文 Methods 中每一个数值参数，区分「明确写出」「隐含」「需推断」三级。不确定就是不确定。</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">2</span>
                <h5 className="text-xs font-semibold">领域知识校验</h5>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">推断基于真实科研文献参数范围和公共数据库（Materials Project、NIST），置信度透明标注。</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">3</span>
                <h5 className="text-xs font-semibold">缺口驱动复现</h5>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">自动识别缺失但复现必需的信息，按关键程度排序，生成可执行的复现协议。</p>
            </div>
          </div>
        </section>

        {/* ── 管道架构 ── */}
        <section>
          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Zap size={13} className="text-amber-500" /> AI 管道架构
          </h4>
          <div className="rounded-lg bg-secondary/40 p-3 font-mono text-[11px] text-muted-foreground overflow-x-auto">
            <div>论文 Methods ──→ <span className="text-primary font-semibold">DeepSeek-V3</span> (AI 拆解)</div>
            <div className="ml-[13ch]">│</div>
            <div className="ml-[13ch]">├─→ 提取结构化参数 (explicit / implied / inferred)</div>
            <div className="ml-[13ch]">├─→ 识别信息缺口 (gaps)</div>
            <div className="ml-[13ch]">│</div>
            <div>──────────→ <span className="text-primary font-semibold">静态领域知识库</span> (76 条目, 10 类别)</div>
            <div className="ml-[13ch]">│   · 水热法、溶胶凝胶、煅烧… 典型参数范围</div>
            <div className="ml-[13ch]">│   · 基于 10+ 篇 2024 年论文的真实数据</div>
            <div className="ml-[13ch]">│</div>
            <div>──────────→ <span className="text-primary font-semibold">Materials Project API</span> (实时查询)</div>
            <div className="ml-[13ch]">│   · 提取化学式 → GET /materials/summary/?formula=TiO2</div>
            <div className="ml-[13ch]">│   · 返回: band_gap, formation_energy, crystal_system…</div>
            <div className="ml-[13ch]">│   · 会话缓存 (同化学式不重复请求)</div>
            <div className="ml-[13ch]">│</div>
            <div>──────────→ <span className="text-primary font-semibold">复现审计报告</span> (ReproductionAudit)</div>
          </div>
        </section>

        {/* ── 确定性分类 ── */}
        <section>
          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Target size={13} className="text-blue-500" /> 确定性四级分类
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">等级</th>
                  <th className="py-1.5 pr-3 font-medium">含义</th>
                  <th className="py-1.5 pr-3 font-medium">置信度</th>
                  <th className="py-1.5 font-medium">示例</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-1.5 pr-3"><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" />explicit</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">论文明确写出数值</td>
                  <td className="py-1.5 pr-3 font-mono">100%</td>
                  <td className="py-1.5 text-muted-foreground">"heated at 200°C for 4h"</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-1.5 pr-3"><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5" />implied</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">可从上下文合理推断</td>
                  <td className="py-1.5 pr-3 font-mono">80–95%</td>
                  <td className="py-1.5 text-muted-foreground">"dried overnight" → ~12h</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-1.5 pr-3"><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" />inferred</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">AI 基于领域知识推断</td>
                  <td className="py-1.5 pr-3 font-mono">40–80%</td>
                  <td className="py-1.5 text-muted-foreground">KOH 用量 → 推测 pH 调节至 10-12</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3"><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />unknown</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">完全未知，标记为 gap</td>
                  <td className="py-1.5 pr-3 font-mono">0%</td>
                  <td className="py-1.5 text-muted-foreground">搅拌速度 — 未提及</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Materials Project 集成 ── */}
        <section>
          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <ExternalLink size={13} className="text-green-500" /> Materials Project 集成
          </h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>• <strong>覆盖范围:</strong> 15万+ 无机晶体材料（不含有机分子/聚合物/复合材料）</p>
            <p>• <strong>查询属性:</strong> 带隙 (band_gap)、形成能 (formation_energy_per_atom)、能量凸包距离 (energy_above_hull)、晶系/空间群、密度、金属性</p>
            <p>• <strong>触发条件:</strong> 参数涉及可识别化学式（如 SrTiO₃、TiO₂）且置信度低时自动查询</p>
            <p>• <strong>增强效果:</strong> 匹配 → 置信度提升至 85-92%；未匹配 → 不影响原 AI 推断</p>
            <p>• <strong>缓存策略:</strong> 同页面会话内相同化学式仅查询一次</p>
            <p>• <strong>认证:</strong> 需要 <code className="bg-secondary px-1 rounded text-[11px]">MP_API_KEY</code>（免费注册获取）</p>
          </div>
        </section>

        {/* ── 评分公式 ── */}
        <section>
          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Gauge size={13} className="text-purple-500" /> 复现可行性评分公式
          </h4>
          <div className="rounded-lg bg-secondary/40 p-3 font-mono text-[11px] text-muted-foreground">
            <div>score = avgConfidence − criticalPenalty − gapPenalty</div>
            <div className="mt-1.5 space-y-0.5">
              <div>· avgConfidence = 所有参数置信度加权平均 (0-100)</div>
              <div>· criticalPenalty = 关键参数中不确定部分的比例 × 20</div>
              <div>· gapPenalty = 缺口数 × 5 (上限 30)</div>
            </div>
            <div className="mt-2 pt-2 border-t border-border text-muted-foreground/70">
              示例: 28 参数 (avg 78%) + 5 缺口 + 2 个关键不确定 → 78 − 2.8 − 25 = <span className="text-amber-500 font-semibold">50</span> (中等可行)
            </div>
          </div>
        </section>

        {/* ── 数据来源 ── */}
        <section>
          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Info size={13} className="text-amber-500" /> 支持的真实数据来源
          </h4>
          <ul className="space-y-1 text-xs text-muted-foreground list-disc ml-4">
            <li>Materials Project API — 15万+ 无机材料计算属性 (band gap, formation energy, crystal structure)</li>
            <li>NIST Chemistry WebBook — 化合物热力学数据</li>
            <li>开放获取论文 — Scientific Reports, RSC Advances, MDPI Catalysts 等</li>
            <li>领域知识库 — 基于 2024 年发表的 10+ 篇光催化/材料论文的典型参数</li>
          </ul>
        </section>

      </div>
    </DialogContent>
  );
}

// Simple edit icon (avoiding Lucide import if not available)
function Edit2({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
      <path d="m15 5 4 4"/>
    </svg>
  );
}
