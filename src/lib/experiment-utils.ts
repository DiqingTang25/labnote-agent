/**
 * 实验数据映射工具 — toRow / fromRow / parseEmbedding
 *
 * 纯函数，无副作用，无 import.meta.env 访问
 * 可被服务端 server functions 和客户端代码共同导入
 */
import type { Experiment, AttachedFile, Instrument, Material, Observation, Control, DataRef, AuditEntry, Signature, Protocol } from "./labStore";

// ═══════════════════════════════════════════════════════
// DB 行类型
// ═══════════════════════════════════════════════════════

export type ExperimentRow = {
  id: string;
  name: string;
  version: number;
  // ISA-TAB
  project_id: string | null;
  study_id: string | null;
  experiment_type: string | null;
  // Temporal
  date: string | null;
  last_modified_at: string | null;
  last_modified_by: string | null;
  // People
  operator: string | null;
  reviewer: string | null;
  approver: string | null;
  supervisor: string | null;
  // Purpose
  purpose: string | null;
  background: string | null;
  hypothesis: string | null;
  conclusion: string | null;
  discipline: string | null;
  // Device (deprecated flat columns)
  device_name: string | null;
  device_model: string | null;
  device_vendor: string | null;
  // Sample
  sample_id: string | null;
  sample_batch: string | null;
  sample_source: string | null;
  sample_preparation_date: string | null;
  sample_parent_id: string | null;
  // Complex JSONB fields
  protocol: unknown;
  instruments: unknown;
  materials: unknown;
  params: unknown;
  environment: unknown;
  steps: unknown;
  observations: unknown;
  results: string | null;
  notes: string | null;
  // Data refs
  attached_files: unknown;
  raw_data_refs: unknown;
  processed_data_refs: unknown;
  // QC
  controls: unknown;
  replicates: number | null;
  qc_status: string | null;
  // FAIR
  license: string | null;
  ontology_terms: unknown;
  derived_from: unknown;
  // Integrity
  audit_trail: unknown;
  signatures: unknown;
  // AI
  ai_insights: string | null;
  last_parsed_at: string | null;
  knowledge_tags: string[] | null;
  search_text: string | null;
  // Meta
  source: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
};

// ═══════════════════════════════════════════════════════
// 数据清理（防 PostgreSQL 22P05 错误）
// ═══════════════════════════════════════════════════════

/** 移除 null 字节和无效 Unicode 转义，防止 PG 报错 */
function sanitizeText(s: string | null | undefined): string | null {
  if (!s) return s ?? null;
  return s.replace(/\x00/g, "").replace(/\\u0000/g, "");
}

function sanitizeJson(v: unknown): unknown {
  if (!v) return v;
  try {
    const json = JSON.stringify(v);
    const cleaned = json.replace(/\\u0000/g, "").replace(/\x00/g, "");
    return JSON.parse(cleaned);
  } catch {
    return v;
  }
}

// ═══════════════════════════════════════════════════════
// Experiment → 扁平化 DB 行
// ═══════════════════════════════════════════════════════

