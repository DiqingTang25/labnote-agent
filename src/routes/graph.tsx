/**
 * 知识图谱 — Obsidian 风格力导向可视化
 * d3-force 物理引擎 + 实体去重 + Supabase 关系接入
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { useLab, type ExperimentDoc } from "../lib/labStore";
import { getString } from "../lib/property-utils";
import {
  Network, X, FileText, User, FlaskConical, Cpu,
  Lightbulb, ArrowUpRight, Download,
} from "lucide-react";
import { RequireAuth } from "../lib/auth-guard";
import { useGraphData } from "../hooks/useGraphData";
import { ForceGraph } from "../components/ForceGraph";
import { GraphSearch } from "../components/GraphSearch";
import type { GraphNode, GraphData, GraphEdge } from "../lib/graph-types";

// ═══════════════════════════════════════════════════════
// 路由
// ═══════════════════════════════════════════════════════

export const Route = createFileRoute("/graph")({
  head: () => ({
    meta: [
      { title: "实验知识图谱 – LabNote Agent" },
      { name: "description", content: "力导向可视化展示实验、样品、设备之间的关联关系。" },
    ],
  }),
  component: GraphPage,
});

// ═══════════════════════════════════════════════════════
// 颜色方案
// ═══════════════════════════════════════════════════════

const NODE_COLORS: Record<string, string> = {
  experiment: "#6366f1",
  sample: "#f59e0b",
  device: "#10b981",
  operator: "#06b6d4",
  discipline: "#ec4899",
  finding: "#8b5cf6",
};

const NODE_LABELS: Record<string, string> = {
  experiment: "实验",
  sample: "样品",
  device: "设备",
  operator: "操作人",
  discipline: "学科",
  finding: "发现",
};

// ═══════════════════════════════════════════════════════
// 页面组件
// ═══════════════════════════════════════════════════════

/** 本地图：保留 centerId 的 N-hop 邻居 */
function computeLocalGraph(
  data: GraphData,
  centerId: string,
  hops: number,
): GraphData {
  const reachable = new Set<string>([centerId]);
  let frontier = new Set<string>([centerId]);
  for (let h = 0; h < hops; h++) {
    const next = new Set<string>();
    for (const fid of frontier) {
      for (const e of data.edges) {
        if (e.source === fid && !reachable.has(e.target)) next.add(e.target);
        if (e.target === fid && !reachable.has(e.source)) next.add(e.source);
      }
    }
    for (const nid of next) reachable.add(nid);
    frontier = next;
  }
  return {
    nodes: data.nodes.filter((n) => reachable.has(n.id)),
    edges: data.edges.filter((e) => reachable.has(e.source) && reachable.has(e.target)),
  };
}

