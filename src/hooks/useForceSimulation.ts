/**
 * d3-force 力导向模拟 Hook
 *
 * 管理 d3-force simulation 生命周期，输出可渲染的节点坐标
 */
import { useRef, useEffect, useState, useCallback } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";
import type { GraphNode, GraphEdge } from "../lib/graph-types";

// ═══════════════════════════════════════════════════════
// 模拟节点
// ═══════════════════════════════════════════════════════

type SimNode = SimulationNodeDatum & {
  id: string;
  type: string;
  degree: number;
  pinned?: boolean;
};

type SimLink = {
  source: string | SimNode;
  target: string | SimNode;
  strength: number;
};

// ═══════════════════════════════════════════════════════
// 颜色方案
// ═══════════════════════════════════════════════════════

export const NODE_COLORS: Record<string, string> = {
  experiment: "#6366f1",
  sample: "#f59e0b",
  device: "#10b981",
  operator: "#06b6d4",
  discipline: "#ec4899",
  finding: "#8b5cf6",
};

export const EDGE_COLORS: Record<string, string> = {
  uses_sample: "#f59e0b",
  uses_device: "#10b981",
  sample_shared: "#f59e0b",
  device_shared: "#10b981",
  operator_shared: "#06b6d4",
  semantic_similar: "#22c55e",
  temporal: "#94a3b8",
  custom: "#6366f1",
  has_param: "#8b5cf6",
  has_result: "#8b5cf6",
  belongs_to: "#ec4899",
};

// ═══════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════

export function useForceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
) {
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  // 用 ref 存 width/height，simulation tick 里读到最新值
  const dimsRef = useRef({ w: width, h: height });

  useEffect(() => {
    dimsRef.current = { w: width, h: height };
    // 不重建 simulation，只更新 center force
    if (simRef.current) {
      simRef.current.force("center", forceCenter(width / 2, height / 2).strength(0.3));
      simRef.current.force("x", forceX<SimNode>(width / 2).strength((d) => d.type === "experiment" ? 0.1 : 0.05));
      simRef.current.force("y", forceY<SimNode>(height / 2).strength((d) => d.type === "experiment" ? 0.1 : 0.05));
      simRef.current.alpha(0.1).restart();
    }
  }, [width, height]);

  // 节点半径
  const nodeRadius = useCallback((d: { degree: number; type: string }) => {
    const base = d.type === "experiment" ? 14 : d.type === "finding" ? 10 : 12;
    return Math.min(base + (d.degree ?? 0) * 1.5, 30);
  }, []);

  // 构建/更新 simulation（仅在 nodes/edges 变化时）
  const prevNodeSigRef = useRef("");
  useEffect(() => {
    mountedRef.current = true;
    if (nodes.length === 0) {
      setSimNodes([]);
      return;
    }

    const sig = nodes.map((n) => n.id).sort().join(",") + "|" + edges.length;
    const isNew = sig !== prevNodeSigRef.current;
    prevNodeSigRef.current = sig;

    const { w, h } = dimsRef.current;

    // 保留旧位置
    const oldPos = new Map<string, { x: number; y: number }>();
    if (isNew && simRef.current) {
      for (const sn of simRef.current.nodes()) {
        if (typeof sn.x === "number" && typeof sn.y === "number") {
          oldPos.set(sn.id, { x: sn.x, y: sn.y });
        }
      }
    }

    // 构建 sim nodes
    const snodes: SimNode[] = nodes.map((n) => {
      const old = oldPos.get(n.id);
      return {
        id: n.id,
        type: n.type,
        degree: n.degree ?? 0,
        x: old?.x ?? (w / 2 + (Math.random() - 0.5) * 200),
        y: old?.y ?? (h / 2 + (Math.random() - 0.5) * 200),
        pinned: false,
      };
    });

    // 构建 links
    const nodeMap = new Map(snodes.map((n) => [n.id, n]));
    const slinks: SimLink[] = edges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({
        source: e.source,
        target: e.target,
        strength: e.strength * 0.5,
      }));

    // 创建/更新 simulation
    if (simRef.current) {
      simRef.current.stop();
    }

    const sim = forceSimulation<SimNode>(snodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(slinks)
          .id((d) => d.id)
          .distance(120)
          .strength((l) => l.strength),
      )
      .force("charge", forceManyBody().strength(-500))
      .force("center", forceCenter(w / 2, h / 2).strength(0.1))
      .force("collide", forceCollide<SimNode>().radius((d) => nodeRadius(d) + 16))
      .force("x", forceX<SimNode>(w / 2).strength((d) => d.type === "experiment" ? 0.03 : 0.02))
      .force("y", forceY<SimNode>(h / 2).strength((d) => d.type === "experiment" ? 0.03 : 0.02))
      .alphaDecay(0.028)
      .velocityDecay(0.3);

    // tick → rAF 节流到 ~30fps
    let lastTick = 0;
    sim.on("tick", () => {
      if (!mountedRef.current) { sim.stop(); return; }
      const now = performance.now();
      if (now - lastTick < 32) return; // ~30fps
      lastTick = now;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!mountedRef.current) return;
        setSimNodes([...sim.nodes()]);
      });
    });

    sim.on("end", () => {
      if (!mountedRef.current) return;
      setSimNodes([...sim.nodes()]);
    });

    simRef.current = sim;

    return () => {
      sim.stop();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [nodes, edges]);

  // 组件卸载标记
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // 拖拽
  const dragNode = useCallback((id: string, x: number, y: number) => {
    const sim = simRef.current;
    if (!sim) return;
    const node = sim.nodes().find((n) => n.id === id);
    if (node) {
      node.fx = x;
      node.fy = y;
      node.pinned = true;
      sim.alpha(0.3).restart();
    }
  }, []);

  const releaseNode = useCallback((id: string) => {
    const sim = simRef.current;
    if (!sim) return;
    const node = sim.nodes().find((n) => n.id === id);
    if (node) {
      node.fx = null;
      node.fy = null;
      node.pinned = false;
    }
  }, []);

  const reheat = useCallback((alpha = 0.5) => {
    const sim = simRef.current;
    if (!sim) return;
    for (const n of sim.nodes()) {
      n.fx = null;
      n.fy = null;
      n.pinned = false;
    }
    sim.alpha(alpha).restart();
  }, []);

  return { simNodes, nodeRadius, dragNode, releaseNode, reheat };
}
