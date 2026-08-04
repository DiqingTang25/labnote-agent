/**
 * AI 响应 JSON 提取器
 * - 处理 markdown 代码块包裹的 JSON
 * - 鲁棒的多种回退策略
 * - 归一化实验卡片数据
 */
import type { AttachedFile, Experiment, Material, Observation, Control } from "./labStore";

// ═══════════════════════════════════════════════════════
// JSON 提取
// ═══════════════════════════════════════════════════════

export function extractJSON<T = unknown>(text: string): T {
  if (!text || !text.trim()) {
    throw new Error("Empty AI response");
  }

  const trimmed = text.trim();

  // 策略 1: 直接解析纯 JSON
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    /* continue */
  }

  // 策略 2: 剥去 markdown 代码块 ```json ... ``` / ``` ... ```
  const fenceRegex = /```(?:json|javascript|js|text)?\s*\n?([\s\S]*?)\n?```/g;
  let match = fenceRegex.exec(trimmed);
  while (match) {
    try {
      return JSON.parse(match[1].trim()) as T;
    } catch {
      /* try next fence */
    }
    match = fenceRegex.exec(trimmed);
  }

  // 策略 3: 找最外层的 { ... } 对象
  const objStart = trimmed.indexOf("{");
  const objEnd = trimmed.lastIndexOf("}");
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    try {
      return JSON.parse(trimmed.slice(objStart, objEnd + 1)) as T;
    } catch {
      /* continue */
    }
  }

  // 策略 4: 找最外层的 [ ... ] 数组
  const arrStart = trimmed.indexOf("[");
  const arrEnd = trimmed.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    try {
      return JSON.parse(trimmed.slice(arrStart, arrEnd + 1)) as T;
    } catch {
      /* continue */
    }
  }

  // 策略 5: 找 "experiments": [...] 模式并包装为对象
  const expMatch = trimmed.match(/"experiments"\s*:\s*\[[\s\S]*?\]/);
  if (expMatch) {
    try {
      return JSON.parse(`{${expMatch[0]}}`) as T;
    } catch {
      /* continue */
    }
  }

  // 策略 6: 尝试修复常见 JSON 错误（末尾逗号、单引号等）
  try {
    const fixed = trimmed
      .replace(/,\s*}/g, "}") // 末尾逗号
      .replace(/,\s*]/g, "]") // 末尾逗号
      .replace(/'/g, '"'); // 单引号 → 双引号
    return JSON.parse(fixed) as T;
  } catch {
    /* last resort */
  }

  throw new Error(
    `Could not extract JSON from AI response. First 200 chars: ${trimmed.slice(0, 200)}`,
  );
}

// ═══════════════════════════════════════════════════════
// 实验卡片解析
// ═══════════════════════════════════════════════════════

/**
 * 从 API 原始响应中解析实验卡片数组
 */
export function parseAPIResponse(
  rawOutput: string,
  _fileName: string,
): Partial<Experiment>[] {
  const data = extractJSON<unknown>(rawOutput);

  // 格式: { experiments: [...] }
  if (data && typeof data === "object" && "experiments" in (data as Record<string, unknown>)) {
    const arr = (data as Record<string, unknown>).experiments;
    if (Array.isArray(arr)) return arr.map((item) => asPartialExperiment(item));
  }

  // 格式: [ {...}, {...} ] 直接数组
  if (Array.isArray(data)) {
    return data.map((item) => asPartialExperiment(item));
  }

  // 格式: 单个对象
  if (data && typeof data === "object") {
    return [asPartialExperiment(data)];
  }

  return [];
}

