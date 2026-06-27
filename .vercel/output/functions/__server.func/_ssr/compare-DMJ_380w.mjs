import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { e as FileText, a6 as FileSpreadsheet, a7 as Image, a8 as MessageCircle, n as Sparkles, Z as ArrowRight, p as CircleCheck } from "../_libs/lucide-react.mjs";
function ComparePage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-7xl px-4 py-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl md:text-3xl font-bold", children: "上传前 vs AI 治理后" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "从分散原始记录到结构化、可复现的科研资产，AI Agent 一步完成。" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-6 lg:grid-cols-[1fr_auto_1fr] items-start", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wider", children: "原始材料" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(RawCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 16 }), title: "实验日志.docx", badge: "Word 文档", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground italic", children: '"今天做了 Fe2309 退火，大概 550 度左右，时间 1 小时，气氛是惰性气体， 结果颜色变了，等下做 XRD。师弟说升温过程有一点波动……"' }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(RawCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { size: 16 }), title: "参数表.xlsx", badge: "Excel 表格", children: /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "text-[11px] font-mono text-muted-foreground bg-secondary/60 rounded p-2 overflow-x-auto", children: `Temp    Time   Rate    Atm
550     60     5       Ar
560     60     5       Ar
540     60     5       Ar` }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(RawCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { size: 16 }), title: "炉腔照片_IMG0721.jpg", badge: "实验照片", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-20 rounded-lg bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-xs text-muted-foreground", children: "[仪器面板截图：温度显示 550℃]" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(RawCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { size: 16 }), title: "微信群聊片段", badge: "即时消息", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "张子萱：样品放进去了" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "李文博：管式炉那个对吧 OTF1200X" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "张子萱：是的，已经通氩气 15min" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "张子萱：40min 时温度抖了一下 ±3℃" })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hidden lg:flex flex-col items-center justify-center pt-32 gap-3 px-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "brand-gradient h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 22 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold text-primary", children: "AI 自动治理" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground text-center max-w-[120px]", children: "多模态抽取 · 术语对齐 · 单位规整" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 28, className: "text-primary mt-2" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:hidden flex items-center justify-center gap-2 text-primary text-sm font-semibold", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 16 }),
        " AI 自动治理 ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 16 })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold text-primary uppercase tracking-wider", children: "AI 治理后 · 实验卡片" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5 border-primary/30 bg-primary-soft/30", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: "Fe-2309 管式炉退火工艺" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] rounded-md bg-primary text-primary-foreground px-2 py-0.5", children: "结构化" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "样品编号", v: "Fe-2309" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "批次", v: "B-20260520" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "设备", v: "管式炉 OTF-1200X" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "厂家", v: "合肥科晶" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "操作人员", v: "张子萱" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "实验时间", v: "2026-05-28 14:30" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-semibold", children: "参数列表" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "mt-2 w-full text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-1", children: "参数" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left", children: "值" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left", children: "单位" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: [["退火温度", "550", "℃"], ["保温时间", "60", "min"], ["升温速率", "5", "℃/min"], ["气氛", "Ar", "—"]].map(([n, v, u]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1.5", children: n }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: u })
            ] }, n)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-semibold", children: "实验步骤（自动编号）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "mt-2 space-y-1 text-xs list-decimal pl-5 text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "称取 Fe-2309 样品 0.5g 放入瓷舟" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "通入氩气置换炉腔空气 15 min" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "以 5 ℃/min 升温至 550 ℃" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "保温 60 min" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "自然冷却至室温后取出" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-semibold", children: "实验结果 & 异常" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: "样品颜色由灰黑色转为银灰色；第 40 min 出现温度波动 ±3℃。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5 border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-sm font-semibold flex items-center gap-1.5 text-[color:var(--color-success)]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 14 }),
            " Checklist 已自动生成"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "mt-2 text-xs space-y-1 text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "✓ 设备校准记录" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "✓ 气氛流量确认" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "✓ 升降温曲线核对" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "✓ 样品批次溯源" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
function RawCard({
  icon,
  title,
  badge,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-4 border-dashed", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-sm font-medium", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: icon }),
        title
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground", children: badge })
    ] }),
    children
  ] });
}
function KV({
  k,
  v
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: k }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-right", children: v })
  ] });
}
export {
  ComparePage as component
};