export function toRow(e: Experiment, userId?: string): ExperimentRow {
  const _st = [e.name, e.purpose, e.results, e.notes, e.device.name, e.device.model, e.sample.id, e.operator, e.discipline].filter(Boolean).join(" ") || null;
  return {
    id: e.id,
    name: sanitizeText(e.name) || "",
    version: e.version ?? 1,
    project_id: sanitizeText(e.projectId) ?? null,
    study_id: sanitizeText(e.studyId) ?? null,
    experiment_type: e.experimentType ?? "synthesis",
    date: sanitizeText(e.date) || null,
    last_modified_at: e.lastModifiedAt ?? null,
    last_modified_by: sanitizeText(e.lastModifiedBy) ?? null,
    operator: sanitizeText(e.operator) || null,
    reviewer: sanitizeText(e.reviewer) ?? null,
    approver: sanitizeText(e.approver) ?? null,
    supervisor: sanitizeText(e.supervisor) ?? null,
    purpose: sanitizeText(e.purpose) || null,
    background: sanitizeText(e.background) || null,
    hypothesis: sanitizeText(e.hypothesis) ?? null,
    conclusion: sanitizeText(e.conclusion) ?? null,
    discipline: sanitizeText(e.discipline) || null,
    device_name: sanitizeText(e.device.name) || null,
    device_model: sanitizeText(e.device.model) || null,
    device_vendor: sanitizeText(e.device.vendor) || null,
    sample_id: sanitizeText(e.sample.id) || null,
    sample_batch: sanitizeText(e.sample.batch) || null,
    sample_source: sanitizeText(e.sample.source) || null,
    sample_preparation_date: sanitizeText(e.sample.preparationDate) ?? null,
    sample_parent_id: sanitizeText(e.sample.parentSampleId) ?? null,
    protocol: sanitizeJson(e.protocol),
    instruments: sanitizeJson(e.instruments),
    materials: sanitizeJson(e.materials),
    params: e.params,
    environment: e.environment,
    steps: e.steps,
    observations: sanitizeJson(e.observations),
    results: sanitizeText(e.results) || null,
    notes: sanitizeText(e.notes) || null,
    attached_files: sanitizeJson(e.attachedFiles),
    raw_data_refs: sanitizeJson(e.rawDataRefs),
    processed_data_refs: sanitizeJson(e.processedDataRefs),
    controls: sanitizeJson(e.controls),
    replicates: e.replicates ?? 1,
    qc_status: e.qcStatus ?? "na",
    license: sanitizeText(e.license) ?? "CC BY-NC 4.0",
    ontology_terms: e.ontologyTerms,
    derived_from: e.derivedFrom,
    audit_trail: sanitizeJson(e.auditTrail),
    signatures: sanitizeJson(e.signatures),
    ai_insights: sanitizeText(e.aiInsights) || null,
    last_parsed_at: e.lastParsedAt || null,
    knowledge_tags: e.knowledgeTags || [],
    search_text: _st,
    source: sanitizeText(e.source) || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: userId ?? null,
  };
}

// ═══════════════════════════════════════════════════════
// DB 行 → Experiment
// ═══════════════════════════════════════════════════════

export function fromRow(r: Record<string, unknown>): Experiment {
  return {
    id: r.id as string,
    name: r.name as string,
    version: (r.version as number) ?? 1,
    projectId: (r.project_id as string) ?? undefined,
    studyId: (r.study_id as string) ?? undefined,
    experimentType: (r.experiment_type as Experiment["experimentType"]) ?? "synthesis",
    date: (r.date as string) ?? "",
    lastModifiedAt: (r.last_modified_at as string) ?? undefined,
    lastModifiedBy: (r.last_modified_by as string) ?? undefined,
    operator: (r.operator as string) ?? "",
    reviewer: (r.reviewer as string) ?? undefined,
    approver: (r.approver as string) ?? undefined,
    supervisor: (r.supervisor as string) ?? undefined,
    purpose: (r.purpose as string) ?? "",
    background: (r.background as string) ?? "",
    hypothesis: (r.hypothesis as string) ?? undefined,
    conclusion: (r.conclusion as string) ?? undefined,
    discipline: (r.discipline as string) ?? "材料科学",
    device: {
      name: (r.device_name as string) ?? "",
      model: (r.device_model as string) ?? "",
      vendor: (r.device_vendor as string) ?? "",
    },
    instruments: (r.instruments as Instrument[]) ?? [],
    sample: {
      id: (r.sample_id as string) ?? "",
      batch: (r.sample_batch as string) ?? "",
      source: (r.sample_source as string) ?? "",
      preparationDate: (r.sample_preparation_date as string) ?? undefined,
      parentSampleId: (r.sample_parent_id as string) ?? undefined,
    },
    materials: (r.materials as Material[]) ?? [],
    protocol: (r.protocol as Protocol) ?? undefined,
    params: (r.params as Experiment["params"]) ?? [],
    environment: (r.environment as Experiment["environment"]) ?? {
      temperature: "",
      humidity: "",
      other: "",
    },
    steps: (r.steps as string[]) ?? [],
    observations: (r.observations as Observation[]) ?? [],
    results: (r.results as string) ?? "",
    notes: (r.notes as string) ?? "",
    source: (r.source as string) ?? "",
    attachedFiles: (r.attached_files as AttachedFile[]) ?? [],
    rawDataRefs: (r.raw_data_refs as DataRef[]) ?? [],
    processedDataRefs: (r.processed_data_refs as DataRef[]) ?? [],
    controls: (r.controls as Control[]) ?? [],
    replicates: (r.replicates as number) ?? 1,
    qcStatus: (r.qc_status as Experiment["qcStatus"]) ?? "na",
    license: (r.license as string) ?? "CC BY-NC 4.0",
    ontologyTerms: (r.ontology_terms as string[]) ?? [],
    derivedFrom: (r.derived_from as string[]) ?? [],
    auditTrail: (r.audit_trail as AuditEntry[]) ?? [],
    signatures: (r.signatures as Signature[]) ?? [],
    lastParsedAt: (r.last_parsed_at as string) ?? (r.lastParsedAt as string) ?? null,
    embedding: parseEmbedding(r.embedding),
    aiInsights: (r.ai_insights as string) ?? "",
    knowledgeTags: (r.knowledge_tags as string[]) ?? [],
  };
}

