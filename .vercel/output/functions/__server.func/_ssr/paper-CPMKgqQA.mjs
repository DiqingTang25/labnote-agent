import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { u as useLab, g as generateMethods } from "./router-DTtIwz4c.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { b as BookOpen, e as FileText, n as Sparkles, Y as PenLine, p as CircleCheck, I as Download, Z as ArrowRight } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "../_libs/tanstack__react-router.mjs";
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
import "../_libs/zod.mjs";
function PaperPage() {
  const {
    experiments
  } = useLab();
  const [picked, setPicked] = reactExports.useState(new Set(experiments.slice(0, 2).map((e) => e.id)));
  const [draft, setDraft] = reactExports.useState("");
  const [step, setStep] = reactExports.useState(0);
  const selected = experiments.filter((e) => picked.has(e.id));
  const generate = () => {
    setStep(1);
    setTimeout(() => {
      setStep(2);
      const text = "## Methods\n\n" + selected.map((e, i) => `### ${i + 1}. ${e.name}
${generateMethods(e)}`).join("\n\n");
      setDraft(text);
      setStep(3);
      toast.success("Methods 初稿已生成");
    }, 1100);
  };
  const exportWord = () => {
    setStep(4);
    const blob = new Blob([draft], {
      type: "application/msword"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Methods.doc";
    a.click();
    toast.success("已导出 Word");
  };
  const toggle = (id) => {
    const next = new Set(picked);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-6xl px-4 py-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { size: 20 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "论文辅助" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "AI 整理实验记录，生成 Methods 初稿" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-soft p-4 mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between gap-2 overflow-x-auto", children: [{
      l: "实验记录",
      i: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 14 })
    }, {
      l: "AI 整理",
      i: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 14 })
    }, {
      l: "Methods 初稿",
      i: /* @__PURE__ */ jsxRuntimeExports.jsx(PenLine, { size: 14 })
    }, {
      l: "人工确认",
      i: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 14 })
    }, {
      l: "导出 Word",
      i: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 14 })
    }].map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${step >= i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`, children: [
        s.i,
        s.l
      ] }),
      i < 4 && /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 14, className: "text-muted-foreground" })
    ] }, s.l)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-5 lg:grid-cols-[1fr_1.4fr]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold mb-3", children: "① 选择要纳入论文的实验" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2 max-h-[420px] overflow-auto pr-1", children: experiments.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: `flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition ${picked.has(e.id) ? "border-primary bg-primary-soft/40" : "border-border hover:border-primary/30"}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: picked.has(e.id), onChange: () => toggle(e.id), className: "mt-0.5 accent-[color:var(--color-primary)]" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: e.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground mt-0.5", children: [
              e.date,
              " · ",
              e.device.name || "—",
              " · ",
              e.sample.id || "无样品"
            ] })
          ] })
        ] }) }, e.id)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: generate, disabled: !selected.length, className: "mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 14 }),
          " AI 生成 Methods 初稿（已选 ",
          selected.length,
          "）"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: "② Methods 初稿（可编辑确认）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: exportWord, disabled: !draft, className: "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:border-primary/40 disabled:opacity-50", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 12 }),
            " 导出 Word"
          ] })
        ] }),
        step === 1 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center py-16 text-primary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 28, className: "animate-pulse" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 text-sm", children: [
            "AI 正在整理 ",
            selected.length,
            " 条实验记录…"
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: draft, onChange: (e) => setDraft(e.target.value), placeholder: "点击左侧『AI 生成』按钮，自动整理实验记录为 Methods 初稿…", className: "w-full min-h-[420px] rounded-lg border border-border bg-background p-4 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-lg bg-[color:var(--color-warning)]/10 border border-[color:var(--color-warning)]/30 p-3 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-[color:var(--color-warning)]", children: "⚠ 科研规范提示：" }),
          "AI 仅辅助整理实验方法学描述，不替代科研结论。请研究者在投稿前对内容做严谨核对与署名确认。"
        ] })
      ] })
    ] })
  ] });
}
export {
  PaperPage as component
};