/** 导出 SVG */
function exportSVG() {
  const svgEl = document.querySelector("svg");
  if (!svgEl) return;
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const blob = new Blob([clone.outerHTML], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "labnote-graph.svg";
  a.click();
  URL.revokeObjectURL(url);
}

function GraphPage() {
  const { experiments } = useLab();
  const { graphData, loading, error } = useGraphData();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [localGraphMode, setLocalGraphMode] = useState(false);
  const [localHops, setLocalHops] = useState(2);

  const selectedNode = useMemo(
    () => graphData.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [graphData.nodes, selectedNodeId],
  );

  // 本地图数据
  const displayData = useMemo(() => {
    if (localGraphMode && selectedNodeId) {
      return computeLocalGraph(graphData, selectedNodeId, localHops);
    }
    return graphData;
  }, [graphData, localGraphMode, selectedNodeId, localHops]);

  // 窗口尺寸 — 使用 useEffect 防抖测量，避免 ref callback 无限循环
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 900, h: 650 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0) {
        setDims((prev) => {
          const w = Math.floor(rect.width - 32);
          const h = Math.floor(rect.height - 16);
          // 避免微小变化触发更新
          if (Math.abs(prev.w - w) < 10 && Math.abs(prev.h - h) < 10) return prev;
          return { w, h };
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 空状态
  if (!loading && experiments.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center text-muted-foreground">
        <Network size={48} className="mx-auto opacity-30" />
        <h1 className="mt-4 text-2xl font-bold">知识图谱</h1>
        <p className="mt-2">尚无实验数据，请先到工作台上传实验记录。</p>
        <Link
          to="/workbench"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground"
        >
          前往工作台 <ArrowUpRight size={14} />
        </Link>
      </div>
    );
  }

  // 加载骨架
  if (loading && graphData.nodes.length === 0) {
    return (
      <RequireAuth>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white">
              <Network size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">实验知识图谱</h1>
              <p className="text-sm text-muted-foreground">加载关系中…</p>
            </div>
          </div>
          <div className="card-soft graph-skeleton rounded-xl" style={{ height: 500 }}>
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/20 animate-pulse" />
                <p className="mt-4 text-sm text-muted-foreground">正在构建知识图谱…</p>
              </div>
            </div>
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <Network size={20} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">实验知识图谱</h1>
            <p className="text-sm text-muted-foreground">
              {displayData.nodes.length} 个节点 · {displayData.edges.length} 条关联
              {localGraphMode && <span className="ml-1 text-primary">（本地图，{localHops} 跳）</span>}
              {selectedNode && (
                <span className="ml-2 text-primary">— 已选中「{selectedNode.label}」</span>
              )}
              {loading && <span className="ml-2 text-primary animate-pulse">加载中…</span>}
            </p>
          </div>
          {error && (
            <span className="text-xs text-destructive">加载失败，使用本地数据</span>
          )}
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-2 mb-3">
          <GraphSearch
            nodes={graphData.nodes}
            selectedNodeId={selectedNodeId}
            onSelect={(id) => setSelectedNodeId(id)}
          />
          {selectedNodeId && (
            <>
              <button
                onClick={() => setLocalGraphMode(!localGraphMode)}
                className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                  localGraphMode
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {localGraphMode ? "本地图 ✓" : "本地图"}
              </button>
              {localGraphMode && (
                <select
                  value={localHops}
                  onChange={(e) => setLocalHops(Number(e.target.value))}
                  className="rounded-lg border border-border bg-background px-1.5 py-1 text-xs"
                >
                  {[1, 2, 3, 4, 5].map((h) => (
                    <option key={h} value={h}>{h} 跳</option>
                  ))}
                </select>
              )}
            </>
          )}
          <div className="ml-auto" />
          <button
            onClick={exportSVG}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 transition"
          >
            <Download size={12} /> SVG
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* 图谱区域 */}
          <div
            ref={containerRef}
            className="card-soft overflow-hidden relative"
            style={{ minHeight: 650 }}
          >
            <ForceGraph
              graphData={displayData}
              width={dims.w}
              height={dims.h}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              onNodeClick={(id) => setSelectedNodeId(id)}
              onNodeHover={(id) => setHoveredNodeId(id)}
            />
          </div>

          {/* 详情面板 */}
          <DetailPanel
            node={selectedNode}
            experiments={experiments}
            onClose={() => setSelectedNodeId(null)}
          />
        </div>

        {/* 图例 */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground px-2">
          {Object.entries(NODE_LABELS).map(([type, label]) => (
            <span key={type} className="inline-flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: NODE_COLORS[type] ?? "#94a3b8" }}
              />
              {label}
            </span>
          ))}
          <span className="ml-4 border-l border-border pl-4">实线 = 直接关联</span>
          <span>虚线 = 间接关联</span>
          <span className="ml-4 border-l border-border pl-4 text-green-500">绿色虚线 = AI 语义关联（相似度 &gt; 75%）</span>
        </div>
      </div>
    </RequireAuth>
  );
}

// ═══════════════════════════════════════════════════════
// 详情面板
// ═══════════════════════════════════════════════════════

function DetailPanel({
  node,
  experiments,
  onClose,
}: {
  node: GraphNode | null;
  experiments: ExperimentDoc[];
  onClose: () => void;
}) {
  if (!node) {
    return (
      <div className="card-soft p-5 text-sm text-muted-foreground">
        <div className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <Lightbulb size={14} className="text-primary" /> 节点详情
        </div>
        <p className="text-xs leading-relaxed">
          点击图谱中任意节点查看详细信息。实验节点显示完整卡片链接，样品/设备节点显示关联实验列表。
        </p>
        <div className="mt-3 space-y-1.5 text-xs">
          <p>📋 <b>实验</b> — 实验卡片主体</p>
          <p>🧪 <b>样品</b> — 共用样品的实验</p>
          <p>⚙️ <b>设备</b> — 共用设备的实验</p>
          <p>👤 <b>操作人</b> — 相同操作人的实验</p>
          <p>📚 <b>学科</b> — 学科分类</p>
          <p>💡 <b>发现</b> — 关键参数与结果</p>
        </div>
      </div>
    );
  }

  // 找到关联的实验（通过 expIds 或 entity key）
  const related = experiments.filter((e) => node.expIds.includes(e.id));
  const otherRelated = experiments.filter(
    (e) => !node.expIds.includes(e.id) && node.expIds.some((eid) => e.id !== eid),
  );

  return (
    <div className="card-soft p-5 border-primary/30 max-h-[650px] overflow-auto">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div
            className="text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: NODE_COLORS[node.type] ?? "#94a3b8" }}
          >
            {NODE_LABELS[node.type] ?? node.type}
          </div>
          <div className="text-base font-semibold mt-1">{node.label}</div>
          {node.sublabel && (
            <div className="text-xs text-muted-foreground mt-0.5">{node.sublabel}</div>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3 text-sm">
        {/* 关联实验 */}
        {related.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground font-semibold mb-1.5">
              🔗 关联实验（{related.length}）：
            </div>
            <ul className="space-y-1">
              {related.slice(0, 6).map((e) => (
                <li
                  key={e.id}
                  className="text-xs rounded-lg bg-secondary/60 p-2 flex items-center justify-between"
                >
                  <span className="truncate">{e.name}</span>
                  <Link
                    to="/workbench"
                    search={{ id: e.id }}
                    className="shrink-0 text-primary text-[10px] hover:underline flex items-center gap-0.5 ml-2"
                  >
                    查看<ArrowUpRight size={10} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 实验节点额外信息 */}
        {node.type === "experiment" && related[0] && (
          <div className="space-y-2 pt-2 border-t border-border">
            <Row icon={<FileText size={13} />} label="实验名称" value={related[0].name} />
            <Row icon={<User size={13} />} label="操作人" value={related[0].operator || "—"} />
            <Row
              icon={<FlaskConical size={13} />}
              label="设备"
              value={`${getString(related[0].properties, "device.name") || "—"} ${getString(related[0].properties, "device.model")}`}
            />
            <Row
              icon={<Cpu size={13} />}
              label="样品"
              value={`${getString(related[0].properties, "sample.id") || "—"} (${getString(related[0].properties, "sample.batch")})`}
            />
            <div className="pt-2">
              <Link
                to="/workbench"
                search={{ id: related[0].id }}
                className="block text-center rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
              >
                查看完整实验卡片
              </Link>
            </div>
          </div>
        )}

        {/* 度数 */}
        <div className="text-xs text-muted-foreground pt-1 border-t border-border">
          连接数：{node.degree ?? 0}
        </div>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground w-14 shrink-0">{label}</span>
      <span className="flex-1 font-medium truncate">{value}</span>
    </div>
  );
}
