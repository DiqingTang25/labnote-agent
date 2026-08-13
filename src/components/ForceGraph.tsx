/**
 * ForceGraph — Obsidian 风格力导向知识图谱
 *
 * d3-force 物理模拟 + SVG 渲染 + d3-zoom 缩放平移
 */
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { ZoomIn, ZoomOut, RotateCcw, RefreshCw } from "lucide-react";
import { zoom, type ZoomBehavior, type D3ZoomEvent } from "d3-zoom";
import { select } from "d3-selection";
import { useForceSimulation, NODE_COLORS, EDGE_COLORS } from "../hooks/useForceSimulation";
import type { GraphNode, GraphEdge, GraphData } from "../lib/graph-types";

// ═══════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════

type Props = {
  graphData: GraphData;
  width: number;
  height: number;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onNodeClick: (nodeId: string | null) => void;
  onNodeHover: (nodeId: string | null) => void;
};

// ═══════════════════════════════════════════════════════
// 1-hop 邻居集合
// ═══════════════════════════════════════════════════════

function getNeighbors(nodeId: string | null, edges: GraphEdge[]): Set<string> {
  if (!nodeId) return new Set();
  const set = new Set<string>([nodeId]);
  for (const e of edges) {
    if (e.source === nodeId) set.add(e.target);
    if (e.target === nodeId) set.add(e.source);
  }
  return set;
}

// ═══════════════════════════════════════════════════════
// 节点标签
// ═══════════════════════════════════════════════════════

const TYPE_ICONS: Record<string, string> = {
  experiment: "●",
  sample: "●",
  device: "●",
  operator: "●",
  discipline: "●",
  finding: "●",
};

// ═══════════════════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════════════════

