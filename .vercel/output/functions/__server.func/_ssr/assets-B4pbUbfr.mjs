import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useLab } from "./router-DTtIwz4c.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { P as Package, A as ArrowUpRight, L as Layers, e as FileText, v as FileBraces, p as CircleCheck, E as TrendingUp, b as BookOpen, F as FlaskConical, t as Clock } from "../_libs/lucide-react.mjs";
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
function AssetsPage() {
  const {
    experiments
  } = useLab();
  const totalParams = experiments.reduce((s, e) => s + e.params.length, 0);
  const completedCards = experiments.filter((e) => e.results && e.purpose).length;
  const disciplines = [...new Set(experiments.map((e) => e.discipline).filter(Boolean))];
  const exportAll = (format) => {
    if (experiments.length === 0) {
      toast.error("暂无可导出的实验卡片");
      return;
    }
    if (format === "json") {
      const blob = new Blob([JSON.stringify(experiments, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `LabNote-资产包-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const md = experiments.map(toMarkdownAsset).join("\n\n---\n\n");
      const blob = new Blob([md], {
        type: "text/markdown"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `LabNote-资产包-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(`已导出 ${experiments.length} 张卡片`);
  };
  if (experiments.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-4xl px-4 py-20 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { size: 48, className: "mx-auto text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mt-4 text-2xl font-bold", children: "实验资产包" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-muted-foreground", children: "尚无实验卡片，请先到工作台上传实验数据。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/workbench", className: "mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground", children: [
        "前往工作台 ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { size: 14 })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-7xl px-4 py-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between flex-wrap gap-4 mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-2xl font-bold flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { size: 20 }) }),
          "实验资产包"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "结构化实验数据资产，可追溯、可导出、可直接用于论文" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => exportAll("md"), className: "flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:border-primary/40 transition", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 14 }),
          " 导出 Markdown"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => exportAll("json"), className: "flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileBraces, { size: 14 }),
          " 导出 JSON"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatBox, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { size: 18 }), label: "实验卡片", value: experiments.length, color: "blue" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatBox, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 18 }), label: "完整卡片", value: completedCards, sub: `/${experiments.length}`, color: "green" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatBox, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { size: 18 }), label: "参数字段", value: totalParams, color: "amber" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatBox, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { size: 18 }), label: "学科领域", value: disciplines.length, color: "violet" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-4 md:grid-cols-2 lg:grid-cols-3", children: experiments.map((exp) => /* @__PURE__ */ jsxRuntimeExports.jsx(AssetCard, { experiment: exp }, exp.id)) })
  ] });
}
function StatBox({
  icon,
  label,
  value,
  sub,
  color
}) {
  const borders = {
    blue: "border-l-blue-400",
    green: "border-l-green-400",
    amber: "border-l-amber-400",
    violet: "border-l-violet-400"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `card-soft p-4 border-l-4 ${borders[color]}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-muted-foreground text-xs", children: [
      icon,
      label
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 text-2xl font-bold tabular-nums", children: [
      value,
      sub && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base text-muted-foreground font-normal", children: sub })
    ] })
  ] });
}
function AssetCard({
  experiment
}) {
  const paramPreview = experiment.params.slice(0, 4).map((p) => `${p.name}=${p.value}${p.unit}`).join(" · ");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/workbench", search: {
    id: experiment.id
  }, className: "card-soft p-5 hover:border-primary/40 hover:shadow-md transition-all group", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-sm leading-snug group-hover:text-primary transition", children: experiment.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { size: 14, className: "text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-md bg-primary-soft text-primary text-[11px] px-2 py-0.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlaskConical, { size: 10 }),
        " ",
        experiment.discipline || "未分类"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-md bg-secondary text-muted-foreground text-[11px] px-2 py-0.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 10 }),
        " ",
        experiment.date
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 text-xs text-muted-foreground line-clamp-1", children: [
      "🎯 ",
      experiment.purpose || "（待填写实验目的）"
    ] }),
    paramPreview && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 text-[11px] text-muted-foreground/70 border-t border-border pt-2 truncate", children: [
      "📐 ",
      paramPreview
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center gap-2 text-[10px] text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "👤 ",
        experiment.operator || "—"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "📎 ",
        experiment.source
      ] })
    ] })
  ] });
}
function toMarkdownAsset(e) {
  return `## ${e.name}
- **时间**：${e.date}
- **人员**：${e.operator}
- **学科**：${e.discipline}
- **来源**：${e.source}

### 目的
${e.purpose}

### 设备
${e.device.name} / ${e.device.model}

### 样品
${e.sample.id} (${e.sample.batch})

### 参数
${e.params.map((p) => `- ${p.name}: ${p.value} ${p.unit}`).join("\n")}

### 结果
${e.results}
`;
}
export {
  AssetsPage as component
};
