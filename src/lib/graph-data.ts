/**
 * 图谱数据构建器 — 实体去重 + 边生成
 *
 * 纯函数：Experiment[] + ExperimentRelation[] → GraphData
 * 可在客户端和测试中使用
 */
import type { Experiment } from "./labStore";
import type { ExperimentRelation } from "./supabase";
import type { GraphData, GraphNode, GraphEdge } from "./graph-types";

// ═══════════════════════════════════════════════════════
// 余弦相似度（语义边计算用）
// ═══════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════
// 实体键构建
// ═══════════════════════════════════════════════════════

function sampleKey(sampleId: string) {
  return `sample:${sampleId}`;
}
function deviceKey(deviceName: string) {
  return `device:${deviceName.trim()}`;
}
function operatorKey(operator: string) {
  return `operator:${operator.trim()}`;
}
function disciplineKey(discipline: string) {
  return `discipline:${discipline.trim()}`;
}

// ═══════════════════════════════════════════════════════
// 主构建函数
// ═══════════════════════════════════════════════════════

export function buildGraphData(
  experiments: Experiment[],
  relations?: ExperimentRelation[],
): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  // 实体去重 Map
  const entityMap = new Map<string, GraphNode>();

  const addNode = (node: GraphNode) => {
    if (entityMap.has(node.entityKey)) {
      // 合并 expIds
      const existing = entityMap.get(node.entityKey)!;
      for (const eid of node.expIds) {
        if (!existing.expIds.includes(eid)) existing.expIds.push(eid);
      }
    } else {
      entityMap.set(node.entityKey, node);
      nodes.push(node);
    }
  };

  const addEdge = (edge: GraphEdge) => {
    // 避免重复边
    const dup = edges.find(
      (e) => e.source === edge.source && e.target === edge.target && e.type === edge.type,
    );
    if (!dup) edges.push(edge);
  };

  // ════════════════ 1. 实验节点 ════════════════
  for (const exp of experiments) {
    addNode({
      id: exp.id,
      label: exp.name.length > 20 ? exp.name.slice(0, 19) + "…" : exp.name,
      sublabel: exp.date,
      type: "experiment",
      entityKey: `exp:${exp.id}`,
      expIds: [exp.id],
    });
  }

  // ════════════════ 2. 实体节点 ════════════════
  for (const exp of experiments) {
    // 样品
    if (exp.sample.id) {
      const n: GraphNode = {
        id: sampleKey(exp.sample.id),
        label: `🧪 ${exp.sample.id}`,
        sublabel: exp.sample.batch || undefined,
        type: "sample",
        entityKey: sampleKey(exp.sample.id),
        expIds: [exp.id],
      };
      addNode(n);
      addEdge({
        id: `${exp.id}-sample-${exp.sample.id}`,
        source: exp.id,
        target: n.id,
        type: "uses_sample",
        label: "使用样品",
        strength: 1.0,
      });
    }

    // 设备
    if (exp.device.name) {
      const n: GraphNode = {
        id: deviceKey(exp.device.name),
        label: `⚙️ ${exp.device.name}`,
        sublabel: exp.device.model || undefined,
        type: "device",
        entityKey: deviceKey(exp.device.name),
        expIds: [exp.id],
      };
      addNode(n);
      addEdge({
        id: `${exp.id}-device-${exp.device.name}`,
        source: exp.id,
        target: n.id,
        type: "uses_device",
        label: "使用设备",
        strength: 1.0,
      });
    }

    // 操作人
    if (exp.operator && exp.operator !== "未识别") {
      const n: GraphNode = {
        id: operatorKey(exp.operator),
        label: `👤 ${exp.operator}`,
        type: "operator",
        entityKey: operatorKey(exp.operator),
        expIds: [exp.id],
      };
      addNode(n);
      addEdge({
        id: `${exp.id}-operator-${exp.operator}`,
        source: exp.id,
        target: n.id,
        type: "operator_shared",
        label: "操作人",
        strength: 0.8,
      });
    }

    // 学科
    if (exp.discipline) {
      const n: GraphNode = {
        id: disciplineKey(exp.discipline),
        label: exp.discipline,
        type: "discipline",
        entityKey: disciplineKey(exp.discipline),
        expIds: [exp.id],
      };
      addNode(n);
      addEdge({
        id: `${exp.id}-discipline-${exp.discipline}`,
        source: exp.id,
        target: n.id,
        type: "belongs_to",
        label: "学科",
        strength: 0.6,
      });
    }

    // 关键参数 → finding 节点
    const topParam = exp.params.find(
      (p) => p.name.includes("温度") || p.name.includes("尺寸") || p.name.includes("浓度") || p.name.includes("用量"),
    ) ?? exp.params[0];
    if (topParam) {
      const fid = `finding:${exp.id}:${topParam.name}`;
      addNode({
        id: fid,
        label: `${topParam.name}=${topParam.value}${topParam.unit ?? ""}`,
        sublabel: "关键参数",
        type: "finding",
        entityKey: fid,
        expIds: [exp.id],
      });
      addEdge({
        id: `${exp.id}-param-${topParam.name}`,
        source: exp.id,
        target: fid,
        type: "has_param",
        label: "参数",
        strength: 0.5,
        dashed: true,
      });
    }

    // 实验结果 → finding 节点
    if (exp.results) {
      const rid = `result:${exp.id}`;
      const short = exp.results.length > 25 ? exp.results.slice(0, 24) + "…" : exp.results;
      addNode({
        id: rid,
        label: short,
        sublabel: "实验结果",
        type: "finding",
        entityKey: rid,
        expIds: [exp.id],
      });
      addEdge({
        id: `${exp.id}-result`,
        source: exp.id,
        target: rid,
        type: "has_result",
        label: "结论",
        strength: 0.4,
        dashed: true,
      });
    }
  }

  // ════════════════ 3. 跨实验关系 ════════════════

  // 3a. 从 Supabase experiment_relations 接入
  if (relations && relations.length > 0) {
    for (const rel of relations) {
      addEdge({
        id: rel.id,
        source: rel.source_exp_id,
        target: rel.target_exp_id,
        type: rel.relation_type as GraphEdge["type"],
        label: RELATION_LABELS_SHORT[rel.relation_type] ?? rel.relation_type,
        strength: rel.similarity ?? (rel.relation_type === "semantic_similar" ? 0.5 : 0.9),
        dashed: rel.relation_type === "semantic_similar" || rel.relation_type === "temporal",
      });
    }
  }

  // 3b. 同一样品被多个实验使用 → 加共享边
  const sampleExps = new Map<string, string[]>();
  for (const exp of experiments) {
    if (exp.sample.id) {
      const key = sampleKey(exp.sample.id);
      if (!sampleExps.has(key)) sampleExps.set(key, []);
      sampleExps.get(key)!.push(exp.id);
    }
  }
  for (const [, expIds] of sampleExps) {
    for (let i = 0; i < expIds.length; i++) {
      for (let j = i + 1; j < expIds.length; j++) {
        addEdge({
          id: `shared-sample:${expIds[i]}-${expIds[j]}`,
          source: expIds[i],
          target: expIds[j],
          type: "sample_shared",
          label: "同一样品",
          strength: 0.9,
        });
      }
    }
  }

  // 3c. 同一设备被多个实验使用
  const deviceExps = new Map<string, string[]>();
  for (const exp of experiments) {
    if (exp.device.name) {
      const key = deviceKey(exp.device.name);
      if (!deviceExps.has(key)) deviceExps.set(key, []);
      deviceExps.get(key)!.push(exp.id);
    }
  }
  for (const [, expIds] of deviceExps) {
    for (let i = 0; i < expIds.length; i++) {
      for (let j = i + 1; j < expIds.length; j++) {
        addEdge({
          id: `shared-device:${expIds[i]}-${expIds[j]}`,
          source: expIds[i],
          target: expIds[j],
          type: "device_shared",
          label: "同一设备",
          strength: 0.9,
        });
      }
    }
  }

  // 3d. 同一操作人
  const operatorExps = new Map<string, string[]>();
  for (const exp of experiments) {
    if (exp.operator && exp.operator !== "未识别") {
      const key = operatorKey(exp.operator);
      if (!operatorExps.has(key)) operatorExps.set(key, []);
      operatorExps.get(key)!.push(exp.id);
    }
  }
  for (const [, expIds] of operatorExps) {
    for (let i = 0; i < expIds.length; i++) {
      for (let j = i + 1; j < expIds.length; j++) {
        addEdge({
          id: `shared-operator:${expIds[i]}-${expIds[j]}`,
          source: expIds[i],
          target: expIds[j],
          type: "operator_shared",
          label: "相同操作人",
          strength: 0.7,
          dashed: true,
        });
      }
    }
  }

  // 3e. 时间顺序
  const sorted = [...experiments].filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 0; i < sorted.length - 1; i++) {
    addEdge({
      id: `temporal:${sorted[i].id}-${sorted[i + 1].id}`,
      source: sorted[i].id,
      target: sorted[i + 1].id,
      type: "temporal",
      label: "时间先后",
      strength: 0.3,
      dashed: true,
    });
  }

  // 3f. 语义相似度
  for (let i = 0; i < experiments.length; i++) {
    for (let j = i + 1; j < experiments.length; j++) {
      const a = experiments[i].embedding;
      const b = experiments[j].embedding;
      if (!a || !b) continue;
      const sim = cosineSimilarity(a, b);
      if (sim > 0.75) {
        addEdge({
          id: `semantic:${experiments[i].id}-${experiments[j].id}`,
          source: experiments[i].id,
          target: experiments[j].id,
          type: "semantic_similar",
          label: `语义 ${(sim * 100).toFixed(0)}%`,
          strength: sim,
          dashed: true,
        });
      }
    }
  }

  // ════════════════ 4. 计算度数 ════════════════
  for (const edge of edges) {
    const src = nodes.find((n) => n.id === edge.source);
    const tgt = nodes.find((n) => n.id === edge.target);
    if (src) src.degree = (src.degree ?? 0) + 1;
    if (tgt) tgt.degree = (tgt.degree ?? 0) + 1;
  }

  return { nodes, edges };
}

// ═══════════════════════════════════════════════════════
// 关系类型 → 短标签
// ═══════════════════════════════════════════════════════

const RELATION_LABELS_SHORT: Record<string, string> = {
  sample_shared: "共享样品",
  device_shared: "共享设备",
  semantic_similar: "语义相似",
  temporal: "时序关联",
  operator_shared: "相同操作人",
  custom: "自定义",
};
