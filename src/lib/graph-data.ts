import type { ExperimentDoc } from "./labStore";
import type { ExperimentRelation } from "./supabase";
import type { GraphData, GraphEdge, GraphNode } from "./graph-types";
import { flattenProperties, getString } from "./property-utils";

function cosineSimilarity(a: number[], b: number[]): number { let dot = 0; let normA = 0; let normB = 0; for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]; } return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0; }
const sampleKey = (value: string) => `sample:${value}`;
const deviceKey = (value: string) => `device:${value.trim()}`;
const operatorKey = (value: string) => `operator:${value.trim()}`;
const reagentKey = (value: string) => `reagent:${value.trim()}`;
const methodKey = (value: string) => `method:${value.trim()}`;
const projectKey = (value: string) => `project:${value.trim()}`;

// 试剂/原料 字段键匹配（中英文）——注意 "material" 子串太宽（会误匹配
// materials_project.url 等键），改用词边界限制
const REAGENT_KEY_RE = /reagent|precursor|原料|试剂|前驱体|\bmaterials?\.(name|formula)\b/i;
// 方法/协议/算法 字段键匹配
const METHOD_KEY_RE = /(^|\.)method\.name$|protocol|方法|算法/i;
// 项目/课题 字段键匹配
const PROJECT_KEY_RE = /^project|课题|项目/i;

/** 从扁平化 properties 中提取实体值（去重、限长、只取字符串、排除 URL 等非实体值） */
function extractEntityValues(experiment: ExperimentDoc, keyRe: RegExp): string[] {
  const values = new Set<string>();
  for (const entry of flattenProperties(experiment.properties)) {
    if (!keyRe.test(entry.path)) continue;
    const value = entry.value;
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (
      trimmed &&
      trimmed.length <= 60 &&
      !trimmed.includes("\n") &&
      !/^https?:\/\//i.test(trimmed)
    ) {
      values.add(trimmed);
    }
  }
  return Array.from(values);
}

export function buildGraphData(experiments: ExperimentDoc[], relations?: ExperimentRelation[]): GraphData {
  const nodes: GraphNode[] = []; const edges: GraphEdge[] = []; const entityMap = new Map<string, GraphNode>();
  const addNode = (node: GraphNode) => { const existing = entityMap.get(node.entityKey); if (existing) { node.expIds.forEach((id) => { if (!existing.expIds.includes(id)) existing.expIds.push(id); }); } else { entityMap.set(node.entityKey, node); nodes.push(node); } };
  const addEdge = (edge: GraphEdge) => { if (!edges.some((item) => item.source === edge.source && item.target === edge.target && item.type === edge.type)) edges.push(edge); };
  for (const experiment of experiments) addNode({ id: experiment.id, label: experiment.name.length > 20 ? `${experiment.name.slice(0, 19)}…` : experiment.name, sublabel: experiment.date, type: "experiment", entityKey: `exp:${experiment.id}`, expIds: [experiment.id] });
  for (const experiment of experiments) {
    const sampleId = getString(experiment.properties, "sample.id"); const sampleBatch = getString(experiment.properties, "sample.batch"); const deviceName = getString(experiment.properties, "device.name"); const deviceModel = getString(experiment.properties, "device.model");
    if (sampleId) { const id = sampleKey(sampleId); addNode({ id, label: sampleId, sublabel: sampleBatch || undefined, type: "sample", entityKey: id, expIds: [experiment.id] }); addEdge({ id: `${experiment.id}-sample-${sampleId}`, source: experiment.id, target: id, type: "uses_sample", label: "使用样品", strength: 1 }); }
    if (deviceName) { const id = deviceKey(deviceName); addNode({ id, label: deviceName, sublabel: deviceModel || undefined, type: "device", entityKey: id, expIds: [experiment.id] }); addEdge({ id: `${experiment.id}-device-${deviceName}`, source: experiment.id, target: id, type: "uses_device", label: "使用设备", strength: 1 }); }
    if (experiment.operator && experiment.operator !== "未识别") { const id = operatorKey(experiment.operator); addNode({ id, label: experiment.operator, type: "operator", entityKey: id, expIds: [experiment.id] }); addEdge({ id: `${experiment.id}-operator`, source: experiment.id, target: id, type: "operator_shared", label: "操作人", strength: .8 }); }
    for (const reagent of extractEntityValues(experiment, REAGENT_KEY_RE)) { const id = reagentKey(reagent); addNode({ id, label: reagent, type: "reagent", entityKey: id, expIds: [experiment.id] }); addEdge({ id: `${experiment.id}-reagent-${reagent}`, source: experiment.id, target: id, type: "uses_reagent", label: "使用试剂", strength: .9 }); }
    for (const method of extractEntityValues(experiment, METHOD_KEY_RE)) { const id = methodKey(method); addNode({ id, label: method, type: "method", entityKey: id, expIds: [experiment.id] }); addEdge({ id: `${experiment.id}-method-${method}`, source: experiment.id, target: id, type: "uses_method", label: "使用方法", strength: .85 }); }
    for (const project of extractEntityValues(experiment, PROJECT_KEY_RE)) { const id = projectKey(project); addNode({ id, label: project, type: "project", entityKey: id, expIds: [experiment.id] }); addEdge({ id: `${experiment.id}-project-${project}`, source: experiment.id, target: id, type: "belongs_to_project", label: "所属项目", strength: .7 }); }
  }
  for (const relation of relations ?? []) addEdge({ id: relation.id, source: relation.source_exp_id, target: relation.target_exp_id, type: relation.relation_type as GraphEdge["type"], label: relation.relation_type, strength: relation.similarity ?? .8, dashed: relation.relation_type === "semantic_similar" || relation.relation_type === "temporal" });
  for (let i = 0; i < experiments.length; i++) for (let j = i + 1; j < experiments.length; j++) { const a = experiments[i]; const b = experiments[j]; if (a.embedding && b.embedding && a.embedding.length === b.embedding.length && cosineSimilarity(a.embedding, b.embedding) > .75) addEdge({ id: `semantic:${a.id}-${b.id}`, source: a.id, target: b.id, type: "semantic_similar", label: "语义相似", strength: cosineSimilarity(a.embedding, b.embedding), dashed: true }); }
  nodes.forEach((node) => { node.degree = edges.filter((edge) => edge.source === node.id || edge.target === node.id).length; });
  return { nodes, edges };
}

export const RELATION_LABELS_SHORT: Record<string, string> = { derived_from: "派生", sample_shared: "同样品", device_shared: "同设备", operator_shared: "同操作人", temporal: "时间先后", semantic_similar: "语义相似" };
