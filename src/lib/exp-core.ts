/**
 * LabNote Agent — 实验数据核心类型与函数
 *
 * 零硬编码字段。所有实验数据通过 properties JSONB + templates 驱动。
 * Template.fieldGroups 是唯一的字段定义源 → 同时驱动 UI 渲染和 AI prompt。
 */

// ═══════════════════════════════════════════════════════
// 附件文件
// ═══════════════════════════════════════════════════════

export type AttachedFile = {
  id: string;
  name: string;
  mediaType: "image" | "text" | "csv" | "document";
  mimeType: string;
  size: number;
  addedAt: string;
  file_url: string;
  storage_path: string;
  textContent?: string;
  parsedRaw?: string;
};

// ═══════════════════════════════════════════════════════
// 属性系统 — DocProperties 为无模式 JSONB
// ═══════════════════════════════════════════════════════

/** 属性值可以是任意可序列化的 JSON */
export type PropValue = string | number | boolean | null | PropValue[] | { [key: string]: PropValue };

/** 实验文档的属性容器 — 嵌套 group → field */
export type DocProperties = Record<string, PropValue>;

// ═══════════════════════════════════════════════════════
// ExperimentDoc — 新的核心实验类型
// ═══════════════════════════════════════════════════════

export type ExperimentDoc = {
  /** 唯一 ID */
  id: string;
  /** 实验名称 */
  name: string;
  /** 实验类型 — free-form string，不再限枚举 */
  experimentType: string;
  /** 实验日期 YYYY-MM-DD HH:mm */
  date: string;
  /** 操作人 */
  operator: string;
  /** Supabase auth.uid() */
  userId: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 版本号 */
  version: number;

  // ── ISA-TAB 层级 ──
  /** Investigation 级项目 ID */
  projectId: string;
  /** Study 级研究 ID */
  studyId: string;

  // ── 人员 (GLP 职责分离) ──
  /** PI/导师 */
  supervisor: string;
  /** 审核人 */
  reviewer: string;
  /** 批准人 */
  approver: string;

  // ── 动态属性 ──
  /** 所有实验数据 — 嵌套 group → field */
  properties: DocProperties;

  // ── 文件 ──
  /** 附件文件元数据 */
  attachedFiles: AttachedFile[];

  // ── FAIR 元数据 ──
  /** 数据许可 */
  license: string;
  /** 标准本体术语 */
  ontologyTerms: string[];
  /** 上游实验 ID 溯源 */
  derivedFrom: string[];

  // ── 合规 (21 CFR Part 11 + ALCOA+) ──
  /** 审计追踪日志 (Append-only) */
  auditTrail: AuditEntry[];
  /** 电子签名 */
  signatures: Signature[];

  // ── AI 元数据 ──
  /** AI 洞察 */
  aiInsights: string;
  /** 知识标签 */
  knowledgeTags: string[];
  /** 上次 AI 解析时间 */
  lastParsedAt: string | null;
  /** pgvector embedding (1024-dim) */
  embedding: number[] | null;
};

// ═══════════════════════════════════════════════════════
// 合规子类型 (FDA 21 CFR Part 11)
// ═══════════════════════════════════════════════════════

export type AuditEntry = {
  eventId: string;
  timestamp: string;
  actionType: "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE" | "SIGN" | "EXPORT";
  operator: { userId: string; fullName: string; role: string };
  reasonForChange: string;
  fieldChanges?: Array<{ fieldPath: string; oldValue: unknown; newValue: unknown }>;
};

export type Signature = {
  signatureId: string;
  signer: { userId: string; fullName: string; title: string };
  timestamp: string;
  meaning: "AUTHORSHIP" | "TECHNICAL_REVIEW" | "QUALITY_APPROVAL";
  authMethod: "TWO_FACTOR_PASSWORD_OTP" | "BIOMETRIC" | "PKI_SM2_X509";
  boundRecordChecksum: string;
};

// ═══════════════════════════════════════════════════════
// 字段定义 — 驱动的输入控件渲染
// ═══════════════════════════════════════════════════════

/** 字段控件类型 */
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "boolean"
  | "date"
  | "datetime"
  | "table"
  | "taglist";

/** 表格列的列定义 */
export type TableColumn = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  unit?: string;
};