// ═══════════════════════════════════════════════════════
// pgvector embedding 解析
// ═══════════════════════════════════════════════════════

/** pgvector 列可能以字符串 `[0.1,0.2,...]` 返回 */
export function parseEmbedding(v: unknown): number[] | null {
  if (Array.isArray(v)) return v as number[];
  if (typeof v === "string") {
    try {
      const arr = JSON.parse(v);
      return Array.isArray(arr) ? arr : null;
    } catch {
      return null;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════
// 构建 DB patch（仅更新提供的字段）
// ═══════════════════════════════════════════════════════

export function buildDbPatch(patch: Partial<Experiment>): Record<string, unknown> {
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  // Scalar fields
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.version !== undefined) dbPatch.version = patch.version;
  if (patch.projectId !== undefined) dbPatch.project_id = patch.projectId;
  if (patch.studyId !== undefined) dbPatch.study_id = patch.studyId;
  if (patch.experimentType !== undefined) dbPatch.experiment_type = patch.experimentType;
  if (patch.date !== undefined) dbPatch.date = patch.date;
  if (patch.lastModifiedAt !== undefined) dbPatch.last_modified_at = patch.lastModifiedAt;
  if (patch.lastModifiedBy !== undefined) dbPatch.last_modified_by = patch.lastModifiedBy;
  if (patch.operator !== undefined) dbPatch.operator = patch.operator;
  if (patch.reviewer !== undefined) dbPatch.reviewer = patch.reviewer;
  if (patch.approver !== undefined) dbPatch.approver = patch.approver;
  if (patch.supervisor !== undefined) dbPatch.supervisor = patch.supervisor;
  if (patch.purpose !== undefined) dbPatch.purpose = patch.purpose;
  if (patch.background !== undefined) dbPatch.background = patch.background;
  if (patch.hypothesis !== undefined) dbPatch.hypothesis = patch.hypothesis;
  if (patch.conclusion !== undefined) dbPatch.conclusion = patch.conclusion;
  if (patch.discipline !== undefined) dbPatch.discipline = patch.discipline;
  if (patch.replicates !== undefined) dbPatch.replicates = patch.replicates;
  if (patch.qcStatus !== undefined) dbPatch.qc_status = patch.qcStatus;
  if (patch.license !== undefined) dbPatch.license = patch.license;
  // Device (flat columns, deprecated)
  if (patch.device) {
    if (patch.device.name !== undefined) dbPatch.device_name = patch.device.name;
    if (patch.device.model !== undefined) dbPatch.device_model = patch.device.model;
    if (patch.device.vendor !== undefined) dbPatch.device_vendor = patch.device.vendor;
  }
  // Sample (flat columns)
  if (patch.sample) {
    if (patch.sample.id !== undefined) dbPatch.sample_id = patch.sample.id;
    if (patch.sample.batch !== undefined) dbPatch.sample_batch = patch.sample.batch;
    if (patch.sample.source !== undefined) dbPatch.sample_source = patch.sample.source;
    if (patch.sample.preparationDate !== undefined) dbPatch.sample_preparation_date = patch.sample.preparationDate;
    if (patch.sample.parentSampleId !== undefined) dbPatch.sample_parent_id = patch.sample.parentSampleId;
  }
  // JSONB fields
  if (patch.protocol !== undefined) dbPatch.protocol = patch.protocol;
  if (patch.instruments !== undefined) dbPatch.instruments = patch.instruments;
  if (patch.materials !== undefined) dbPatch.materials = patch.materials;
  if (patch.params !== undefined) dbPatch.params = patch.params;
  if (patch.environment !== undefined) dbPatch.environment = patch.environment;
  if (patch.steps !== undefined) dbPatch.steps = patch.steps;
  if (patch.observations !== undefined) dbPatch.observations = patch.observations;
  if (patch.results !== undefined) dbPatch.results = patch.results;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes;
  if (patch.attachedFiles !== undefined) dbPatch.attached_files = patch.attachedFiles;
  if (patch.rawDataRefs !== undefined) dbPatch.raw_data_refs = patch.rawDataRefs;
  if (patch.processedDataRefs !== undefined) dbPatch.processed_data_refs = patch.processedDataRefs;
  if (patch.controls !== undefined) dbPatch.controls = patch.controls;
  if (patch.ontologyTerms !== undefined) dbPatch.ontology_terms = patch.ontologyTerms;
  if (patch.derivedFrom !== undefined) dbPatch.derived_from = patch.derivedFrom;
  if (patch.auditTrail !== undefined) dbPatch.audit_trail = patch.auditTrail;
  if (patch.signatures !== undefined) dbPatch.signatures = patch.signatures;
  if (patch.aiInsights !== undefined) dbPatch.ai_insights = patch.aiInsights;
  if (patch.lastParsedAt !== undefined) dbPatch.last_parsed_at = patch.lastParsedAt;
  if (patch.knowledgeTags !== undefined) dbPatch.knowledge_tags = patch.knowledgeTags;

  // 任一文本字段变更时重建 search_text（混合检索用）
  const textFields = ["name", "purpose", "results", "notes", "operator", "discipline"];
  const hasTextField = textFields.some((k) => (patch as any)[k] !== undefined)
    || patch.device !== undefined
    || patch.sample !== undefined;
  if (hasTextField) {
    const parts = [
      patch.name, patch.purpose, patch.results, patch.notes,
      patch.device?.name, patch.device?.model,
      patch.sample?.id, patch.operator, patch.discipline,
    ].filter(Boolean);
    if (parts.length > 0) dbPatch.search_text = parts.join(" ");
  }

  return dbPatch;
}

// ═══════════════════════════════════════════════════════
// 语义分块 — 将 Experiment 拆为 5 个独立 chunk
// ═══════════════════════════════════════════════════════

export type ExperimentChunk = {
  chunkType: "meta" | "purpose" | "device_sample" | "params_steps" | "results";
  content: string;
};

export function splitExperimentIntoChunks(exp: Experiment): ExperimentChunk[] {
  const chunks: ExperimentChunk[] = [];

  // chunk 1: meta — 谁、什么时候、什么学科、什么类型
  const metaParts = [
    exp.name,
    exp.date ? `日期: ${exp.date}` : "",
    exp.operator ? `操作人: ${exp.operator}` : "",
    exp.experimentType ? `实验类型: ${exp.experimentType}` : "",
    exp.discipline ? `学科: ${exp.discipline}` : "",
    exp.supervisor ? `导师: ${exp.supervisor}` : "",
    exp.projectId ? `项目: ${exp.projectId}` : "",
  ].filter(Boolean);
  if (metaParts.length > 0) {
    chunks.push({ chunkType: "meta", content: metaParts.join("; ") });
  }

  // chunk 2: purpose — 为什么做
  const purposeParts = [
    exp.purpose ? `目的: ${exp.purpose}` : "",
    exp.background ? `背景: ${exp.background}` : "",
    exp.hypothesis ? `假设: ${exp.hypothesis}` : "",
    exp.conclusion ? `结论: ${exp.conclusion}` : "",
  ].filter(Boolean);
  if (purposeParts.length > 0) {
    chunks.push({ chunkType: "purpose", content: purposeParts.join("; ") });
  }

  // chunk 3: device_sample — 用什么设备和样品
  const instrumentText = (exp.instruments ?? [])
    .map((inst) => `${inst.name}(${inst.model})`)
    .join(", ");
  const materialText = (exp.materials ?? [])
    .map((m) => `${m.name}${m.casNumber ? `[${m.casNumber}]` : ""}(${m.role})`)
    .join(", ");
  const dsParts = [
    exp.device?.name ? `设备: ${exp.device.name}` : "",
    exp.device?.model ? `型号: ${exp.device.model}` : "",
    instrumentText ? `仪器: ${instrumentText}` : "",
    exp.sample?.id ? `样品编号: ${exp.sample.id}` : "",
    exp.sample?.batch ? `批次: ${exp.sample.batch}` : "",
    materialText ? `试剂: ${materialText}` : "",
  ].filter(Boolean);
  if (dsParts.length > 0) {
    chunks.push({ chunkType: "device_sample", content: dsParts.join("; ") });
  }

  // chunk 4: params_steps — 实验参数和操作步骤
  const paramsText = exp.params
    .filter((p) => p.name)
    .map((p) => `${p.name}: ${p.value}${p.unit ? " " + p.unit : ""}`)
    .join(", ");
  const stepsText = (exp.steps ?? [])
    .filter((s: string) => s)
    .map((s: string, i: number) => `步骤${i + 1}: ${s}`)
    .join("; ");
  const protocolText = exp.protocol?.name
    ? `SOP: ${exp.protocol.name}${exp.protocol.version ? ` v${exp.protocol.version}` : ""}`
    : "";
  const psParts = [
    paramsText ? `参数: ${paramsText}` : "",
    protocolText,
    stepsText ? `步骤: ${stepsText}` : "",
  ].filter(Boolean);
  if (psParts.length > 0) {
    chunks.push({ chunkType: "params_steps", content: psParts.join("; ") });
  }

  // chunk 5: results — 结果和质量
  const obsText = (exp.observations ?? [])
    .map((o) => `[${o.type}] ${o.content}`)
    .join("; ");
  const controlText = (exp.controls ?? [])
    .map((c) => `${c.type}:${c.name}${c.passed !== undefined ? (c.passed ? "✓" : "✗") : ""}`)
    .join(", ");
  const resultParts = [
    exp.results ? `结果: ${exp.results}` : "",
    obsText ? `观察: ${obsText}` : "",
    controlText ? `质控: ${controlText}` : "",
    exp.qcStatus && exp.qcStatus !== "na" ? `QC状态: ${exp.qcStatus}` : "",
    exp.notes ? `备注: ${exp.notes}` : "",
    exp.aiInsights ? `AI洞察: ${exp.aiInsights}` : "",
  ].filter(Boolean);
  if (resultParts.length > 0) {
    chunks.push({ chunkType: "results", content: resultParts.join("; ") });
  }

  return chunks;
}
