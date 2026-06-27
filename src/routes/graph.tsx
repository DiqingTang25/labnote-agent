/**
 * 知识图谱 — 交互式实验关系可视化
 * 节点：实验 / 样品 / 设备 / 方法 / 发现
 * 连线：共用样品 / 同设备 / 参数关联 / 时间顺序
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useLab, type Experiment } from "../lib/labStore";
import {
  Network, X, FileText, User, FlaskConical, Cpu,
  Lightbulb, ArrowUpRight, ZoomIn, ZoomOut, RotateCcw,
} from "lucide-react";

export const Route = createFileRoute("/graph")({
  head: () => ({
    meta: [
      { title: "实验知识图谱 – LabNote Agent" },
      { name: "description", content: "可视化展示实验、样品、设备之间的关联关系。" },
    ],
  }),
  component: GraphPage,
});

type NodeType = "exp" | "sample" | "device" | "method" | "finding";
type GraphNode = {
  id: string;
  label: string;
  sublabel?: string;
  type: NodeType;
  x: number; y: number;
  expId?: string;
};
type GraphEdge = { from: string; to: string; label?: string; dashed?: boolean; color?: string };

/** 余弦相似度 (纯 JS)，用于语义边计算 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function GraphPage() {
  const { experiments } = useLab();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);

  // 取所有实验（不限3个）
  const exps = experiments;

  const { nodes, edges } = useMemo(() => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    if (exps.length === 0) return { nodes, edges };

    // 布局：中心辐射式，实验节点环形分布
    const cx = 500, cy = 380, r = exps.length <= 2 ? 180 : Math.min(280, exps.length * 90);
    exps.forEach((e, i) => {
      const angle = (2 * Math.PI * i) / exps.length - Math.PI / 2;
      const ex = cx + r * Math.cos(angle);
      const ey = cy + r * Math.sin(angle);

      // 实验节点
      nodes.push({
        id: e.id,
        label: e.name.length > 16 ? e.name.slice(0, 15) + "…" : e.name,
        sublabel: e.date,
        type: "exp",
        x: ex, y: ey,
        expId: e.id,
      });

      // 样品节点
      if (e.sample.id) {
        const sid = `sample_${e.id}`;
        const sx = ex - 120, sy = ey - 80;
        nodes.push({ id: sid, label: `样品 ${e.sample.id}`, sublabel: e.sample.batch || "", type: "sample", x: sx, y: sy, expId: e.id });
        edges.push({ from: e.id, to: sid, label: "使用" });
      }

      // 设备节点
      if (e.device.name) {
        const did = `device_${e.id}`;
        const dx = ex + 120, dy = ey - 80;
        nodes.push({ id: did, label: e.device.name, sublabel: e.device.model || "", type: "device", x: dx, y: dy, expId: e.id });
        edges.push({ from: e.id, to: did, label: "使用" });
      }

      // 关键参数作为发现节点
      if (e.params.length > 0) {
        const topParam = e.params.find((p) => p.name.includes("温度") || p.name.includes("尺寸") || p.name.includes("浓度") || p.name.includes("用量"))
          ?? e.params[0];
        const fid = `finding_${e.id}`;
        const fx = ex, fy = ey + 100;
        nodes.push({ id: fid, label: `${topParam.name}=${topParam.value}${topParam.unit}`, sublabel: "关键参数", type: "finding", x: fx, y: fy, expId: e.id });
        edges.push({ from: e.id, to: fid, label: "参数" });
      }

      // 结果摘要
      if (e.results) {
        const rid = `result_${e.id}`;
        const rx = ex + (i % 2 === 0 ? -150 : 150), ry = ey + 150;
        nodes.push({ id: rid, label: e.results.slice(0, 20) + (e.results.length > 20 ? "…" : ""), sublabel: "实验结果", type: "finding", x: rx, y: ry, expId: e.id });
        edges.push({ from: e.id, to: rid, label: "结论", dashed: true });
      }
    });

    // 跨实验关系：共享样品 / 共享设备
    exps.forEach((e1, i) => {
      exps.forEach((e2, j) => {
        if (i < j) {
          // 共享样品
          if (e1.sample.id && e1.sample.id === e2.sample.id) {
            edges.push({
              from: `sample_${e1.id}`, to: `sample_${e2.id}`,
              label: "同一样品", dashed: true,
            });
          }
          // 共享设备
          if (e1.device.name && e1.device.name === e2.device.name) {
            edges.push({
              from: `device_${e1.id}`, to: `device_${e2.id}`,
              label: "同一设备", dashed: true,
            });
          }
          // 时间顺序
          if (e1.date && e2.date && e1.date < e2.date) {
            edges.push({
              from: e1.id, to: e2.id,
              label: "时间先后",
              dashed: true,
            });
          }
        }
      });
    });

    // 新增：语义相似度边（基于 pgvector embedding）
    for (let i = 0; i < exps.length; i++) {
      for (let j = i + 1; j < exps.length; j++) {
        const a = exps[i].embedding;
        const b = exps[j].embedding;
        if (!a || !b) continue;
        const sim = cosineSimilarity(a, b);
        if (sim > 0.75) {
          edges.push({
            from: exps[i].id,
            to: exps[j].id,
            label: `语义 ${(sim * 100).toFixed(0)}%`,
            dashed: true,
            color: "var(--color-success)",
          });
        }
      }
    }

    return { nodes, edges };
  }, [exps]);

  const typeColor = (t: NodeType): string => ({
    exp: "#6366f1",
    sample: "#f59e0b",
    device: "#10b981",
    method: "#8b5cf6",
    finding: "#ec4899",
  }[t]);

  const typeLabel = (t: NodeType): string => ({
    exp: "实验", sample: "样品", device: "设备", method: "方法", finding: "发现",
  }[t]);

  if (exps.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center text-muted-foreground">
        <Network size={48} className="mx-auto opacity-30"/>
        <h1 className="mt-4 text-2xl font-bold">知识图谱</h1>
        <p className="mt-2">尚无实验数据，请先到工作台上传实验记录。</p>
        <Link to="/workbench" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground">
          前往工作台 <ArrowUpRight size={14}/>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white"><Network size={20}/></div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">实验知识图谱</h1>
          <p className="text-sm text-muted-foreground">
            {exps.length} 个实验 · {nodes.length} 个节点 · {edges.length} 条关联
            {picked && <span className="ml-2 text-primary">— 已选中「{picked.label}」</span>}
          </p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-secondary">
            <ZoomIn size={13}/> 放大
          </button>
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-secondary">
            <ZoomOut size={13}/> 缩小
          </button>
          <button onClick={() => { setZoom(1); setPicked(null); }}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-secondary">
            <RotateCcw size={13}/> 重置
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* 图谱 SVG */}
        <div className="card-soft p-2 overflow-auto" style={{ minHeight: 600 }}>
          <svg
            viewBox="0 0 1000 760"
            className="w-full"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top left", minWidth: `${1000 * zoom}px`, height: `${760 * zoom}px` }}
          >
            {/* 网格背景 */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-border)" strokeWidth="0.3" opacity="0.5"/>
              </pattern>
              <filter id="shadow">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15"/>
              </filter>
            </defs>
            <rect width="1000" height="760" fill="url(#grid)"/>

            {/* 边 */}
            {edges.map((e, i) => {
              const a = nodes.find((n) => n.id === e.from);
              const b = nodes.find((n) => n.id === e.to);
              if (!a || !b) return null;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const strokeColor = e.color ?? (e.dashed ? "var(--color-border)" : "var(--color-primary)");
              return (
                <g key={i}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={strokeColor}
                    strokeWidth={e.dashed ? 1.2 : 1.8}
                    strokeDasharray={e.dashed ? "6,3" : "none"}
                    opacity={e.dashed ? 0.7 : 1}
                  />
                  {e.label && (
                    <text x={mx} y={my - 5} textAnchor="middle" fontSize={9}
                      fill={e.color ?? "var(--color-muted-foreground)"} opacity={0.8}
                      fontWeight={e.color ? 600 : 400}>
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 节点 */}
            {nodes.map((n) => {
              const active = picked?.id === n.id;
              const size = n.type === "exp" ? 32 : n.type === "sample" || n.type === "device" ? 24 : 20;
              return (
                <g
                  key={n.id}
                  className="cursor-pointer"
                  onClick={() => setPicked(n)}
                  filter={active ? "url(#shadow)" : undefined}
                >
                  {/* 光晕 (选中时) */}
                  {active && (
                    <circle cx={n.x} cy={n.y} r={size + 10} fill="none" stroke={typeColor(n.type)} strokeWidth={2} opacity={0.2}/>
                  )}
                  {/* 主体 */}
                  {n.type === "exp" ? (
                    <rect x={n.x - size} y={n.y - size/2} width={size*2} height={size}
                      rx={8} fill={typeColor(n.type)} opacity={active ? 1 : 0.85}/>
                  ) : (
                    <circle cx={n.x} cy={n.y} r={size}
                      fill={typeColor(n.type)} opacity={active ? 1 : 0.7}/>
                  )}
                  {/* 图标 */}
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={n.type === "exp" ? 12 : 9} fill="white" fontWeight="bold">
                    {n.type === "exp" ? "📋" : n.type === "sample" ? "🧪" : n.type === "device" ? "⚙️" : "💡"}
                  </text>
                  {/* 标签 */}
                  <text x={n.x} y={n.y + size + 16} textAnchor="middle" fontSize={n.type === "exp" ? 12 : 10}
                    fill={active ? "var(--color-primary)" : "var(--color-foreground)"} fontWeight={n.type === "exp" ? 600 : 400}>
                    {n.label}
                  </text>
                  {n.sublabel && (
                    <text x={n.x} y={n.y + size + 30} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">
                      {n.sublabel}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* 详情面板 */}
        <DetailPanel node={picked} experiments={experiments} onClose={() => setPicked(null)}/>
      </div>

      {/* 图例 */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground px-2">
        {(["exp", "sample", "device", "finding"] as NodeType[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ background: typeColor(t) }}/>
            {typeLabel(t)}
          </span>
        ))}
        <span className="ml-4 border-l border-border pl-4">实线 = 直接关联</span>
        <span>虚线 = 间接关联</span>
        <span className="ml-4 border-l border-border pl-4" style={{ color: "var(--color-success)" }}>语义边 = AI 相似度 &gt;75%</span>
      </div>
    </div>
  );
}

// ====== 详情面板 ======

function DetailPanel({ node, experiments, onClose }: {
  node: GraphNode | null; experiments: Experiment[]; onClose: () => void;
}) {
  if (!node) {
    return (
      <div className="card-soft p-5 text-sm text-muted-foreground">
        <div className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <Lightbulb size={14} className="text-primary"/> 节点详情
        </div>
        <p className="text-xs leading-relaxed">
          点击图谱中任意节点查看详细信息。实验节点显示完整卡片链接，样品/设备节点显示关联实验列表。
        </p>
        <div className="mt-3 space-y-1.5 text-xs">
          <p>📋 <b>实验节点</b> — 实验卡片主体</p>
          <p>🧪 <b>样品节点</b> — 共用样品的实验</p>
          <p>⚙️ <b>设备节点</b> — 共用设备的实验</p>
          <p>💡 <b>发现节点</b> — 关键参数与结果</p>
        </div>
      </div>
    );
  }

  const exp = node.expId ? experiments.find((e) => e.id === node.expId) : undefined;
  const related = exp
    ? experiments.filter((e) => e.id !== exp.id && (
        (e.sample.id && e.sample.id === exp.sample.id) ||
        (e.device.name && e.device.name === exp.device.name)
      ))
    : [];

  return (
    <div className="card-soft p-5 border-primary/30 max-h-[650px] overflow-auto">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: typeColor2(node.type) }}>{typeLabel2(node.type)}</div>
          <div className="text-base font-semibold mt-1">{node.label}</div>
          {node.sublabel && <div className="text-xs text-muted-foreground mt-0.5">{node.sublabel}</div>}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X size={14}/></button>
      </div>

      {exp && (
        <div className="space-y-3 text-sm">
          <Row icon={<FileText size={13}/>} label="实验名称" value={exp.name}/>
          <Row icon={<User size={13}/>} label="操作人" value={exp.operator || "—"}/>
          <Row icon={<FlaskConical size={13}/>} label="设备" value={`${exp.device.name || "—"} ${exp.device.model || ""}`}/>
          <Row icon={<Cpu size={13}/>} label="样品" value={`${exp.sample.id || "—"} (${exp.sample.batch || ""})`}/>

          {/* 关联实验 */}
          {related.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground font-semibold mb-1.5 mt-2">
                🔗 关联实验（{related.length}）：
              </div>
              <ul className="space-y-1">
                {related.slice(0, 4).map((e) => (
                  <li key={e.id} className="text-xs rounded-lg bg-secondary/60 p-2 flex items-center justify-between">
                    <span className="truncate">{e.name}</span>
                    <Link to="/workbench" search={{ id: e.id }}
                      className="shrink-0 text-primary text-[10px] hover:underline flex items-center gap-0.5 ml-2">
                      查看<ArrowUpRight size={10}/>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Link to="/workbench" search={{ id: exp.id }}
              className="flex-1 text-center rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90">
              查看实验卡片
            </Link>
          </div>
        </div>
      )}

      {!exp && (
        <p className="text-xs text-muted-foreground">此节点未关联到具体实验卡片。</p>
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground w-14 shrink-0">{label}</span>
      <span className="flex-1 font-medium truncate">{value}</span>
    </div>
  );
}

function typeColor2(t: NodeType): string {
  return { exp: "#6366f1", sample: "#f59e0b", device: "#10b981", method: "#8b5cf6", finding: "#ec4899" }[t];
}
function typeLabel2(t: NodeType): string {
  return { exp: "实验节点", sample: "样品节点", device: "设备节点", method: "方法节点", finding: "发现节点" }[t];
}
