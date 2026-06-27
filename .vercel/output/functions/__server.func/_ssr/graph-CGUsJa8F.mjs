import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useLab } from "./router-DTtIwz4c.mjs";
import "../_libs/sonner.mjs";
import { N as Network, A as ArrowUpRight, a1 as ZoomIn, a2 as ZoomOut, a3 as RotateCcw, a4 as Lightbulb, X, e as FileText, W as User, F as FlaskConical, a5 as Cpu } from "../_libs/lucide-react.mjs";
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
function GraphPage() {
  const {
    experiments
  } = useLab();
  useNavigate();
  const [picked, setPicked] = reactExports.useState(null);
  const [zoom, setZoom] = reactExports.useState(1);
  const exps = experiments;
  const {
    nodes,
    edges
  } = reactExports.useMemo(() => {
    const nodes2 = [];
    const edges2 = [];
    if (exps.length === 0) return {
      nodes: nodes2,
      edges: edges2
    };
    const cx = 500, cy = 380, r = exps.length <= 2 ? 180 : Math.min(280, exps.length * 90);
    exps.forEach((e, i) => {
      const angle = 2 * Math.PI * i / exps.length - Math.PI / 2;
      const ex = cx + r * Math.cos(angle);
      const ey = cy + r * Math.sin(angle);
      nodes2.push({
        id: e.id,
        label: e.name.length > 16 ? e.name.slice(0, 15) + "…" : e.name,
        sublabel: e.date,
        type: "exp",
        x: ex,
        y: ey,
        expId: e.id
      });
      if (e.sample.id) {
        const sid = `sample_${e.id}`;
        const sx = ex - 120, sy = ey - 80;
        nodes2.push({
          id: sid,
          label: `样品 ${e.sample.id}`,
          sublabel: e.sample.batch || "",
          type: "sample",
          x: sx,
          y: sy,
          expId: e.id
        });
        edges2.push({
          from: e.id,
          to: sid,
          label: "使用"
        });
      }
      if (e.device.name) {
        const did = `device_${e.id}`;
        const dx = ex + 120, dy = ey - 80;
        nodes2.push({
          id: did,
          label: e.device.name,
          sublabel: e.device.model || "",
          type: "device",
          x: dx,
          y: dy,
          expId: e.id
        });
        edges2.push({
          from: e.id,
          to: did,
          label: "使用"
        });
      }
      if (e.params.length > 0) {
        const topParam = e.params.find((p) => p.name.includes("温度") || p.name.includes("尺寸") || p.name.includes("浓度") || p.name.includes("用量")) ?? e.params[0];
        const fid = `finding_${e.id}`;
        const fx = ex, fy = ey + 100;
        nodes2.push({
          id: fid,
          label: `${topParam.name}=${topParam.value}${topParam.unit}`,
          sublabel: "关键参数",
          type: "finding",
          x: fx,
          y: fy,
          expId: e.id
        });
        edges2.push({
          from: e.id,
          to: fid,
          label: "参数"
        });
      }
      if (e.results) {
        const rid = `result_${e.id}`;
        const rx = ex + (i % 2 === 0 ? -150 : 150), ry = ey + 150;
        nodes2.push({
          id: rid,
          label: e.results.slice(0, 20) + (e.results.length > 20 ? "…" : ""),
          sublabel: "实验结果",
          type: "finding",
          x: rx,
          y: ry,
          expId: e.id
        });
        edges2.push({
          from: e.id,
          to: rid,
          label: "结论",
          dashed: true
        });
      }
    });
    exps.forEach((e1, i) => {
      exps.forEach((e2, j) => {
        if (i < j) {
          if (e1.sample.id && e1.sample.id === e2.sample.id) {
            edges2.push({
              from: `sample_${e1.id}`,
              to: `sample_${e2.id}`,
              label: "同一样品",
              dashed: true
            });
          }
          if (e1.device.name && e1.device.name === e2.device.name) {
            edges2.push({
              from: `device_${e1.id}`,
              to: `device_${e2.id}`,
              label: "同一设备",
              dashed: true
            });
          }
          if (e1.date && e2.date && e1.date < e2.date) {
            edges2.push({
              from: e1.id,
              to: e2.id,
              label: "时间先后",
              dashed: true
            });
          }
        }
      });
    });
    return {
      nodes: nodes2,
      edges: edges2
    };
  }, [exps]);
  const typeColor = (t) => ({
    exp: "#6366f1",
    sample: "#f59e0b",
    device: "#10b981",
    method: "#8b5cf6",
    finding: "#ec4899"
  })[t];
  const typeLabel = (t) => ({
    exp: "实验",
    sample: "样品",
    device: "设备",
    method: "方法",
    finding: "发现"
  })[t];
  if (exps.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-4xl px-4 py-20 text-center text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Network, { size: 48, className: "mx-auto opacity-30" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mt-4 text-2xl font-bold", children: "知识图谱" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2", children: "尚无实验数据，请先到工作台上传实验记录。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/workbench", className: "mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground", children: [
        "前往工作台 ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { size: 14 })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-7xl px-4 py-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Network, { size: 20 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "实验知识图谱" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
          exps.length,
          " 个实验 · ",
          nodes.length,
          " 个节点 · ",
          edges.length,
          " 条关联",
          picked && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 text-primary", children: [
            "— 已选中「",
            picked.label,
            "」"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setZoom((z) => Math.min(2, z + 0.15)), className: "flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-secondary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomIn, { size: 13 }),
          " 放大"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setZoom((z) => Math.max(0.5, z - 0.15)), className: "flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-secondary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomOut, { size: 13 }),
          " 缩小"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
          setZoom(1);
          setPicked(null);
        }, className: "flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-secondary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { size: 13 }),
          " 重置"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-5 lg:grid-cols-[1fr_320px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-soft p-2 overflow-auto", style: {
        minHeight: 600
      }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 1000 760", className: "w-full", style: {
        transform: `scale(${zoom})`,
        transformOrigin: "top left",
        minWidth: `${1e3 * zoom}px`,
        height: `${760 * zoom}px`
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("defs", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("pattern", { id: "grid", width: "40", height: "40", patternUnits: "userSpaceOnUse", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M 40 0 L 0 0 0 40", fill: "none", stroke: "var(--color-border)", strokeWidth: "0.3", opacity: "0.5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("filter", { id: "shadow", children: /* @__PURE__ */ jsxRuntimeExports.jsx("feDropShadow", { dx: "0", dy: "1", stdDeviation: "2", floodOpacity: "0.15" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { width: "1000", height: "760", fill: "url(#grid)" }),
        edges.map((e, i) => {
          const a = nodes.find((n) => n.id === e.from);
          const b = nodes.find((n) => n.id === e.to);
          if (!a || !b) return null;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: e.dashed ? "var(--color-border)" : "var(--color-primary)", strokeWidth: e.dashed ? 1 : 1.8, strokeDasharray: e.dashed ? "6,3" : "none", opacity: e.dashed ? 0.6 : 1 }),
            e.label && /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: mx, y: my - 5, textAnchor: "middle", fontSize: 9, fill: "var(--color-muted-foreground)", opacity: 0.7, children: e.label })
          ] }, i);
        }),
        nodes.map((n) => {
          const active = picked?.id === n.id;
          const size = n.type === "exp" ? 32 : n.type === "sample" || n.type === "device" ? 24 : 20;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { className: "cursor-pointer", onClick: () => setPicked(n), filter: active ? "url(#shadow)" : void 0, children: [
            active && /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: n.x, cy: n.y, r: size + 10, fill: "none", stroke: typeColor(n.type), strokeWidth: 2, opacity: 0.2 }),
            n.type === "exp" ? /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: n.x - size, y: n.y - size / 2, width: size * 2, height: size, rx: 8, fill: typeColor(n.type), opacity: active ? 1 : 0.85 }) : /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: n.x, cy: n.y, r: size, fill: typeColor(n.type), opacity: active ? 1 : 0.7 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: n.x, y: n.y + 4, textAnchor: "middle", fontSize: n.type === "exp" ? 12 : 9, fill: "white", fontWeight: "bold", children: n.type === "exp" ? "📋" : n.type === "sample" ? "🧪" : n.type === "device" ? "⚙️" : "💡" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: n.x, y: n.y + size + 16, textAnchor: "middle", fontSize: n.type === "exp" ? 12 : 10, fill: active ? "var(--color-primary)" : "var(--color-foreground)", fontWeight: n.type === "exp" ? 600 : 400, children: n.label }),
            n.sublabel && /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: n.x, y: n.y + size + 30, textAnchor: "middle", fontSize: 9, fill: "var(--color-muted-foreground)", children: n.sublabel })
          ] }, n.id);
        })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DetailPanel, { node: picked, experiments, onClose: () => setPicked(null) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground px-2", children: [
      ["exp", "sample", "device", "finding"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-3 w-3 rounded-full", style: {
          background: typeColor(t)
        } }),
        typeLabel(t)
      ] }, t)),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-4 border-l border-border pl-4", children: "实线 = 直接关联" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "虚线 = 间接关联" })
    ] })
  ] });
}
function DetailPanel({
  node,
  experiments,
  onClose
}) {
  if (!node) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-semibold text-foreground mb-2 flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Lightbulb, { size: 14, className: "text-primary" }),
        " 节点详情"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs leading-relaxed", children: "点击图谱中任意节点查看详细信息。实验节点显示完整卡片链接，样品/设备节点显示关联实验列表。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-1.5 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "📋 ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "实验节点" }),
          " — 实验卡片主体"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "🧪 ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "样品节点" }),
          " — 共用样品的实验"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "⚙️ ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "设备节点" }),
          " — 共用设备的实验"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "💡 ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "发现节点" }),
          " — 关键参数与结果"
        ] })
      ] })
    ] });
  }
  const exp = node.expId ? experiments.find((e) => e.id === node.expId) : void 0;
  const related = exp ? experiments.filter((e) => e.id !== exp.id && (e.sample.id && e.sample.id === exp.sample.id || e.device.name && e.device.name === exp.device.name)) : [];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5 border-primary/30 max-h-[650px] overflow-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wider font-semibold", style: {
          color: typeColor2(node.type)
        }, children: typeLabel2(node.type) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-base font-semibold mt-1", children: node.label }),
        node.sublabel && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: node.sublabel })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "p-1 hover:bg-secondary rounded", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 14 }) })
    ] }),
    exp && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 13 }), label: "实验名称", value: exp.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(User, { size: 13 }), label: "操作人", value: exp.operator || "—" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FlaskConical, { size: 13 }), label: "设备", value: `${exp.device.name || "—"} ${exp.device.model || ""}` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { size: 13 }), label: "样品", value: `${exp.sample.id || "—"} (${exp.sample.batch || ""})` }),
      related.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground font-semibold mb-1.5 mt-2", children: [
          "🔗 关联实验（",
          related.length,
          "）："
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1", children: related.slice(0, 4).map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-xs rounded-lg bg-secondary/60 p-2 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: e.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/workbench", search: {
            id: e.id
          }, className: "shrink-0 text-primary text-[10px] hover:underline flex items-center gap-0.5 ml-2", children: [
            "查看",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { size: 10 })
          ] })
        ] }, e.id)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2 pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/workbench", search: {
        id: exp.id
      }, className: "flex-1 text-center rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90", children: "查看实验卡片" }) })
    ] }),
    !exp && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "此节点未关联到具体实验卡片。" })
  ] });
}
function Row({
  icon,
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: icon }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground w-14 shrink-0", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 font-medium truncate", children: value })
  ] });
}
function typeColor2(t) {
  return {
    exp: "#6366f1",
    sample: "#f59e0b",
    device: "#10b981",
    method: "#8b5cf6",
    finding: "#ec4899"
  }[t];
}
function typeLabel2(t) {
  return {
    exp: "实验节点",
    sample: "样品节点",
    device: "设备节点",
    method: "方法节点",
    finding: "发现节点"
  }[t];
}
export {
  GraphPage as component
};
