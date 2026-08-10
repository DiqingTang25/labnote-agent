import type { ExperimentDoc } from "./labStore";
import type { ExperimentRelation } from "./supabase";
import type { GraphData, GraphEdge, GraphNode } from "./graph-types";
import { getProperty, getString } from "./property-utils";

function cosineSimilarity(a: number[], b: number[]): number { let dot = 0; let normA = 0; let normB = 0; for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]; } return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0; }
const sampleKey = (value: string) => `sample:${value}`;
const deviceKey = (value: string) => `device:${value.trim()}`;
const operatorKey = (value: string) => `operator:${value.trim()}`;
const disciplineKey = (value: string) => `discipline:${value.trim()}`;

type Parameter = { name: string; value?: string | number; unit?: string };
function parameters(experiment: ExperimentDoc): Parameter[] { const value = getProperty(experiment.properties, "params"); return Array.isArray(value) ? value.filter((item): item is Parameter => item !== null && typeof item === "object" && !Array.isArray(item) && typeof item.name === "string") : []; }

export function buildGraphData(experiments: ExperimentDoc[], relations?: ExperimentRelation[]): GraphData {
  const nodes: GraphNode[] = []; const edges: GraphEdge[] = []; const entityMap = new Map<string, GraphNode>();
  const addNode = (node: GraphNode) => { const existing = entityMap.get(node.entityKey); if (existing) { node.expIds.forEach((id) => { if (!existing.expIds.includes(id)) existing.expIds.push(id); }); } else { entityMap.set(node.entityKey, node); nodes.push(node); } };
  const addEdge = (edge: GraphEdge) => { if (!edges.some((item) => item.source === edge.source && item.target === edge.target && item.type === edge.type)) edges.push(edge); };
  for (const experiment of experiments) addNode({ id: experiment.id, label: experiment.name.length > 20 ? `${experiment.name.slice(0, 19)}…` : experiment.name, sublabel: experiment.date, type: "experiment", entityKey: `exp:${experiment.id}`, expIds: [experiment.id] });
  for (const experiment of experiments) {
    const sampleId = getString(experiment.properties, "sample.id"); const sampleBatch = getString(experiment.properties, "sample.batch"); const deviceName = getString(experiment.properties, "device.name"); const deviceModel = getString(experiment.properties, "device.model"); const discipline = getString(experiment.properties, "discipline"); const result = getString(experiment.properties, "results");
    if (sampleId) { const id = sampleKey(sampleId); addNode({ id, label: `🧪 ${sampleId}`, sublabel: sampleBatch || undefined, type: "sample", entityKey: id, expIds: [experiment.id] }); addEdge({ id: `${experiment.id}-sample-${sampleId}`, source: experiment.id, target: id, type: "uses_sample", label: "使用样品", strength: 1 }); }
    if (deviceName) { const id = deviceKey(deviceName); addNode({ id, label: `⚙️ ${deviceName}`, sublabel: deviceModel || undefined, type: "device", entityKey: id, expIds: [experiment.id] }); addEdge({ id: `${experiment.id}-device-${deviceName}`, source: experiment.id, target: id, type: "uses_device", label: "使用设备", strength: 1 }); }
    if (experiment.operator && experiment.operator !== "未识别") { const id = operatorKey(experiment.operator); addNode({ id, label: `👤 ${experiment.operator}`, type: "operator", entityKey: id, expIds: [experiment.id] }); addEdge({ id: `${experiment.id}-operator`, source: experiment.id, target: id, type: "operator_shared", label: "操作人", strength: .8 }); }
    if (discipline) { const id = disciplineKey(discipline); addNode({ id, label: discipline, type: "discipline", entityKey: id, expIds: [experiment.id] }); addEdge({ id: `${experiment.id}-discipline`, source: experiment.id, target: id, type: "belongs_to", label: "学科", strength: .6 }); }
    const parameter = parameters(experiment).find((item) => /温度|尺寸|浓度|用量/.test(item.name)) ?? parameters(experiment)[0];
    if (parameter) { const id = `finding:${experiment.id}:${parameter.name}`; addNode({ id, label: `${parameter.name}=${parameter.value ?? ""}${parameter.unit ?? ""}`, sublabel: "关键参数", type: "finding", entityKey: id, expIds: [experiment.id] }); addEdge({ id: `${experiment.id}-param-${parameter.name}`, source: experiment.id, target: id, type: "has_param", label: "参数", strength: .5, dashed: true }); }
    if (result) { const id = `result:${experiment.id}`; addNode({ id, label: result.length > 25 ? `${result.slice(0, 24)}…` : result, sublabel: "实验结果", type: "finding", entityKey: id, expIds: [experiment.id] }); addEdge({ id: `${experiment.id}-result`, source: experiment.id, target: id, type: "has_result", label: "结论", strength: .4, dashed: true }); }
  }
  for (const relation of relations ?? []) addEdge({ id: relation.id, source: relation.source_exp_id, target: relation.target_exp_id, type: relation.relation_type as GraphEdge["type"], label: relation.relation_type, strength: relation.similarity ?? .8, dashed: relation.relation_type === "semantic_similar" || relation.relation_type === "temporal" });
  for (let i = 0; i < experiments.length; i++) for (let j = i + 1; j < experiments.length; j++) { const a = experiments[i]; const b = experiments[j]; if (a.embedding && b.embedding && a.embedding.length === b.embedding.length && cosineSimilarity(a.embedding, b.embedding) > .75) addEdge({ id: `semantic:${a.id}-${b.id}`, source: a.id, target: b.id, type: "semantic_similar", label: "语义相似", strength: cosineSimilarity(a.embedding, b.embedding), dashed: true }); }
  nodes.forEach((node) => { node.degree = edges.filter((edge) => edge.source === node.id || edge.target === node.id).length; });
  return { nodes, edges };
}

export const RELATION_LABELS_SHORT: Record<string, string> = { derived_from: "派生", sample_shared: "同样品", device_shared: "同设备", operator_shared: "同操作人", temporal: "时间先后", semantic_similar: "语义相似" };
