import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useLab } from "./router-DTtIwz4c.mjs";
import "../_libs/sonner.mjs";
import { U as UserCheck, t as Clock, e as FileText, a as ListChecks, b as BookOpen, a0 as TriangleAlert, n as Sparkles, Z as ArrowRight } from "../_libs/lucide-react.mjs";
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
function HandoffPage() {
  const {
    experiments
  } = useLab();
  const handoverStats = {
    owner: "李同学",
    completed: 18,
    cards: 18,
    checklists: 18,
    lessons: 6,
    abnormal: 3
  };
  const readingOrder = ["MAT-041", "MAT-052", "MAT-056"];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-6xl px-4 py-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(UserCheck, { size: 20 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "科研项目交接助手" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "让团队知识在毕业 / 轮岗时不再丢失" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-5 lg:grid-cols-[2fr_1fr]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-6 bg-gradient-to-br from-primary-soft to-transparent", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold", children: "李" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "交接负责人" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold", children: handoverStats.owner }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-1", children: "智能材料课题组 · 即将毕业" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground flex items-center gap-1 justify-end", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 12 }),
                "预计完成"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-bold text-primary", children: "30 分钟" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 grid grid-cols-2 md:grid-cols-5 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Mini, { label: "完成实验", value: handoverStats.completed, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 14 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Mini, { label: "实验卡片", value: handoverStats.cards, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 14 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Mini, { label: "Checklist", value: handoverStats.checklists, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ListChecks, { size: 14 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Mini, { label: "经验总结", value: handoverStats.lessons, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { size: 14 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Mini, { label: "异常实验", value: handoverStats.abnormal, tone: "warn", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 14 }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold mb-3", children: "关键实验记录（节选）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-border", children: experiments.slice(0, 5).map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "py-2.5 flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-mono rounded bg-secondary px-2 py-0.5", children: e.sample.id || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: e.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground", children: [
                e.date,
                " · ",
                e.operator
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/workbench", search: {
              id: e.id
            }, className: "text-xs text-primary hover:underline", children: "查看 →" })
          ] }, e.id)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold mb-3", children: "经验总结（AI 提炼）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2 text-sm", children: ["管式炉退火升温速率 >8℃/min 会显著降低晶粒均匀性", "Pt/C 电极 N2 鼓泡时间不足 30 min 易导致 CV 异常尖峰", "水热反应釜填充率超过 80% 存在安全风险，建议 60-70%", "XRD 样品制备粒径需 <50μm 以避免择优取向", "电化学测试前务必校准参比电极电位（每周一次）", "原始数据应在实验当天上传至课题组云盘并打标签"].map((t, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-2 text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary mt-1", children: "●" }),
            t
          ] }, i)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5 border-primary/30", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2 text-primary", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 16 }),
            " AI 建议阅读顺序"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "基于依赖关系与重要性自动排序" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "mt-4 space-y-2", children: readingOrder.map((id, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-3 rounded-lg border border-border p-2.5 hover:border-primary/40 transition", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold", children: i + 1 }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: id }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground", children: ["基础工艺", "参数优化", "异常分析"][i] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 14, className: "text-muted-foreground" })
          ] }, id)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: "交接 Checklist" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 space-y-2 text-xs", children: ["原始数据已归档", "实验卡片已审核", "Checklist 已确认", "Methods 草稿已交付", "样品已转交", "设备权限已交接"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", defaultChecked: true, className: "accent-[color:var(--color-primary)]" }),
            t
          ] }, t)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5 bg-[color:var(--color-warning)]/5 border-[color:var(--color-warning)]/30", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold flex items-center gap-1.5 text-[color:var(--color-warning)]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 14 }),
            " 异常实验提醒"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "mt-2 text-xs space-y-1 text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "MAT-019：升温曲线异常（5/12）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "MAT-027：样品污染待复查（5/18）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "MAT-035：仪器漂移（5/25）" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
function Mini({
  label,
  value,
  icon,
  tone
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl bg-white/70 p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground flex items-center gap-1", children: [
      icon,
      label
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-2xl font-bold mt-1 tabular-nums ${tone === "warn" ? "text-[color:var(--color-warning)]" : "text-foreground"}`, children: value })
  ] });
}
export {
  HandoffPage as component
};