/** 单个字段定义 */
export type FieldDef = {
  /** 属性路径，如 "model.architecture" */
  path: string;
  /** 显示标签 */
  label: string;
  /** 控件类型 */
  type: FieldType;
  /** 单位（仅 number 类型） */
  unit?: string;
  /** 占位提示 */
  placeholder?: string;
  /** select 选项 */
  options?: string[];
  /** 是否必填 */
  required?: boolean;
  /** 是否由 AI 建议（从 field_patterns 统计） */
  suggested?: boolean;
  /** 卡片自定义字段所在的模板分组 */
  groupId?: string;
  /** 表格列定义（仅 table 类型） */
  columns?: TableColumn[];
  /** 物理约束（仅 number 类型）— 来源: NOMAD, Allotrope ASM, MLflow, CDISC 等标准 */
  constraints?: FieldConstraint;
};

// ═══════════════════════════════════════════════════════
// 字段约束 — 物理边界校验
// ═══════════════════════════════════════════════════════

export type FieldConstraint = {
  /** 硬下界（违反=拒绝入库） */
  min?: number | undefined;
  /** 硬上界（违反=拒绝入库） */
  max?: number | undefined;
  /** 常见范围（违反=警告但允许入库） */
  typicalRange?: [number, number];
  /** 约束来源标注 */
  source?: string;
};

// ═══════════════════════════════════════════════════════
// 字段组 — 渲染 Section 的最小单元
// ═══════════════════════════════════════════════════════

export type FieldGroup = {
  /** 组 ID，用于 chunkType 和内部引用 */
  id: string;
  /** 显示标签 */
  label: string;
  /** 组内字段列表 */
  fields: FieldDef[];
  /** RAG chunk 类型，默认 "group" */
  chunkType?: "meta" | "purpose" | "device_sample" | "params_steps" | "results" | "group" | "extra";
};

// ═══════════════════════════════════════════════════════
// 模板 — 实验类型的字段组集合
// ═══════════════════════════════════════════════════════

export type Template = {
  /** 模板唯一 ID，如 "tpl_ml_training" */
  id: string;
  /** 模板名称 */
  name: string;
  /** 关联的实验类型标签 */
  experimentType: string;
  /** 领域标签 */
  domain: string;
  /** 版本 */
  version: number;
  /** 字段组列表 — 驱动 UI 和 AI prompt */
  fieldGroups: FieldGroup[];
  /** 是否为系统预设 */
  isPreset: boolean;
  /** 关键词列表 — 用于自动分类匹配。新增模板时只需加关键词，无需改代码 */
  keywords?: string[];
};

// ═══════════════════════════════════════════════════════
// FieldPattern — 自演化统计
// ═══════════════════════════════════════════════════════

export type FieldPattern = {
  id: string;
  experimentType: string;
  fieldPath: string;
  occurrenceCount: number;
  occurrenceRate: number;
  valueType: "string" | "number" | "boolean" | "array" | "object";
  valueStats: {
    min?: number;
    max?: number;
    mean?: number;
    commonValues?: string[];
    unitHistogram?: Record<string, number>;
    samples?: string[];
  };
  coOccurring: string[];
  updatedAt: string;
};

// ═══════════════════════════════════════════════════════
// properties._meta 内部结构
// ═══════════════════════════════════════════════════════

export type DocMeta = {
  /** 当前应用的模板 ID */
  templateId?: string;
  /** 模板版本 */
  templateVersion?: number;
  /** 用户自定义字段覆盖 */
  overrides?: FieldDef[];
};

// ═══════════════════════════════════════════════════════
// 工厂函数
// ═══════════════════════════════════════════════════════

const NEW_ID = () => "exp_" + Math.random().toString(36).slice(2, 9);

export function createBlankDoc(template?: Template): ExperimentDoc {
  const now = new Date().toISOString();
  const dateStr = now.slice(0, 16).replace("T", " ");
  const props: DocProperties = {
    extra: {},
  };
  if (template) {
    (props as Record<string, unknown>)._meta = {
      templateId: template.id,
      templateVersion: template.version,
    } satisfies DocMeta;
  }
  return {
    id: NEW_ID(),
    name: "未命名实验",
    experimentType: template?.experimentType ?? "other",
    date: dateStr,
    operator: "",
    userId: "",
    createdAt: now,
    updatedAt: now,
    version: 1,
    projectId: "",
    studyId: "",
    supervisor: "",
    reviewer: "",
    approver: "",
    properties: props,
    attachedFiles: [],
    license: "",
    ontologyTerms: [],
    derivedFrom: [],
    auditTrail: [],
    signatures: [],
    aiInsights: "",
    knowledgeTags: [],
    lastParsedAt: null,
    embedding: null,
  };
}
