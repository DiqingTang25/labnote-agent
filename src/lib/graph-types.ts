/**
 * 知识图谱 — 统一类型定义
 */

// ═══════════════════════════════════════════════════════
// 节点
// ═══════════════════════════════════════════════════════

export type GraphNodeType =
  | "experiment"
  | "sample"
  | "device"
  | "operator"
  | "discipline"
  | "finding";

export type GraphNode = {
  id: string;
  label: string;
  sublabel?: string;
  type: GraphNodeType;
  /** 实体去重键：同一实体共享同一个 key */
  entityKey: string;
  /** 关联的实验 ID 列表 */
  expIds: string[];
  /** 度数（连接数） */
  degree?: number;
  /** 位置 — 由 d3-force 填充 */
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

// ═══════════════════════════════════════════════════════
// 边
// ═══════════════════════════════════════════════════════

export type GraphEdgeType =
  | "uses_sample"
  | "uses_device"
  | "sample_shared"
  | "device_shared"
  | "operator_shared"
  | "semantic_similar"
  | "temporal"
  | "custom"
  | "has_param"
  | "has_result"
  | "belongs_to";

export type GraphEdge = {
  id: string;
  source: string; // 节点 id
  target: string; // 节点 id
  type: GraphEdgeType;
  label?: string;
  /** 0–1，影响连线粗细和吸引力 */
  strength: number;
  dashed?: boolean;
};

// ═══════════════════════════════════════════════════════
// 图谱数据
// ═══════════════════════════════════════════════════════

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};