function asPartialExperiment(item: unknown): Partial<Experiment> {
  if (!item || typeof item !== "object") return {};

  const obj = item as Record<string, unknown>;

  return {
    name: asString(obj.name),
    experimentType: (asString(obj.experimentType) || "synthesis") as Experiment["experimentType"],
    date: asString(obj.date),
    operator: asString(obj.operator),
    purpose: asString(obj.purpose),
    background: asString(obj.background),
    hypothesis: asString(obj.hypothesis) || undefined,
    conclusion: asString(obj.conclusion) || undefined,
    discipline: asString(obj.discipline),
    device: {
      name: asString((obj.device as Record<string, unknown>)?.name),
      model: asString((obj.device as Record<string, unknown>)?.model),
      vendor: asString((obj.device as Record<string, unknown>)?.vendor),
    },
    instruments: Array.isArray(obj.instruments)
      ? (obj.instruments as Array<Record<string, unknown>>).map((i) => ({
          name: asString(i.name),
          model: asString(i.model),
          vendor: asString(i.vendor),
          serialNumber: asString(i.serialNumber) || undefined,
        }))
      : [],
    materials: Array.isArray(obj.materials)
      ? (obj.materials as Array<Record<string, unknown>>).map((m) => ({
          name: asString(m.name),
          casNumber: asString(m.casNumber) || undefined,
          purity: asString(m.purity) || undefined,
          lotNumber: asString(m.lotNumber) || undefined,
          supplier: asString(m.supplier) || undefined,
          amount: asString(m.amount) || undefined,
          role: (asString(m.role) || "reactant") as Material["role"],
        }))
      : [],
    sample: {
      id: asString((obj.sample as Record<string, unknown>)?.id),
      batch: asString((obj.sample as Record<string, unknown>)?.batch),
      source: asString((obj.sample as Record<string, unknown>)?.source),
    },
    params: Array.isArray(obj.params)
      ? obj.params.map((p) => ({
          name: asString((p as Record<string, unknown>)?.name),
          value: asString((p as Record<string, unknown>)?.value),
          unit: asString((p as Record<string, unknown>)?.unit),
        }))
      : [],
    protocol: obj.protocol && typeof obj.protocol === "object"
      ? {
          name: asString((obj.protocol as Record<string, unknown>).name),
          version: asString((obj.protocol as Record<string, unknown>).version) || undefined,
        }
      : undefined,
    environment: {
      temperature: asString((obj.environment as Record<string, unknown>)?.temperature),
      humidity: asString((obj.environment as Record<string, unknown>)?.humidity),
      other: asString((obj.environment as Record<string, unknown>)?.other),
    },
    steps: Array.isArray(obj.steps) ? obj.steps.map((s) => asString(s)).filter(Boolean) : [],
    observations: Array.isArray(obj.observations)
      ? (obj.observations as Array<Record<string, unknown>>).map((o) => ({
          timestamp: asString(o.timestamp) || new Date().toISOString(),
          type: (asString(o.type) || "note") as Observation["type"],
          content: asString(o.content),
        }))
      : [],
    results: asString(obj.results),
    notes: asString(obj.notes),
    controls: Array.isArray(obj.controls)
      ? (obj.controls as Array<Record<string, unknown>>).map((c) => ({
          type: (asString(c.type) || "standard") as Control["type"],
          name: asString(c.name),
          expectedResult: asString(c.expectedResult) || undefined,
          passed: c.passed !== undefined ? Boolean(c.passed) : undefined,
        }))
      : [],
    replicates: typeof obj.replicates === "number" ? obj.replicates : 1,
    qcStatus: (asString(obj.qcStatus) || "na") as Experiment["qcStatus"],
    source: asString(obj.source),
    attachedFiles: [],
    lastParsedAt: null,
    embedding: null,
    aiInsights: asString(obj.aiInsights) || asString(obj.ai_insights),
    knowledgeTags: Array.isArray((obj as any).knowledgeTags) ? (obj as any).knowledgeTags : [],
  };
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

// ═══════════════════════════════════════════════════════
// 归一化
// ═══════════════════════════════════════════════════════

let _idCounter = 0;

function newExpId(): string {
  _idCounter++;
  return `exp_${Date.now().toString(36)}${_idCounter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 5)}`;
}

export function normalizeExperiment(
  raw: Partial<Experiment>,
  defaults?: Partial<Experiment>,
): Experiment {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  return {
    id: defaults?.id ?? raw.id ?? newExpId(),
    name: raw.name || defaults?.name || "未命名实验",
    date: raw.date || defaults?.date || now,
    operator: raw.operator || defaults?.operator || "",
    purpose: raw.purpose || defaults?.purpose || "",
    background: raw.background || defaults?.background || "",
    discipline: raw.discipline || defaults?.discipline || "",
    device: {
      name: raw.device?.name || defaults?.device?.name || "",
      model: raw.device?.model || defaults?.device?.model || "",
      vendor: raw.device?.vendor || defaults?.device?.vendor || "",
    },
    sample: {
      id: raw.sample?.id || defaults?.sample?.id || "",
      batch: raw.sample?.batch || defaults?.sample?.batch || "",
      source: raw.sample?.source || defaults?.sample?.source || "",
    },
    params: raw.params && raw.params.length > 0 ? raw.params : defaults?.params || [],
    environment: {
      temperature:
        raw.environment?.temperature || defaults?.environment?.temperature || "",
      humidity: raw.environment?.humidity || defaults?.environment?.humidity || "",
      other: raw.environment?.other || defaults?.environment?.other || "",
    },
    steps: raw.steps && raw.steps.length > 0 ? raw.steps : defaults?.steps || [],
    results: raw.results || defaults?.results || "",
    notes: raw.notes || defaults?.notes || "",
    source: raw.source || defaults?.source || "AI 解析",
    attachedFiles: raw.attachedFiles || defaults?.attachedFiles || [],
    lastParsedAt: raw.lastParsedAt ?? defaults?.lastParsedAt ?? null,
    embedding: (raw as Experiment).embedding ?? defaults?.embedding ?? null,
    aiInsights: (raw as Experiment).aiInsights || defaults?.aiInsights || "",
    knowledgeTags: (raw as Experiment).knowledgeTags || defaults?.knowledgeTags || [],
    // Phase 1 new fields
    version: (raw as Experiment).version ?? defaults?.version ?? 1,
    projectId: (raw as Experiment).projectId ?? defaults?.projectId,
    studyId: (raw as Experiment).studyId ?? defaults?.studyId,
    experimentType: (raw as Experiment).experimentType ?? defaults?.experimentType ?? "synthesis",
    lastModifiedAt: (raw as Experiment).lastModifiedAt ?? defaults?.lastModifiedAt,
    lastModifiedBy: (raw as Experiment).lastModifiedBy ?? defaults?.lastModifiedBy,
    reviewer: (raw as Experiment).reviewer ?? defaults?.reviewer,
    approver: (raw as Experiment).approver ?? defaults?.approver,
    supervisor: (raw as Experiment).supervisor ?? defaults?.supervisor,
    hypothesis: (raw as Experiment).hypothesis ?? defaults?.hypothesis,
    conclusion: (raw as Experiment).conclusion ?? defaults?.conclusion,
    protocol: (raw as Experiment).protocol ?? defaults?.protocol,
    instruments: (raw as Experiment).instruments ?? defaults?.instruments ?? [],
    materials: (raw as Experiment).materials ?? defaults?.materials ?? [],
    observations: (raw as Experiment).observations ?? defaults?.observations ?? [],
    rawDataRefs: (raw as Experiment).rawDataRefs ?? defaults?.rawDataRefs ?? [],
    processedDataRefs: (raw as Experiment).processedDataRefs ?? defaults?.processedDataRefs ?? [],
    controls: (raw as Experiment).controls ?? defaults?.controls ?? [],
    replicates: (raw as Experiment).replicates ?? defaults?.replicates ?? 1,
    qcStatus: (raw as Experiment).qcStatus ?? defaults?.qcStatus ?? "na",
    license: (raw as Experiment).license ?? defaults?.license ?? "CC BY-NC 4.0",
    ontologyTerms: (raw as Experiment).ontologyTerms ?? defaults?.ontologyTerms ?? [],
    derivedFrom: (raw as Experiment).derivedFrom ?? defaults?.derivedFrom ?? [],
    auditTrail: (raw as Experiment).auditTrail ?? defaults?.auditTrail ?? [],
    signatures: (raw as Experiment).signatures ?? defaults?.signatures ?? [],
  };
}
