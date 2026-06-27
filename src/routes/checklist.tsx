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
import { useState, useMemo, useCallback } from "react";
import {
  ListChecks, Sparkles, Upload, FileText, AlertTriangle,
  CheckCircle2, Lightbulb, RotateCcw, ChevronDown, ChevronUp,
  Download, Loader2, Search, X, Target, Shield, Zap,
  ArrowRight, BookOpen, Beaker, Gauge, Eye, EyeOff, Copy,
  Info, ExternalLink, Filter,
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
import { queryDomainKnowledge } from "../lib/domain-knowledge";
import { SRTIO3_PAPER, SRTIO3_PRESET_AUDIT, REAL_PAPERS } from "../lib/paper-test-data";
import { RequireAuth } from "../lib/auth-guard";

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
  const [paperSource, setPaperSource] = useState<"preset-srtio3" | "preset-co3o4" | "custom">("preset-srtio3");
  const [customPaperTitle, setCustomPaperTitle] = useState("");
  const [customPaperDoi, setCustomPaperDoi] = useState("");
  const [customMethods, setCustomMethods] = useState("");
  const [discipline, setDiscipline] = useState("材料科学");

  // 处理状态
  const [decomposing, setDecomposing] = useState(false);
  const [audit, setAudit] = useState<ReproductionAudit | null>(null);
  const [showPreset, setShowPreset] = useState(true);

  // UI 状态
  const [activeTab, setActiveTab] = useState<"params" | "gaps" | "protocol">("params");
  const [filterCategory, setFilterCategory] = useState<ParameterCategory | "all">("all");
  const [filterCertainty, setFilterCertainty] = useState<CertaintyLevel | "all">("all");
  const [expandedParam, setExpandedParam] = useState<Set<string>>(new Set());
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [gapFillValues, setGapFillValues] = useState<Record<string, string>>({});

  // ===== 获取当前论文内容 =====
  const getCurrentPaperData = useCallback(() => {
    if (paperSource === "preset-srtio3") {
      return {
        title: SRTIO3_PAPER.title,
        doi: SRTIO3_PAPER.doi,
        methods: SRTIO3_PAPER.methods,
      };
    }
    if (paperSource === "preset-co3o4") {
      const paper = REAL_PAPERS[1];
      return {
        title: paper.title,
        doi: paper.doi,
        methods: paper.methods,
      };
    }
    return {
      title: customPaperTitle || "未命名论文",
      doi: customPaperDoi || "手动输入",
      methods: customMethods,
    };
  }, [paperSource, customPaperTitle, customPaperDoi, customMethods]);

  // ===== 使用预设 Audit =====
  const loadPresetAudit = useCallback(() => {
    setAudit(SRTIO3_PRESET_AUDIT);
    setShowPreset(false);
    toast.success("已加载真实论文预设 Audit（SrTiO₃/rGO/g-C₃N₄）");
  }, []);

  // ===== AI 拆解 =====
  const runDecomposition = useCallback(async () => {
    const paper = getCurrentPaperData();
    if (!paper.methods.trim()) {
      toast.error("请先输入论文的实验方法段落");
      return;
    }

    setDecomposing(true);
    setShowPreset(false);
    try {
      const result = await decomposePaperMethods(
        paper.title,
        paper.doi,
        paper.methods,
        discipline,
      );
      setAudit(result);
      toast.success(`拆解完成：${result.parameters.length} 个参数，${result.gaps.length} 个缺口`);
    } catch (err) {
      console.error("[Audit] decomposition failed:", err);
      toast.error(`拆解失败: ${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setDecomposing(false);
    }
  }, [getCurrentPaperData, discipline]);

  // ===== 参数操作 =====
  const confirmParam = useCallback((paramName: string, value: string) => {
    if (!audit) return;
    const updated = {
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
    toast.success(`已确认: ${paramName}`);
  }, [audit]);

  const fillGap = useCallback((gapDesc: string, value: string) => {
    if (!audit) return;
    const updated = {
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
    toast.success("缺口已补全");
  }, [audit]);

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
      <div className="flex gap-2 mb-4">
        {(["preset-srtio3", "preset-co3o4", "custom"] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setPaperSource(opt)}
            className={`px-3 py-2 rounded-lg text-xs transition ${
              paperSource === opt
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:border-primary/40"
            }`}
          >
            {opt === "preset-srtio3" ? "📄 SrTiO₃ 论文 (Sci Rep 2024)" :
             opt === "preset-co3o4" ? "📄 Co₃O₄-rGO 论文 (Catalysts 2024)" :
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
            {paperSource === "preset-srtio3" ? SRTIO3_PAPER.title : REAL_PAPERS[1].title}
          </div>
          <p>DOI: {paperSource === "preset-srtio3" ? SRTIO3_PAPER.doi : REAL_PAPERS[1].doi}</p>
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
        </div>

        {/* How it works */}
        {showPreset && (
          <div className="card-soft p-6 mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Target size={20} className="text-primary"/> 如何解决"AI 只能靠推测"的问题？
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <StepCard
                num={1}
                title="拆解而非猜测"
                desc="AI 系统性地从论文 Methods 中提取每一个数值参数，区分「论文明确写出」「论文隐含」「需要推断」三个等级。不确定就是不确定，不假装知道。"
              />
              <StepCard
                num={2}
                title="领域知识校验"
                desc="每个推断都基于真实科研文献中的典型参数范围和公共数据库（Materials Project、NIST）。置信度透明标注，研究者可随时覆盖。"
              />
              <StepCard
                num={3}
                title="缺口驱动复现"
                desc="自动识别缺失但复现必需的信息，按关键程度排序。研究者逐项审核/补全后，生成可执行的复现协议。"
              />
            </div>
          </div>
        )}

        {/* Paper Input */}
        {renderPaperInput()}

        {/* Quick info */}
        <div className="mt-6 rounded-xl bg-secondary/30 p-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-foreground mb-1">
            <Info size={14}/> 支持的真实数据来源
          </p>
          <ul className="space-y-1 ml-6 list-disc">
            <li>Materials Project API — 15万+ 无机材料计算属性 (band gap, formation energy, crystal structure)</li>
            <li>NIST Chemistry WebBook — 化合物热力学数据</li>
            <li>开放获取论文 — Scientific Reports, RSC Advances, MDPI Catalysts 等</li>
            <li>领域知识库 — 基于 2024 年发表的 10+ 篇光催化/材料论文的典型参数</li>
          </ul>
        </div>
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
          onClick={() => { setAudit(null); setShowPreset(true); }}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
        >
          <RotateCcw size={14}/> 重新开始
        </button>
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

      {/* Loading */}
      {decomposing && (
        <div className="card-soft p-12 text-center mb-6">
          <Loader2 size={40} className="animate-spin mx-auto text-primary"/>
          <p className="mt-4 font-semibold">AI 正在拆解论文实验方法…</p>
          <p className="mt-2 text-sm text-muted-foreground">
            提取结构化复现参数，标注确定性等级，识别信息缺口
          </p>
        </div>
      )}

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

function StepCard({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border p-4 hover:border-primary/30 transition">
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {num}
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
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
