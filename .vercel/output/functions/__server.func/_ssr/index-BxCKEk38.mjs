import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useLab } from "./router-DTtIwz4c.mjs";
import { s as setPendingUpload } from "./upload-bridge-mwab98-E.mjs";
import "../_libs/sonner.mjs";
import { n as Sparkles, q as Upload, ab as Zap, Z as ArrowRight, L as Layers, e as FileText, a as ListChecks, h as MessageSquare, a0 as TriangleAlert, b as BookOpen, _ as FileSearch, G as GitBranch, j as Brain, ac as Database } from "../_libs/lucide-react.mjs";
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
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "../_libs/zod.mjs";
const flowSteps = [{
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 16 }),
  label: "上传实验记录",
  hint: "PDF · 图片 · 语音"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { size: 16 }),
  label: "AI 解析中…",
  hint: "多模态抽取"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 16 }),
  label: "生成结构化实验卡片",
  hint: "28 个字段"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 16 }),
  label: "发现缺失字段",
  hint: "2 项待补全"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ListChecks, { size: 16 }),
  label: "生成 Checklist",
  hint: "复现清单"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { size: 16 }),
  label: "写入知识库",
  hint: "向量化沉淀"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { size: 16 }),
  label: "AI 科研问答",
  hint: "随时追溯"
}];
function Home() {
  const {
    experiments
  } = useLab();
  const navigate = useNavigate();
  const fileRef = reactExports.useRef(null);
  const [dragging, setDragging] = reactExports.useState(false);
  experiments.length + 128;
  const totalCards = experiments.length + 96;
  const totalChecklist = experiments.length + 84;
  const totalRag = 312;
  const completeness = 87;
  const handleUpload = (files) => {
    if (!files || !files.length) return;
    setPendingUpload(Array.from(files));
    navigate({
      to: "/workbench"
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "relative overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 -z-10 bg-gradient-to-br from-primary-soft via-background to-background" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-7xl px-4 pt-20 pb-12 md:pt-28 md:pb-16", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-3xl", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs text-primary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 12 }),
          " 科研数据治理 · 实验复现 AI Agent"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "mt-5 text-4xl md:text-6xl font-bold leading-tight tracking-tight", children: [
          "让每一次实验",
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          "都成为",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "brand-gradient-text", children: "可复用的科研资产" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-6 text-lg text-muted-foreground max-w-2xl", children: "上传一份实验记录，30秒生成可复现、可追溯的科研数据资产。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 flex flex-wrap items-start gap-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { onDragOver: (e) => {
            e.preventDefault();
            setDragging(true);
          }, onDragLeave: () => setDragging(false), onDrop: (e) => {
            e.preventDefault();
            setDragging(false);
            handleUpload(e.dataTransfer.files);
          }, onClick: () => fileRef.current?.click(), className: `cursor-pointer rounded-2xl border-2 border-dashed px-8 py-6 text-center transition-all ${dragging ? "border-primary bg-primary-soft/30 scale-[1.02]" : "border-primary/30 bg-primary-soft/10 hover:border-primary/50 hover:bg-primary-soft/20"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 28, className: "mx-auto text-primary" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm font-semibold", children: "拖拽实验文件到此处" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "支持 PDF · DOCX · XLSX · CSV · PNG · TXT · MD · MP4 · WAV" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { ref: fileRef, type: "file", multiple: true, hidden: true, accept: ".pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png,.tif,.tiff,.txt,.md,.log,.json,.xml,.mp4,.m4a,.mp3,.wav", onChange: (e) => handleUpload(e.target.files) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 pt-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/workbench", className: "inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 16 }),
              " 进入工作台 ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 16 })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/assets", className: "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium hover:border-primary/40 transition", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { size: 16 }),
              " 实验资产包"
            ] })
          ] })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(WorkflowAnimation, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dashboard, { experiments, totalCards, totalChecklist, totalRag, completeness }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Capabilities, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(WhyChoose, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(InteractiveTimeline, {})
  ] });
}
function WorkflowAnimation() {
  const [active, setActive] = reactExports.useState(0);
  reactExports.useState(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % flowSteps.length), 1800);
    return () => clearInterval(t);
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mx-auto max-w-7xl px-4 py-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold", children: "AI 工作流" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "从原始数据到可复现实验卡片的完整链路" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap justify-center gap-3", children: flowSteps.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs transition-all ${i === active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" : i < active ? "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]" : "bg-secondary text-muted-foreground"}`, children: [
      s.icon,
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left leading-tight", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: s.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] opacity-70", children: s.hint })
      ] })
    ] }, i)) })
  ] });
}
function Dashboard({
  experiments,
  totalCards,
  totalChecklist,
  totalRag,
  completeness
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mx-auto max-w-7xl px-4 py-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between flex-wrap gap-2 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl md:text-3xl font-bold", children: "数据中心" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "实时掌握知识库治理进展" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/workbench", className: "text-sm text-primary hover:underline flex items-center gap-1", children: [
        "进入工作台 ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 14 })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { tone: "blue", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 18 }), label: "实验卡片数量", value: totalCards, delta: "+12 本周" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { tone: "green", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ListChecks, { size: 18 }), label: "Checklist 数量", value: totalChecklist, delta: "+8 本周" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { tone: "amber", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { size: 18 }), label: "参数完整率", value: `${completeness}%`, delta: "+3% vs 上周" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { tone: "violet", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { size: 18 }), label: "AI 问答次数", value: totalRag, delta: "+46 本周" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid gap-4 lg:grid-cols-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(RecentList, { title: "最近实验", items: experiments.slice(0, 4).map((e) => ({
        title: e.name,
        sub: `${e.date} · ${e.operator || "—"}`,
        to: "/workbench",
        id: e.id
      })), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 14 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(RecentList, { title: "最近 AI 问答", items: [{
        title: "上次使用 Fe-2309 的退火温度？",
        sub: "命中 1 条记录 · 5 分钟前"
      }, {
        title: "哪几次实验出现电流异常？",
        sub: "命中 2 条记录 · 22 分钟前"
      }, {
        title: "知识库涉及哪些设备？",
        sub: "6 类设备 · 1 小时前"
      }, {
        title: "建议补充哪些重复实验？",
        sub: "建议 3 项 · 2 小时前"
      }], icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { size: 14 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(RecentList, { title: "待补全实验", items: experiments.slice(0, 4).map((e) => ({
        title: e.name,
        sub: `待补 ${e.params.length < 3 ? 2 : 1} 项关键字段`,
        to: "/workbench",
        id: e.id
      })), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 14 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(RecentList, { title: "最新知识沉淀", items: [{
        title: "管式炉退火 SOP v2",
        sub: "3 条实验佐证 · 今日"
      }, {
        title: "CV 测试异常归因报告",
        sub: "2 条异常关联 · 昨日"
      }, {
        title: "水热合成参数对照表",
        sub: "5 次实验 · 3 天前"
      }, {
        title: "Pt/C 电极复现包",
        sub: "含 Methods · 一周前"
      }], icon: /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { size: 14 }) })
    ] })
  ] });
}
function Capabilities() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mx-auto max-w-7xl px-4 py-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center max-w-2xl mx-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl md:text-4xl font-bold", children: "三大核心能力" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-muted-foreground", children: "从原始记录到可复现的科研资产，全流程 AI 赋能" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-10 grid gap-6 md:grid-cols-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FeatureCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileSearch, { size: 22 }), title: "多源数据采集与解析", desc: "一键导入 PDF / Word / Excel / 图片 / 仪器日志 / 语音，多模态大模型自动抽取实验信息。", tags: ["PDF/DOCX", "Excel/CSV", "仪器截图", "语音 ASR"] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FeatureCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 22 }), title: "智能清洗与完整性检查", desc: "自动补全缺失字段、统一术语与单位、识别异常参数，输出可信可复核的结构化卡片。", tags: ["术语对齐", "单位规整", "完整性检查", "异常识别"] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FeatureCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(GitBranch, { size: 22 }), title: "复现实验与知识库问答", desc: "自动生成复现清单与论文 Methods 草稿，基于 RAG 知识库支持自然语言追溯。", tags: ["复现清单", "Methods 草稿", "RAG 检索", "实验追溯"] })
    ] })
  ] });
}
function FeatureCard({
  icon,
  title,
  desc,
  tags
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-6 hover:border-primary/30 transition", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary", children: icon }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-4 font-semibold", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: desc }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 flex flex-wrap gap-1.5", children: tags.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground", children: t }, t)) })
  ] });
}
function StatCard({
  icon,
  label,
  value,
  delta,
  tone
}) {
  const colors = {
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    amber: "border-amber-200 bg-amber-50",
    violet: "border-violet-200 bg-violet-50"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `card-soft p-4 border-l-4 ${colors[tone]}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-muted-foreground text-xs", children: [
      icon,
      label
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-2xl font-bold tabular-nums", children: value }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 text-[11px] text-muted-foreground", children: delta })
  ] });
}
function RecentList({
  title,
  items,
  icon,
  tone
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-xs font-semibold text-muted-foreground flex items-center gap-2 mb-3", children: [
      icon,
      title
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: items.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: item.to ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: item.to, search: item.id ? {
      id: item.id
    } : void 0, className: "block rounded-lg p-2 hover:bg-secondary text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium truncate", children: item.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground mt-0.5", children: item.sub })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg p-2 text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium truncate", children: item.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground mt-0.5", children: item.sub })
    ] }) }, i)) })
  ] });
}
function WhyChoose() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mx-auto max-w-7xl px-4 py-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-bold text-center", children: "为什么选择 LabNote Agent" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-8 grid gap-6 md:grid-cols-3", children: [{
      title: "全模态输入",
      desc: "文本、图像、语音、视频，实验数据格式不设限"
    }, {
      title: "结构化治理",
      desc: "28个标准字段自动提取，参数标准化，术语统一"
    }, {
      title: "可复现追溯",
      desc: "每张卡片可生成复现包，包含完整的实验条件与步骤"
    }].map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-6 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: c.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: c.desc })
    ] }, c.title)) })
  ] });
}
function InteractiveTimeline() {
  const steps = [{
    step: "01",
    label: "数据上传",
    desc: "拖拽或选择实验文件"
  }, {
    step: "02",
    label: "AI 解析",
    desc: "多模态抽取结构化信息"
  }, {
    step: "03",
    label: "卡片生成",
    desc: "自动填充实验卡片"
  }, {
    step: "04",
    label: "复现准备",
    desc: "生成 Checklist + Methods"
  }];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mx-auto max-w-7xl px-4 py-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-bold text-center mb-8", children: "四步开始" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap justify-center gap-6", children: steps.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-6 w-52 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "brand-gradient flex h-10 w-10 items-center justify-center rounded-full text-white mx-auto text-sm font-bold", children: s.step }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-3 font-semibold", children: s.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: s.desc })
    ] }, i)) })
  ] });
}
export {
  Home as component
};
