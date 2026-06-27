/**
 * AI 科研 Agent — 选择实验卡片作为知识边界，展示 Agent 工作流
 */
import { useState, useMemo } from "react";
import { useLab } from "../lib/labStore";
import {
  MessageCircle, X, Sparkles, Loader2, Send, FileText, Target,
  ArrowUpRight, CheckCircle2, Filter, BookOpen, Brain, Search,
  GitBranch, Layers, Zap, Play,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

// Agent 工作流步骤
const WORKFLOW_STEPS = [
  { key: "retrieve", label: "检索相关实验", icon: <Search size={12}/> },
  { key: "extract", label: "提取关键参数", icon: <FileText size={12}/> },
  { key: "crosscheck", label: "交叉验证对比", icon: <GitBranch size={12}/> },
  { key: "synthesize", label: "综合分析", icon: <Brain size={12}/> },
  { key: "respond", label: "生成回答", icon: <Sparkles size={12}/> },
];

export function AIAgent() {
  const { experiments } = useLab();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // 卡片选择
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(experiments.map((e) => e.id)));
  const [selectAll, setSelectAll] = useState(true);

  // 边界设定
  const [showSettings, setShowSettings] = useState(false);
  const [scope, setScope] = useState<"all" | "selected" | "single">("selected");

  // 对话
  const [chat, setChat] = useState<Array<{ role: "user" | "agent"; text: string; sources?: Array<{ doc: string; conf: string; link: string }>; workflow?: boolean }>>([
    {
      role: "agent",
      text: `你好！我是 LabNote Agent，已加载 ${experiments.length} 张实验卡片作为知识库。你可以限定查询范围，我会展示完整的分析工作流。`,
      workflow: false,
    },
  ]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [workflowStep, setWorkflowStep] = useState(-1);

  // 当前激活的卡片（根据 scope）
  const activeCards = useMemo(() => {
    if (scope === "all") return experiments;
    if (scope === "single") return experiments.length > 0 ? [experiments[0]] : [];
    return experiments.filter((e) => selectedIds.has(e.id));
  }, [scope, selectedIds, experiments]);

  const toggleCard = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
    setSelectAll(next.size === experiments.length);
  };

  const toggleAll = () => {
    if (selectAll) { setSelectedIds(new Set()); setSelectAll(false); }
    else { setSelectedIds(new Set(experiments.map((e) => e.id))); setSelectAll(true); }
  };

  // ===== 发送消息 + 工作流动画 =====
  const send = (text?: string) => {
    const t = (text ?? q).trim();
    if (!t || loading) return;
    setChat((c) => [...c, { role: "user", text: t }]);
    setQ("");
    setLoading(true);
    setWorkflowStep(0);

    // 逐步展示工作流
    const delays = [600, 1000, 800, 1200, 700];
    let step = 0;
    const advanceStep = () => {
      if (step < WORKFLOW_STEPS.length - 1) {
        step++;
        setWorkflowStep(step);
        setTimeout(advanceStep, delays[step]);
      } else {
        // 最后一步：生成回答
        setTimeout(() => {
          setChat((c) => [...c, {
            role: "agent",
            text: "知识问答即将接入 Supabase pgvector 向量检索。当前过渡期请在实验卡片中直接查看数据。",
            sources: activeCards.slice(0, 2).map((e) => ({ doc: e.name, conf: "待验证", link: `/workbench?id=${e.id}` })),
          }]);
          setLoading(false);
          setWorkflowStep(-1);
        }, delays[delays.length - 1]);
      }
    };
    setTimeout(advanceStep, delays[0]);
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-all ${
          open ? "bg-secondary text-foreground scale-90" : "bg-primary text-primary-foreground hover:scale-105 shadow-primary/20"
        }`}
      >
        {open ? <X size={22}/> : <Brain size={22}/>}
      </button>

      {/* Agent 面板 */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[440px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "calc(100vh - 140px)" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary-soft/30 to-secondary/40">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Brain size={15}/>
              </span>
              <div>
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  LabNote Agent
                  <span className="text-[9px] bg-primary-soft text-primary px-1.5 py-0.5 rounded-full">科研专用</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {scope === "all" ? `全部 ${experiments.length} 张卡片` : scope === "single" ? `单卡片：${activeCards[0]?.name?.slice(0, 20) || "—"}` : `已选 ${selectedIds.size} 张卡片`}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg text-xs transition ${showSettings ? "bg-primary-soft text-primary" : "hover:bg-secondary text-muted-foreground"}`}>
                <Filter size={14}/>
              </button>
            </div>
          </div>

          {/* 边界设定面板 */}
          {showSettings && (
            <div className="px-4 py-3 border-b border-border bg-secondary/30 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Layers size={12}/> 知识边界设定
              </div>
              {/* 范围 */}
              <div className="flex gap-1.5">
                {[
                  { key: "all", label: "全部卡片" },
                  { key: "selected", label: "自选卡片" },
                  { key: "single", label: "单卡片深度" },
                ].map((s) => (
                  <button key={s.key}
                    onClick={() => setScope(s.key as typeof scope)}
                    className={`flex-1 rounded-lg px-2.5 py-1.5 text-[11px] transition ${
                      scope === s.key ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:border-primary/40"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {/* 卡片选择列表 */}
              {scope === "selected" && (
                <div className="max-h-[140px] overflow-auto space-y-0.5">
                  <label className="flex items-center gap-2 text-[11px] cursor-pointer px-1 py-1 hover:bg-secondary rounded">
                    <input type="checkbox" checked={selectAll} onChange={toggleAll}
                      className="accent-primary"/>
                    <span className="text-muted-foreground">全选 / 全不选</span>
                  </label>
                  {experiments.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-[11px] cursor-pointer px-1 py-1 hover:bg-secondary rounded">
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleCard(e.id)}
                        className="accent-primary"/>
                      <span className="truncate">{e.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{e.sample.id}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 对话区 */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[320px]">
            {chat.map((m, i) => (
              <div key={i}>
                <div className={`text-xs rounded-xl px-3 py-2 leading-relaxed ${
                  m.role === "user" ? "bg-primary text-primary-foreground ml-6" : "bg-secondary mr-4"
                }`}>
                  {m.text}
                </div>
                {/* 来源引用 */}
                {m.role === "agent" && m.sources && m.sources.length > 0 && (
                  <div className="mt-1.5 mr-4 rounded-lg border border-border bg-card p-2">
                    <div className="text-[10px] text-muted-foreground font-semibold mb-1 flex items-center gap-1">
                      <FileText size={10}/> 来源卡片
                    </div>
                    {m.sources.map((s, idx) => (
                      <button key={idx} onClick={() => navigate({ to: s.link })}
                        className="w-full flex items-center justify-between text-[10px] py-1 hover:bg-secondary rounded px-1">
                        <span className="flex items-center gap-1 truncate">
                          <Target size={9} className="text-[color:var(--color-success)]"/>
                          {s.doc}
                        </span>
                        <span className="shrink-0 text-primary flex items-center gap-0.5">
                          <ArrowUpRight size={9}/>查看
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Agent 工作流展示 */}
            {loading && workflowStep >= 0 && (
              <div className="mr-4 rounded-xl bg-primary-soft/10 border border-primary/15 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
                  <Loader2 className="animate-spin" size={12}/>
                  Agent 正在分析
                </div>
                <div className="space-y-1.5">
                  {WORKFLOW_STEPS.map((ws, i) => {
                    const done = i < workflowStep;
                    const active = i === workflowStep;
                    return (
                      <div key={ws.key} className="flex items-center gap-2 text-[10px]">
                        <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                          done ? "bg-[color:var(--color-success)] text-white"
                            : active ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          {done ? "✓" : active ? "·" : ""}
                        </span>
                        <span className={done ? "text-[color:var(--color-success)]" : active ? "text-primary font-medium" : "text-muted-foreground"}>
                          {ws.icon} {ws.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 快捷提问 */}
          <div className="px-4 py-2 border-t border-border flex flex-wrap gap-1.5">
            {[
              `Fe₃O₄的降解率最佳条件？`,
              "哪些实验有异常记录？",
              "对比这几次实验的晶粒尺寸",
            ].slice(0, activeCards.length > 0 ? 3 : 1).map((s) => (
              <button key={s} onClick={() => send(s)}
                className="text-[10px] rounded-full border border-border px-2.5 py-1 hover:border-primary/40 hover:bg-primary-soft transition">
                {s}
              </button>
            ))}
          </div>

          {/* 输入 */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={activeCards.length > 0 ? `基于 ${activeCards.length} 张卡片提问…` : "请先选择实验卡片…"}
              disabled={activeCards.length === 0}
              className="flex-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            />
            <button onClick={() => send()}
              disabled={loading || activeCards.length === 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <Send size={13}/>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
