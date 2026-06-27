import { Q as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { Q as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { c as createRouter, a as createRootRouteWithContext, u as useRouter, L as Link, O as Outlet, H as HeadContent, S as Scripts, b as createFileRoute, l as lazyRouteComponent, d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { T as Toaster } from "../_libs/sonner.mjs";
import { F as FlaskConical, H as House, B as Beaker, L as Layers, a as ListChecks, N as Network, P as Package, b as BookOpen, U as UserCheck, C as CircleQuestionMark, S as Search, c as Settings, d as Book, e as FileText, f as Code, g as ClipboardList, M as Mail, h as MessageSquare, i as Users, X, j as Brain, k as Funnel, T as Target, A as ArrowUpRight, l as LoaderCircle, m as Send, G as GitBranch, n as Sparkles } from "../_libs/lucide-react.mjs";
import { o as objectType, s as stringType } from "../_libs/zod.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
const appCss = "/assets/styles-C7BdqF_u.css";
function reportLovableError(error, context = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error"
    }
  );
}
const newId = () => "exp_" + Math.random().toString(36).slice(2, 9);
const seed = [
  {
    id: newId(),
    name: "Fe-2309 管式炉退火工艺优化",
    date: "2026-05-28 14:30",
    operator: "张子萱",
    purpose: "探索退火温度对铁基样品晶粒尺寸的影响",
    background: "前期 XRD 结果显示晶粒尺寸偏小，需优化热处理工艺。",
    device: { name: "管式炉", model: "OTF-1200X", vendor: "合肥科晶" },
    sample: { id: "Fe-2309", batch: "B-20260520", source: "课题组自制" },
    params: [
      { name: "退火温度", value: "550", unit: "℃" },
      { name: "保温时间", value: "60", unit: "min" },
      { name: "升温速率", value: "5", unit: "℃/min" },
      { name: "气氛", value: "Ar", unit: "" }
    ],
    environment: { temperature: "24", humidity: "45", other: "标准实验室环境" },
    steps: [
      "称取 Fe-2309 样品 0.5g 放入瓷舟",
      "通入氩气置换炉腔空气 15 min",
      "以 5 ℃/min 升温至 550 ℃",
      "保温 60 min",
      "自然冷却至室温后取出"
    ],
    results: "样品颜色由灰黑色转为银灰色，待 XRD 表征。",
    notes: "升温过程中第 40 min 出现短暂温度波动 ±3 ℃。",
    source: "示例数据",
    discipline: "材料科学"
  },
  {
    id: newId(),
    name: "CuO 纳米片水热合成",
    date: "2026-05-25 09:10",
    operator: "李文博",
    purpose: "合成片状 CuO 用于电催化测试",
    background: "",
    device: { name: "水热反应釜", model: "100mL-PTFE", vendor: "" },
    sample: { id: "CuO-0525", batch: "", source: "" },
    params: [
      { name: "反应温度", value: "180", unit: "℃" },
      { name: "反应时间", value: "12", unit: "h" },
      { name: "前驱体浓度", value: "0.1", unit: "M" }
    ],
    environment: { temperature: "", humidity: "", other: "" },
    steps: ["配制 Cu(NO3)2 溶液", "加入 NaOH 调节 pH", "180℃ 水热反应 12h"],
    results: "得到蓝黑色沉淀，SEM 待测。",
    notes: "缺少前驱体批次与设备厂家信息。",
    source: "示例数据",
    discipline: "材料科学"
  },
  {
    id: newId(),
    name: "Pt/C 电极 CV 循环测试",
    date: "2026-05-20 16:45",
    operator: "王思琪",
    purpose: "评估 Pt/C 电极在酸性介质中的电化学稳定性",
    background: "对比商用 20% Pt/C 与自制催化剂的活性差异。",
    device: { name: "电化学工作站", model: "CHI760E", vendor: "上海辰华" },
    sample: { id: "PtC-Lab-03", batch: "B-20260518", source: "自制" },
    params: [
      { name: "扫描速率", value: "50", unit: "mV/s" },
      { name: "电位窗口", value: "0~1.2", unit: "V" },
      { name: "循环圈数", value: "1000", unit: "cycle" },
      { name: "电解液", value: "0.5 M H2SO4", unit: "" }
    ],
    environment: { temperature: "25", humidity: "50", other: "N2 饱和" },
    steps: [
      "组装三电极体系（工作/对/参比）",
      "N2 鼓泡 30 min 除氧",
      "0~1.2V 区间扫描 1000 圈",
      "记录前后 ECSA 变化"
    ],
    results: "1000 圈后 ECSA 衰减约 18%，第 320 圈观察到电流异常尖峰。",
    notes: "电流异常可能与气泡附着有关。",
    source: "示例数据",
    discipline: "化学"
  }
];
const LabCtx = reactExports.createContext(null);
function LabProvider({ children }) {
  const [experiments, setExperiments] = reactExports.useState(seed);
  const [profile, setProfile] = reactExports.useState({
    name: "研究员",
    org: "智能材料课题组",
    discipline: "材料科学"
  });
  const addExperiment = reactExports.useCallback(
    (e) => setExperiments((arr) => [e, ...arr]),
    []
  );
  const updateExperiment = reactExports.useCallback(
    (id, patch) => setExperiments((arr) => arr.map((x) => x.id === id ? { ...x, ...patch } : x)),
    []
  );
  const deleteExperiment = reactExports.useCallback(
    (id) => setExperiments((arr) => arr.filter((x) => x.id !== id)),
    []
  );
  const getById = reactExports.useCallback(
    (id) => experiments.find((x) => x.id === id),
    [experiments]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    LabCtx.Provider,
    {
      value: {
        experiments,
        addExperiment,
        updateExperiment,
        deleteExperiment,
        getById,
        profile,
        setProfile
      },
      children
    }
  );
}
function useLab() {
  const ctx = reactExports.useContext(LabCtx);
  if (!ctx) throw new Error("useLab must be used within LabProvider");
  return ctx;
}
function mockCardFromFile(fileName) {
  const lower = fileName.toLowerCase();
  const base = {
    id: newId(),
    name: `解析自 ${fileName}`,
    date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " "),
    operator: "未识别",
    purpose: "",
    background: "",
    device: { name: "", model: "", vendor: "" },
    sample: { id: "", batch: "", source: "" },
    params: [],
    environment: { temperature: "", humidity: "", other: "" },
    steps: [],
    results: "",
    notes: "通过多模态解析自动生成，建议人工复核。",
    source: "文件上传",
    discipline: "材料科学"
  };
  if (lower.includes("xrd")) {
    base.name = "XRD 表征记录（自动解析）";
    base.device = { name: "X 射线衍射仪", model: "D8 Advance", vendor: "Bruker" };
    base.params = [
      { name: "扫描角度", value: "10-80", unit: "°" },
      { name: "扫描速率", value: "5", unit: "°/min" },
      { name: "靶材", value: "Cu Kα", unit: "" }
    ];
    base.results = "出现 (110)、(200) 衍射峰，与铁基相吻合。";
  } else if (lower.includes("sem")) {
    base.name = "SEM 形貌观察（自动解析）";
    base.device = { name: "扫描电镜", model: "SU8010", vendor: "Hitachi" };
    base.params = [
      { name: "加速电压", value: "5", unit: "kV" },
      { name: "工作距离", value: "8", unit: "mm" }
    ];
  } else if (lower.includes("cv") || lower.includes("电化学")) {
    base.name = "电化学 CV 测试（自动解析）";
    base.device = { name: "电化学工作站", model: "CHI760E", vendor: "上海辰华" };
    base.params = [
      { name: "扫描速率", value: "50", unit: "mV/s" },
      { name: "电位窗口", value: "0~1.2", unit: "V" }
    ];
  } else if (lower.endsWith(".xlsx") || lower.endsWith(".csv")) {
    base.name = "表格数据导入（自动解析）";
    base.results = "已识别 3 个数据列，请在结果区粘贴关键数据。";
  } else if (lower.endsWith(".pdf") || lower.endsWith(".docx")) {
    base.name = "文献/报告解析";
    base.purpose = "从文档中抽取实验方法学信息";
    base.params = [
      { name: "反应温度", value: "180", unit: "℃" },
      { name: "反应时间", value: "12", unit: "h" }
    ];
  }
  return base;
}
function mockCardFromVoice(text) {
  const tempMatch = text.match(/(\d+(?:\.\d+)?)\s*[℃度]/);
  const timeMatch = text.match(/(\d+)\s*(分钟|min|小时|h)/);
  const sampleMatch = text.match(/([A-Z][a-z]?-\d+)/);
  return {
    id: newId(),
    name: text.length > 24 ? text.slice(0, 24) + "..." : text,
    date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " "),
    operator: "语音记录",
    purpose: "",
    background: "",
    device: text.includes("管式炉") ? { name: "管式炉", model: "OTF-1200X", vendor: "合肥科晶" } : { name: "", model: "", vendor: "" },
    sample: sampleMatch ? { id: sampleMatch[1], batch: "", source: "" } : { id: "", batch: "", source: "" },
    params: [
      ...tempMatch ? [{ name: "温度", value: tempMatch[1], unit: "℃" }] : [],
      ...timeMatch ? [{ name: "时间", value: timeMatch[1], unit: timeMatch[2] }] : [],
      ...text.includes("氩气") ? [{ name: "气氛", value: "Ar", unit: "" }] : []
    ],
    environment: { temperature: "", humidity: "", other: "" },
    steps: [text],
    results: "",
    notes: "由语音 ASR 模拟生成，建议补充设备型号与样品批次。",
    source: "语音录入模拟",
    discipline: "材料科学"
  };
}
function checkCompleteness(e) {
  const miss = [];
  if (!e.operator || e.operator === "未识别") miss.push("实验人员");
  if (!e.purpose) miss.push("实验目的");
  if (!e.device.model) miss.push("设备型号");
  if (!e.device.vendor) miss.push("设备厂家");
  if (!e.sample.id) miss.push("样品编号");
  if (!e.sample.batch) miss.push("样品批次");
  if (!e.environment.temperature) miss.push("环境温度");
  if (e.steps.length < 2) miss.push("详细实验步骤（至少 2 步）");
  if (!e.results) miss.push("结果数据描述");
  e.params.forEach((p) => {
    if (p.value && !p.unit && !["气氛", "电解液"].includes(p.name))
      miss.push(`参数「${p.name}」缺少单位`);
  });
  if (e.params.length === 0) miss.push("关键实验参数");
  return miss;
}
function generateMethods(e) {
  const paramStr = e.params.map((p) => `${p.name} ${p.value}${p.unit ? " " + p.unit : ""}`).join("，");
  return `实验于 ${e.date} 由 ${e.operator || "操作人员"} 完成。采用 ${e.device.vendor || "（厂家）"} ${e.device.name || "（设备）"}（型号 ${e.device.model || "N/A"}）对样品 ${e.sample.id || "（样品编号）"}（批次 ${e.sample.batch || "N/A"}）进行处理。主要实验参数为：${paramStr || "（待补充）"}。实验流程如下：${e.steps.length ? e.steps.map((s, i) => `(${i + 1}) ${s}`).join("；") : "（待补充）"}。环境条件：温度 ${e.environment.temperature || "N/A"} ℃，湿度 ${e.environment.humidity || "N/A"} %。${e.results ? "结果：" + e.results : ""}`;
}
function ragAnswer(question, experiments) {
  const q = question.toLowerCase();
  const sampleMatch = question.match(/([A-Z][a-z]?-\d+)/);
  if (sampleMatch) {
    const hits = experiments.filter((e) => e.sample.id === sampleMatch[1]);
    if (hits.length) {
      const e = hits[0];
      const temp = e.params.find((p) => p.name.includes("温度"));
      return `命中 ${hits.length} 条记录。样品 ${sampleMatch[1]} 最近一次实验（${e.date}）${temp ? `相关温度为 ${temp.value}${temp.unit}` : "未直接记录温度参数"}。详见实验「${e.name}」。`;
    }
    return `知识库中暂无样品 ${sampleMatch[1]} 的相关记录。`;
  }
  if (q.includes("异常") || q.includes("故障") || q.includes("问题")) {
    const hits = experiments.filter(
      (e) => /异常|故障|波动|尖峰|失败/.test(e.notes + e.results)
    );
    return hits.length ? `检索到 ${hits.length} 条含异常记录：` + hits.map((e) => `「${e.name}」(${e.date})`).join("、") : "未发现异常记录。";
  }
  if (q.includes("退火") || q.includes("温度")) {
    const hits = experiments.filter(
      (e) => e.params.some((p) => p.name.includes("温度"))
    );
    return `共 ${hits.length} 条实验包含温度参数。例如：${hits.slice(0, 3).map((e) => {
      const t = e.params.find((p) => p.name.includes("温度"));
      return `「${e.name}」温度 ${t?.value}${t?.unit}`;
    }).join("；")}。`;
  }
  if (q.includes("结论") || q.includes("支持") || q.includes("论文")) {
    return "基于现有 " + experiments.length + " 条实验记录，参数趋势与结论方向一致；建议补充重复性实验（建议 ≥3 次）以提升统计显著性。";
  }
  if (q.includes("设备") || q.includes("仪器")) {
    const devices = Array.from(
      new Set(experiments.map((e) => e.device.name).filter(Boolean))
    );
    return `知识库涉及设备：${devices.join("、") || "暂无"}。`;
  }
  return `已在 ${experiments.length} 条实验记录中检索。建议尝试：① 输入样品编号（如 Fe-2309）② 询问"异常实验" ③ 询问"退火温度" ④ 询问"使用了哪些设备" ⑤ 询问结论支撑情况。`;
}
const WORKFLOW_STEPS = [
  { key: "retrieve", label: "检索相关实验", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 12 }) },
  { key: "extract", label: "提取关键参数", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 12 }) },
  { key: "crosscheck", label: "交叉验证对比", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(GitBranch, { size: 12 }) },
  { key: "synthesize", label: "综合分析", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { size: 12 }) },
  { key: "respond", label: "生成回答", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 12 }) }
];
function AIAgent() {
  const { experiments } = useLab();
  const navigate = useNavigate();
  const [open, setOpen] = reactExports.useState(false);
  const [selectedIds, setSelectedIds] = reactExports.useState(new Set(experiments.map((e) => e.id)));
  const [selectAll, setSelectAll] = reactExports.useState(true);
  const [showSettings, setShowSettings] = reactExports.useState(false);
  const [scope, setScope] = reactExports.useState("selected");
  const [chat, setChat] = reactExports.useState([
    {
      role: "agent",
      text: `你好！我是 LabNote Agent，已加载 ${experiments.length} 张实验卡片作为知识库。你可以限定查询范围，我会展示完整的分析工作流。`,
      workflow: false
    }
  ]);
  const [q, setQ] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  const [workflowStep, setWorkflowStep] = reactExports.useState(-1);
  const activeCards = reactExports.useMemo(() => {
    if (scope === "all") return experiments;
    if (scope === "single") return experiments.length > 0 ? [experiments[0]] : [];
    return experiments.filter((e) => selectedIds.has(e.id));
  }, [scope, selectedIds, experiments]);
  const toggleCard = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    setSelectAll(next.size === experiments.length);
  };
  const toggleAll = () => {
    if (selectAll) {
      setSelectedIds(/* @__PURE__ */ new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(experiments.map((e) => e.id)));
      setSelectAll(true);
    }
  };
  const send = (text) => {
    const t = (text ?? q).trim();
    if (!t || loading) return;
    setChat((c) => [...c, { role: "user", text: t }]);
    setQ("");
    setLoading(true);
    setWorkflowStep(0);
    const delays = [600, 1e3, 800, 1200, 700];
    let step = 0;
    const advanceStep = () => {
      if (step < WORKFLOW_STEPS.length - 1) {
        step++;
        setWorkflowStep(step);
        setTimeout(advanceStep, delays[step]);
      } else {
        setTimeout(() => {
          const answer = ragAnswer(t, activeCards);
          const sources = buildSources(answer, activeCards);
          setChat((c) => [...c, { role: "agent", text: answer, sources }]);
          setLoading(false);
          setWorkflowStep(-1);
        }, delays[delays.length - 1]);
      }
    };
    setTimeout(advanceStep, delays[0]);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => setOpen(!open),
        className: `fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-all ${open ? "bg-secondary text-foreground scale-90" : "bg-primary text-primary-foreground hover:scale-105 shadow-primary/20"}`,
        children: open ? /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 22 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { size: 22 })
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "fixed bottom-24 right-6 z-50 w-[440px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col",
        style: { maxHeight: "calc(100vh - 140px)" },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary-soft/30 to-secondary/40", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { size: 15 }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm font-semibold flex items-center gap-1.5", children: [
                  "LabNote Agent",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] bg-primary-soft text-primary px-1.5 py-0.5 rounded-full", children: "科研专用" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground", children: scope === "all" ? `全部 ${experiments.length} 张卡片` : scope === "single" ? `单卡片：${activeCards[0]?.name?.slice(0, 20) || "—"}` : `已选 ${selectedIds.size} 张卡片` })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => setShowSettings(!showSettings),
                className: `p-1.5 rounded-lg text-xs transition ${showSettings ? "bg-primary-soft text-primary" : "hover:bg-secondary text-muted-foreground"}`,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Funnel, { size: 14 })
              }
            ) })
          ] }),
          showSettings && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-b border-border bg-secondary/30 space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs font-semibold text-muted-foreground flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { size: 12 }),
              " 知识边界设定"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1.5", children: [
              { key: "all", label: "全部卡片" },
              { key: "selected", label: "自选卡片" },
              { key: "single", label: "单卡片深度" }
            ].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => setScope(s.key),
                className: `flex-1 rounded-lg px-2.5 py-1.5 text-[11px] transition ${scope === s.key ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:border-primary/40"}`,
                children: s.label
              },
              s.key
            )) }),
            scope === "selected" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-[140px] overflow-auto space-y-0.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-[11px] cursor-pointer px-1 py-1 hover:bg-secondary rounded", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: selectAll,
                    onChange: toggleAll,
                    className: "accent-primary"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "全选 / 全不选" })
              ] }),
              experiments.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-[11px] cursor-pointer px-1 py-1 hover:bg-secondary rounded", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: selectedIds.has(e.id),
                    onChange: () => toggleCard(e.id),
                    className: "accent-primary"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: e.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground shrink-0", children: e.sample.id })
              ] }, e.id))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[320px]", children: [
            chat.map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-xs rounded-xl px-3 py-2 leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground ml-6" : "bg-secondary mr-4"}`, children: m.text }),
              m.role === "agent" && m.sources && m.sources.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 mr-4 rounded-lg border border-border bg-card p-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-muted-foreground font-semibold mb-1 flex items-center gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 10 }),
                  " 来源卡片"
                ] }),
                m.sources.map((s, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    onClick: () => navigate({ to: s.link }),
                    className: "w-full flex items-center justify-between text-[10px] py-1 hover:bg-secondary rounded px-1",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 truncate", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Target, { size: 9, className: "text-[color:var(--color-success)]" }),
                        s.doc
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0 text-primary flex items-center gap-0.5", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { size: 9 }),
                        "查看"
                      ] })
                    ]
                  },
                  idx
                ))
              ] })
            ] }, i)),
            loading && workflowStep >= 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mr-4 rounded-xl bg-primary-soft/10 border border-primary/15 p-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs font-semibold text-primary mb-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "animate-spin", size: 12 }),
                "Agent 正在分析"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5", children: WORKFLOW_STEPS.map((ws, i) => {
                const done = i < workflowStep;
                const active = i === workflowStep;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-[10px]", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${done ? "bg-[color:var(--color-success)] text-white" : active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`, children: done ? "✓" : active ? "·" : "" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: done ? "text-[color:var(--color-success)]" : active ? "text-primary font-medium" : "text-muted-foreground", children: [
                    ws.icon,
                    " ",
                    ws.label
                  ] })
                ] }, ws.key);
              }) })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-2 border-t border-border flex flex-wrap gap-1.5", children: [
            `Fe₃O₄的降解率最佳条件？`,
            "哪些实验有异常记录？",
            "对比这几次实验的晶粒尺寸"
          ].slice(0, activeCards.length > 0 ? 3 : 1).map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => send(s),
              className: "text-[10px] rounded-full border border-border px-2.5 py-1 hover:border-primary/40 hover:bg-primary-soft transition",
              children: s
            },
            s
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-4 py-3 border-t border-border", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                value: q,
                onChange: (e) => setQ(e.target.value),
                onKeyDown: (e) => e.key === "Enter" && send(),
                placeholder: activeCards.length > 0 ? `基于 ${activeCards.length} 张卡片提问…` : "请先选择实验卡片…",
                disabled: activeCards.length === 0,
                className: "flex-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => send(),
                disabled: loading || activeCards.length === 0,
                className: "flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { size: 13 })
              }
            )
          ] })
        ]
      }
    )
  ] });
}
function buildSources(text, cards) {
  const sources = [];
  const sampleMatch = text.match(/([A-Z][a-z]?-\d+)/);
  if (sampleMatch) {
    const e = cards.find((x) => x.sample.id === sampleMatch[1]);
    if (e) sources.push({ doc: e.name, conf: "98%", link: `/workbench?id=${e.id}` });
  }
  for (const e of cards.slice(0, 2)) {
    if (!sources.find((s) => s.doc === e.name)) {
      sources.push({ doc: e.name, conf: "94%", link: `/workbench?id=${e.id}` });
    }
  }
  return sources;
}
function NotFoundComponent() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-7xl font-bold text-foreground", children: "404" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-muted-foreground", children: "页面未找到" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/", className: "mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground", children: "返回首页" })
  ] }) });
}
function ErrorComponent({ error, reset }) {
  const router2 = useRouter();
  reactExports.useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root" });
  }, [error]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold", children: "页面加载失败" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: error.message }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          router2.invalidate();
          reset();
        },
        className: "mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground",
        children: "重试"
      }
    )
  ] }) });
}
const Route$a = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LabNote Agent – 科研数据治理与实验复现 AI Agent" },
      { name: "description", content: "让每一次实验都成为可复用的科研资产。多源数据采集、智能清洗、复现实验与 RAG 知识问答。" },
      { property: "og:title", content: "LabNote Agent – 科研数据治理与实验复现 AI Agent" },
      { name: "twitter:title", content: "LabNote Agent – 科研数据治理与实验复现 AI Agent" },
      { property: "og:description", content: "让每一次实验都成为可复用的科研资产。多源数据采集、智能清洗、复现实验与 RAG 知识问答。" },
      { name: "twitter:description", content: "让每一次实验都成为可复用的科研资产。多源数据采集、智能清洗、复现实验与 RAG 知识问答。" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bcdfd8ab-3aa2-4b72-ae09-6b808bd44534/id-preview-18a71f3d--e3c37d0c-76c3-4f7c-bc94-50e4081f0385.lovable.app-1780213454771.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bcdfd8ab-3aa2-4b72-ae09-6b808bd44534/id-preview-18a71f3d--e3c37d0c-76c3-4f7c-bc94-50e4081f0385.lovable.app-1780213454771.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" }
    ],
    links: [{ rel: "stylesheet", href: appCss }]
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent
});
function RootShell({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("html", { lang: "zh-CN", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("head", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsxRuntimeExports.jsx(Scripts, {})
    ] })
  ] });
}
function RootComponent() {
  const { queryClient } = Route$a.useRouteContext();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(LabProvider, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen flex flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TopNav, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Footer, {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Toaster, { position: "top-right", richColors: true }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AIAgent, {})
  ] }) });
}
function TopNav() {
  const [searchOpen, setSearchOpen] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "no-print sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto flex h-16 max-w-7xl items-center gap-6 px-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/", className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FlaskConical, { size: 20 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "leading-tight", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-base font-semibold", children: "LabNote Agent" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground", children: "科研数据治理 · 实验复现" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "hidden md:flex items-center gap-0.5 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { to: "/", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(House, { size: 14 }), children: "首页" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { to: "/workbench", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Beaker, { size: 14 }), children: "工作台" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { to: "/compare", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { size: 14 }), children: "治理对比" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { to: "/checklist", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ListChecks, { size: 14 }), children: "Checklist" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { to: "/graph", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Network, { size: 14 }), children: "知识图谱" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { to: "/assets", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { size: 14 }), children: "资产包" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { to: "/paper", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { size: 14 }), children: "论文辅助" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { to: "/handoff", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(UserCheck, { size: 14 }), children: "项目交接" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { to: "/help", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleQuestionMark, { size: 14 }), children: "帮助" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setSearchOpen(true),
            className: "flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 transition",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 14 }),
              " 全局搜索…"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/settings", className: "rounded-lg p-2 hover:bg-secondary transition", "aria-label": "设置", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { size: 16 }) })
      ] })
    ] }),
    searchOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(GlobalSearch, { onClose: () => setSearchOpen(false) })
  ] });
}
function NavItem({ to, icon, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Link,
    {
      to,
      activeProps: { className: "bg-primary-soft text-primary" },
      activeOptions: { exact: to === "/" },
      className: "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-foreground/80 hover:text-foreground hover:bg-secondary transition",
      children: [
        icon,
        children
      ]
    }
  );
}
function GlobalSearch({ onClose }) {
  const { experiments } = useLab();
  const [q, setQ] = reactExports.useState("");
  const results = experiments.filter((e) => {
    if (!q.trim()) return false;
    const hay = (e.name + e.sample.id + e.device.name + e.date + e.operator).toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-start justify-center pt-24 px-4", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft w-full max-w-xl p-4", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 border-b border-border pb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 16, className: "text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          autoFocus: true,
          value: q,
          onChange: (e) => setQ(e.target.value),
          placeholder: "搜索实验名称、样品编号、设备名称…",
          className: "flex-1 bg-transparent outline-none text-sm"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "text-xs text-muted-foreground", children: "Esc" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-80 overflow-auto mt-2", children: [
      q && results.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground p-4 text-center", children: "无匹配结果" }),
      results.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Link,
        {
          to: "/workbench",
          search: { id: e.id },
          onClick: onClose,
          className: "block rounded-lg p-3 hover:bg-secondary",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: e.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground mt-0.5", children: [
              e.date,
              " · ",
              e.operator,
              " · ",
              e.sample.id || "无样品编号",
              " · ",
              e.device.name || "未指定设备"
            ] })
          ]
        },
        e.id
      )),
      !q && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground p-4 text-center", children: "输入关键词开始检索" })
    ] })
  ] }) });
}
function Footer() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("footer", { className: "no-print border-t border-border mt-12", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-7xl px-4 py-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center mb-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "欢迎科研团队、实验课程及创新创业团队与我们交流合作" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FlaskConical, { size: 16 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold", children: "LabNote Agent" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground leading-relaxed", children: [
          "科研数据治理与实验复现 AI Agent",
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          "让每一次实验都成为可复用的科研资产"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 text-[10px] text-muted-foreground/60", children: "技术生态伙伴：思必驰（AISpeech）智能终端 · 多模态大模型" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-sm font-semibold mb-4 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Book, { size: 14, className: "text-primary" }),
          "Resources"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "space-y-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/help", className: "text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 12 }),
            " 📘 使用指南（Getting Started）"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: "#", className: "text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 12 }),
            " 📄 产品白皮书（White Paper）"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: "#", className: "text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Code, { size: 12 }),
            " 🔗 API Documentation（预留）"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardList, { size: 12 }),
              " 📝 更新日志（Changelog）"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "mt-1.5 ml-5 space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "text-[10px] text-muted-foreground/70", children: "v1.0 实验记录管理" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "text-[10px] text-muted-foreground/70", children: "v1.1 AI科研问答" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "text-[10px] text-muted-foreground/70", children: "v1.2 Checklist生成" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-sm font-semibold mb-4 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { size: 14, className: "text-primary" }),
          "Contact"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "space-y-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-xs text-muted-foreground flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { size: 12 }),
            " 📧 官方邮箱：contact@labnote-agent.com"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: "#", className: "text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { size: 12 }),
            " 💬 Feedback（Bug反馈/功能建议）"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-xs text-muted-foreground flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { size: 12 }),
            " 👥 用户交流群（二维码预留）"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-10 pt-6 border-t border-border text-center text-[10px] text-muted-foreground/60", children: "© 2026 LabNote Agent. All rights reserved." })
  ] }) });
}
const $$splitComponentImporter$9 = () => import("./workbench-B0Px8Mfx.mjs");
const search = objectType({
  id: stringType().optional()
});
const Route$9 = createFileRoute("/workbench")({
  validateSearch: search,
  head: () => ({
    meta: [{
      title: "实验工作台 – LabNote Agent"
    }, {
      name: "description",
      content: "三栏式实验工作台：数据采集、结构化实验卡片编辑、复现助手与 RAG 知识问答。"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
const $$splitComponentImporter$8 = () => import("./settings-t6Y-Hrag.mjs");
const Route$8 = createFileRoute("/settings")({
  head: () => ({
    meta: [{
      title: "个人设置 – LabNote Agent"
    }, {
      name: "description",
      content: "配置个人资料与默认学科模板。"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
const $$splitComponentImporter$7 = () => import("./paper-CPMKgqQA.mjs");
const Route$7 = createFileRoute("/paper")({
  head: () => ({
    meta: [{
      title: "论文辅助 – LabNote Agent"
    }, {
      name: "description",
      content: "实验记录 → AI 整理 → Methods 初稿 → 人工确认 → 导出 Word。"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const $$splitComponentImporter$6 = () => import("./help-CGOEK-Pq.mjs");
const Route$6 = createFileRoute("/help")({
  head: () => ({
    meta: [{
      title: "帮助文档 – LabNote Agent"
    }, {
      name: "description",
      content: "了解 LabNote Agent 的技术架构与使用方法。"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
const $$splitComponentImporter$5 = () => import("./handoff-Dc6D2DKv.mjs");
const Route$5 = createFileRoute("/handoff")({
  head: () => ({
    meta: [{
      title: "项目交接助手 – LabNote Agent"
    }, {
      name: "description",
      content: "面向科研项目交接的 AI 助手：完成实验、卡片、Checklist、经验总结、异常实验一目了然。"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const $$splitComponentImporter$4 = () => import("./graph-CGUsJa8F.mjs");
const Route$4 = createFileRoute("/graph")({
  head: () => ({
    meta: [{
      title: "实验知识图谱 – LabNote Agent"
    }, {
      name: "description",
      content: "可视化展示实验、样品、设备之间的关联关系。"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import("./compare-DMJ_380w.mjs");
const Route$3 = createFileRoute("/compare")({
  head: () => ({
    meta: [{
      title: "AI 治理前后对比 – LabNote Agent"
    }, {
      name: "description",
      content: "查看 Word/Excel/照片/聊天记录如何被 AI Agent 一步治理为结构化实验卡片。"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./checklist-BOFgUgq6.mjs");
const Route$2 = createFileRoute("/checklist")({
  head: () => ({
    meta: [{
      title: "复现 Checklist – LabNote Agent"
    }, {
      name: "description",
      content: "人工逐项验证的实验复现清单，含详细操作指导和 AI 动态提醒。"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./assets-B4pbUbfr.mjs");
const Route$1 = createFileRoute("/assets")({
  head: () => ({
    meta: [{
      title: "实验资产包 – LabNote Agent"
    }, {
      name: "description",
      content: "所有实验卡片的结构化资产视图，支持批量导出与溯源。"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./index-BxCKEk38.mjs");
const Route = createFileRoute("/")({
  head: () => ({
    meta: [{
      title: "LabNote Agent – 让每一次实验都成为可复用的科研资产"
    }, {
      name: "description",
      content: "面向高校实验室、科研课题组的 AI Agent：多源数据采集、智能清洗、复现实验与 RAG 知识问答。"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const WorkbenchRoute = Route$9.update({
  id: "/workbench",
  path: "/workbench",
  getParentRoute: () => Route$a
});
const SettingsRoute = Route$8.update({
  id: "/settings",
  path: "/settings",
  getParentRoute: () => Route$a
});
const PaperRoute = Route$7.update({
  id: "/paper",
  path: "/paper",
  getParentRoute: () => Route$a
});
const HelpRoute = Route$6.update({
  id: "/help",
  path: "/help",
  getParentRoute: () => Route$a
});
const HandoffRoute = Route$5.update({
  id: "/handoff",
  path: "/handoff",
  getParentRoute: () => Route$a
});
const GraphRoute = Route$4.update({
  id: "/graph",
  path: "/graph",
  getParentRoute: () => Route$a
});
const CompareRoute = Route$3.update({
  id: "/compare",
  path: "/compare",
  getParentRoute: () => Route$a
});
const ChecklistRoute = Route$2.update({
  id: "/checklist",
  path: "/checklist",
  getParentRoute: () => Route$a
});
const AssetsRoute = Route$1.update({
  id: "/assets",
  path: "/assets",
  getParentRoute: () => Route$a
});
const IndexRoute = Route.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$a
});
const rootRouteChildren = {
  IndexRoute,
  AssetsRoute,
  ChecklistRoute,
  CompareRoute,
  GraphRoute,
  HandoffRoute,
  HelpRoute,
  PaperRoute,
  SettingsRoute,
  WorkbenchRoute
};
const routeTree = Route$a._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const queryClient = new QueryClient();
  const router2 = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  Route$9 as R,
  mockCardFromFile as a,
  router as b,
  checkCompleteness as c,
  generateMethods as g,
  mockCardFromVoice as m,
  ragAnswer as r,
  useLab as u
};