export function ForceGraph({
  graphData,
  width,
  height,
  selectedNodeId,
  hoveredNodeId,
  onNodeClick,
  onNodeHover,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const [zoomTransform, setZoomTransform] = useState({ x: 0, y: 0, k: 1 });

  const { simNodes, nodeRadius, dragNode, releaseNode, reheat } =
    useForceSimulation(graphData.nodes, graphData.edges, width, height);

  // 邻居集
  const neighbors = useMemo(
    () => getNeighbors(hoveredNodeId, graphData.edges),
    [hoveredNodeId, graphData.edges],
  );

  // 建立 simNode ID 到坐标的映射
  const posMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const sn of simNodes) {
      if (typeof sn.x === "number" && typeof sn.y === "number") {
        m.set(sn.id, { x: sn.x, y: sn.y });
      }
    }
    return m;
  }, [simNodes]);

  // d3-zoom 绑定
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .filter((event) => {
        // 不拦截节点上的 mousedown（留给拖拽处理）
        const target = event.target as Element;
        return !target.closest("[data-node]");
      })
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        if (gRef.current) {
          select(gRef.current).attr("transform", event.transform.toString());
          setZoomTransform({ x: event.transform.x, y: event.transform.y, k: event.transform.k });
        }
      });

    svg.call(z);
    zoomRef.current = z;

    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  // 拖拽节点 — 阻止 d3-zoom 抢事件，正确变换坐标
  const handleMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const svgEl = svgRef.current;
      if (!svgEl) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const node = posMap.get(nodeId);
      if (!node) return;

      const startNodeX = node.x * zoomTransform.k + zoomTransform.x;
      const startNodeY = node.y * zoomTransform.k + zoomTransform.y;

      const onMove = (me: MouseEvent) => {
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;
        dragNode(
          nodeId,
          (startNodeX + dx - zoomTransform.x) / zoomTransform.k,
          (startNodeY + dy - zoomTransform.y) / zoomTransform.k,
        );
      };

      const onUp = () => {
        releaseNode(nodeId);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [posMap, zoomTransform, dragNode, releaseNode],
  );

  // 缩放控制
  const zoomIn = () => {
    if (zoomRef.current && svgRef.current) {
      (select(svgRef.current) as any).transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
    }
  };
  const zoomOut = () => {
    if (zoomRef.current && svgRef.current) {
      (select(svgRef.current) as any).transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
    }
  };
  const zoomReset = () => {
    if (zoomRef.current && svgRef.current) {
      (select(svgRef.current) as any).transition().duration(400).call(zoomRef.current.transform, { x: 0, y: 0, k: 1 });
    }
  };

  if (graphData.nodes.length === 0) return null;

  return (
    <div className="relative w-full h-full" style={{ minHeight: 600 }}>
      {/* 工具栏浮层 */}
      <div className="absolute top-3 right-3 z-10 flex gap-1">
        <button onClick={zoomIn} className="rounded-lg border border-border bg-background p-1.5 hover:bg-secondary" title="放大">
          <ZoomIn size={14} />
        </button>
        <button onClick={zoomOut} className="rounded-lg border border-border bg-background p-1.5 hover:bg-secondary" title="缩小">
          <ZoomOut size={14} />
        </button>
        <button onClick={zoomReset} className="rounded-lg border border-border bg-background p-1.5 hover:bg-secondary" title="重置">
          <RotateCcw size={14} />
        </button>
        <button onClick={() => reheat(0.5)} className="rounded-lg border border-border bg-background p-1.5 hover:bg-secondary" title="重新布局">
          <RefreshCw size={14} />
        </button>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="cursor-grab active:cursor-grabbing"
        style={{ background: "transparent" }}
        onClick={() => onNodeClick(null)}
      >
        {/* 网格背景 */}
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="0.8" fill="currentColor" opacity="0.1" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* 所有图形内容（受 zoom 控制） */}
        <g ref={gRef}>
          {/* 边 */}
          {graphData.edges.map((edge) => {
            const src = posMap.get(edge.source);
            const tgt = posMap.get(edge.target);
            if (!src || !tgt) return null;

            const isHighlighted =
              neighbors.has(edge.source) && neighbors.has(edge.target);
            const isDimmed = hoveredNodeId && !isHighlighted;

            const color = EDGE_COLORS[edge.type] ?? "currentColor";

            return (
              <line
                key={edge.id || `${edge.source}-${edge.target}`}
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke={color}
                strokeWidth={isHighlighted ? 2 : edge.strength > 0.7 ? 1.5 : 0.8}
                strokeDasharray={edge.dashed ? "5,3" : undefined}
                opacity={isDimmed ? 0.08 : isHighlighted ? 0.8 : 0.35}
                style={{ transition: "opacity 0.2s" }}
              />
            );
          })}

          {/* 节点 */}
          {simNodes.map((sn) => {
            const node = graphData.nodes.find((n) => n.id === sn.id);
            if (!node) return null;

            const isSelected = selectedNodeId === sn.id;
            const isHovered = hoveredNodeId === sn.id;
            const isNeighbor = neighbors.has(sn.id);
            const isDimmed = hoveredNodeId && !isNeighbor;

            const r = nodeRadius({ type: sn.type, degree: sn.degree ?? 0 });
            const color = NODE_COLORS[sn.type] ?? "#6366f1";
            const scale = isHovered || isSelected ? 1.12 : 1;

            return (
              <g
                key={sn.id}
                data-node="true"
                transform={`translate(${sn.x}, ${sn.y}) scale(${scale})`}
                className="cursor-pointer"
                style={{ transition: "opacity 0.2s" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onNodeClick(sn.id);
                }}
                onMouseEnter={() => onNodeHover(sn.id)}
                onMouseLeave={() => onNodeHover(null)}
                onMouseDown={(e) => handleMouseDown(sn.id, e)}
                opacity={isDimmed ? 0.12 : 1}
              >
                {/* 选中光晕 */}
                {isSelected && (
                  <circle
                    cx={0} cy={0} r={r + 6}
                    fill="none" stroke={color} strokeWidth={2}
                    opacity={0.3}
                  />
                )}
                {isHovered && (
                  <circle
                    cx={0} cy={0} r={r + 5}
                    fill="none" stroke={color} strokeWidth={1.5}
                    opacity={0.4}
                    filter="url(#glow)"
                  />
                )}

                {/* 节点主体 */}
                {sn.type === "experiment" ? (
                  <rect
                    x={-r * 0.8} y={-r * 0.8}
                    width={r * 1.6} height={r * 1.6}
                    rx={6}
                    fill={color}
                    opacity={isSelected || isHovered ? 1 : 0.85}
                  />
                ) : (
                  <circle
                    cx={0} cy={0} r={r}
                    fill={color}
                    opacity={isSelected || isHovered ? 1 : 0.8}
                  />
                )}

                {/* 图标 */}
                <text
                  x={0} y={2}
                  textAnchor="middle"
                  fontSize={sn.type === "experiment" ? 9 : 7}
                  fill="white"
                  fontWeight="bold"
                  style={{ pointerEvents: "none" }}
                >
                  {TYPE_ICONS[sn.type] ?? "●"}
                </text>

                {/* 标签 */}
                <text
                  x={0}
                  y={r + 12}
                  textAnchor="middle"
                  fontSize={sn.type === "experiment" ? 10 : 8}
                  fill={isSelected ? "var(--color-primary, #6366f1)" : "currentColor"}
                  fontWeight={sn.type === "experiment" ? 600 : 400}
                  style={{ pointerEvents: "none" }}
                >
                  {node.label}
                </text>

                {node.sublabel && zoomTransform.k > 0.7 && (
                  <text
                    x={0}
                    y={r + 22}
                    textAnchor="middle"
                    fontSize={7}
                    fill="var(--color-muted-foreground, #94a3b8)"
                    style={{ pointerEvents: "none" }}
                  >
                    {node.sublabel}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
