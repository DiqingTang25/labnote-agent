/**
 * LabNote Agent - 全局实验数据 store
 * Supabase 云端存储，不再依赖 localStorage
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  isSupabaseReady,
  fetchExperiments,
  insertExperiment,
  updateExperimentDB,
  deleteExperimentDB,
  fetchProfile,
  upsertProfile,
  embedExperiment,
  autoGenerateRelations,
} from "./supabase";

export type Param = { name: string; value: string; unit: string };

// ═══════════════════════════════════════════════════════
// Phase 1: 四大国际规范扩展的子类型
// ISA-TAB / FAIR / Allotrope / ISO 17025 + GLP
// ═══════════════════════════════════════════════════════

/** 仪器设备 (Allotrope ADF + ISO 17025 §6.4) */
export type Instrument = {
  id?: string;
  name: string;
  model: string;
  vendor: string;
  serialNumber?: string;
  calibrationDate?: string;       // ISO 17025: 校准日期
  calibrationStatus?: "valid" | "expired" | "na";
};

/** 试剂/耗材 (ISA-TAB Source + FAIR Interoperable) */
export type Material = {
  id?: string;
  name: string;
  casNumber?: string;             // FAIR: 标准化学标识
  purity?: string;
  lotNumber?: string;             // GLP: 批次可追溯
  supplier?: string;
  amount?: string;
  role: "reactant" | "catalyst" | "solvent" | "substrate" | "reference" | "standard" | "other";
};

/** 协议步骤 (ISA-TAB Protocol) */
export type ProtocolStep = {
  order: number;
  action: string;
  duration?: string;
  temperature?: string;
  atmosphere?: string;
  note?: string;
};

/** 实验协议/SOP (ISA-TAB Protocol REF) */
export type Protocol = {
  name: string;
  version?: string;
  url?: string;                   // FAIR: 可引用的 URI
  description?: string;
  steps: ProtocolStep[];
};

/** 实验观察 (ISA-TAB Assay + ALCOA Contemporaneous) */
export type Observation = {
  id?: string;
  timestamp: string;
  type: "visual" | "measurement" | "anomaly" | "note" | "photo";
  content: string;
  imageRef?: string;
};

/** 质控样本 (ISO 17025 §7.7) */
export type Control = {
  id?: string;
  type: "positive" | "negative" | "blank" | "standard";
  name: string;
  expectedResult?: string;
  actualResult?: string;
  passed?: boolean;
};

/** 数据文件引用 (Allotrope ADF Data Package) */
export type DataRef = {
  id: string;
  name: string;
  refType: "raw" | "processed" | "analysis_script" | "report";
  format: string;
  storagePath: string;
  fileUrl: string;
  description?: string;
};

/** 审计条目 (21 CFR Part 11 §11.10(e) + ALCOA Attributable) */
export type AuditEntry = {
  timestamp: string;
  userId: string;
  userName: string;
  action: "created" | "modified" | "reviewed" | "approved" | "merged" | "file_added" | "file_removed" | "confidence_updated";
  field?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
};

/** 电子签名 (21 CFR Part 11 §11.50) */
export type Signature = {
  userId: string;
  userName: string;
  role: "operator" | "reviewer" | "approver";
  timestamp: string;
  meaning: "authorship" | "review" | "approval";
};

export type AttachedFile = {
  id: string;
  name: string;
  mediaType: string; // "image" | "text" | "csv" | "document"
  mimeType: string;
  size: number;
  addedAt: string;
  file_url: string;      // Supabase Storage 公开 URL
  storage_path: string;  // Storage 中的路径（用于删除）
  textContent?: string;  // 文本预览（仅小文本文件，大文件不存）
  parsedRaw?: string;    // AI 解析原始响应
};

export type Experiment = {
  // ═══ 标识 (FAIR: Findable) ═══
  id: string;
  name: string;
  version: number; // 每次修改递增

  // ═══ ISA-TAB 层级 ═══
  projectId?: string;            // Investigation 级
  studyId?: string;              // Study 级
  experimentType: "synthesis" | "characterization" | "measurement" | "simulation" | "other";

  // ═══ 时间 (ALCOA: Contemporaneous) ═══
  date: string;                  // YYYY-MM-DD HH:mm
  lastModifiedAt?: string;
  lastModifiedBy?: string;

  // ═══ 人员 (ISA-TAB Contacts + GLP 职责分离) ═══
  operator: string;
  reviewer?: string;             // 审核人
  approver?: string;             // 批准人
  supervisor?: string;           // PI/导师

  // ═══ 目的与假设 ═══
  purpose: string;
  background: string;
  hypothesis?: string;           // 实验假设
  conclusion?: string;           // 实验结论（不同于 results）

  // ═══ 协议/SOP (ISA-TAB Protocol) ═══
  protocol?: Protocol;

  // ═══ 仪器 (Allotrope ADF + ISO 17025 §6.4) ═══
  /** @deprecated 保留兼容，新代码请用 instruments[] */
  device: { name: string; model: string; vendor: string };
  instruments: Instrument[];

  // ═══ 材料与样品 (ISA-TAB Source/Sample) ═══
  sample: {
    id: string;
    batch: string;
    source: string;
    preparationDate?: string;
    parentSampleId?: string;     // 溯源链
  };
  materials: Material[];         // 试剂/耗材

  // ═══ 参数与条件 ═══
  params: Param[];
  environment: { temperature: string; humidity: string; other: string };

  // ═══ 步骤 (保留兼容，新协议用 protocol.steps) ═══
  /** @deprecated 保留兼容，新代码请用 protocol.steps */
  steps: string[];

  // ═══ 观察 ═══
  observations: Observation[];

  // ═══ 结果与备注 ═══
  results: string;
  notes: string;

  // ═══ 数据文件 (Allotrope Data Package) ═══
  attachedFiles: AttachedFile[];
  rawDataRefs: DataRef[];
  processedDataRefs: DataRef[];

  // ═══ 质控 (ISO 17025 §7.7 + GLP) ═══
  controls: Control[];
  replicates: number;
  qcStatus: "passed" | "failed" | "pending" | "na";

  // ═══ FAIR 元数据 ═══
  license: string;               // 数据许可 (CC BY, CC0, etc.)
  ontologyTerms: string[];       // 标准本体术语
  derivedFrom: string[];         // 上游实验 ID 溯源

  // ═══ 数据完整性 (21 CFR Part 11 + ALCOA+) ═══
  auditTrail: AuditEntry[];
  signatures: Signature[];

  // ═══ 分类与标签 ═══
  source: string;
  discipline: string;
  knowledgeTags: string[];

  // ═══ AI ═══
  lastParsedAt: string | null;
  embedding: number[] | null;    // pgvector (1024-dim)
  aiInsights: string;
};

const newId = () => "exp_" + Math.random().toString(36).slice(2, 9);

type Ctx = {
  experiments: Experiment[];
  loading: boolean;
  addExperiment: (e: Experiment) => void;
  updateExperiment: (id: string, patch: Partial<Experiment>) => void;
  deleteExperiment: (id: string) => void;
  getById: (id: string) => Experiment | undefined;
  profile: { name: string; org: string; discipline: Experiment["discipline"] };
  setProfile: (p: Ctx["profile"]) => void;
  /** 文件管理 */
  addFileToExperiment: (expId: string, file: AttachedFile) => void;
  removeFileFromExperiment: (expId: string, fileId: string) => void;
};

const LabCtx = createContext<Ctx | null>(null);

export function LabProvider({ children }: { children: ReactNode }) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Ctx["profile"]>({
    name: "研究员",
    org: "智能材料课题组",
    discipline: "材料科学",
  });

  // 启动时从 Supabase 拉取数据（不再依赖 localStorage）
  useEffect(() => {
    if (!isSupabaseReady()) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetchExperiments(),
      fetchProfile(),
    ]).then(([dbExps, p]) => {
      if (dbExps.length > 0) setExperiments(dbExps);
      if (p) {
        setProfile({
          name: p.name ?? "研究员",
          org: p.org ?? "智能材料课题组",
          discipline: (p.discipline as Experiment["discipline"]) ?? "材料科学",
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const addExperiment = useCallback((e: Experiment) => {
    setExperiments((arr) => [e, ...arr]);
    if (isSupabaseReady()) {
      insertExperiment(e).then((ok) => {
        if (ok) {
          embedExperiment(e.id);
          autoGenerateRelations(e);
        }
      });
    }
  }, []);
  const updateExperiment = useCallback(
    (id: string, patch: Partial<Experiment>) => {
      setExperiments((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      if (isSupabaseReady()) {
        updateExperimentDB(id, patch).then(() => embedExperiment(id));
      }
    },
    [],
  );
  const deleteExperiment = useCallback((id: string) => {
    setExperiments((arr) => arr.filter((x) => x.id !== id));
    if (isSupabaseReady()) {
      // 同时删除 Storage 中的文件
      import("./storage.server").then(({ deleteExperimentFiles }) => {
        import("./supabase").then(({ supabase }) => {
          supabase.auth.getSession().then(({ data: { session } }: { data: { session: { user: { id: string } } | null } }) => {
            const uid = session?.user?.id;
            if (uid) deleteExperimentFiles({ data: { userId: uid, expId: id } });
          });
        });
      });
      deleteExperimentDB(id);
    }
  }, []);
  const getById = useCallback(
    (id: string) => experiments.find((x) => x.id === id),
    [experiments],
  );

  // 文件管理
  const addFileToExperiment = useCallback(
    (expId: string, file: AttachedFile) => {
      setExperiments((arr) => {
        const next = arr.map((x) =>
          x.id === expId
            ? { ...x, attachedFiles: [...x.attachedFiles, file], lastParsedAt: new Date().toISOString() }
            : x,
        );
        
        return next;
      });
    },
    [],
  );
  const removeFileFromExperiment = useCallback(
    (expId: string, fileId: string) => {
      setExperiments((arr) => {
        const next = arr.map((x) =>
          x.id === expId
            ? { ...x, attachedFiles: x.attachedFiles.filter((f) => f.id !== fileId) }
            : x,
        );
        
        return next;
      });
    },
    [],
  );

  // 用户配置变更 → localStorage + Supabase
  const updateProfile = useCallback((p: Ctx["profile"]) => {
    setProfile(p);
    if (isSupabaseReady()) upsertProfile(p);
  }, []);

  return (
    <LabCtx.Provider
      value={{
        experiments,
        loading,
        addExperiment,
        updateExperiment,
        deleteExperiment,
        getById,
        profile,
        setProfile: updateProfile,
        addFileToExperiment,
        removeFileFromExperiment,
      }}
    >
      {children}
    </LabCtx.Provider>
  );
}

export function useLab() {
  const ctx = useContext(LabCtx);
  if (!ctx) throw new Error("useLab must be used within LabProvider");
  return ctx;
}

// 完整性检查：返回缺失字段列表
export function checkCompleteness(e: Experiment): string[] {
  const miss: string[] = [];
  if (!e.operator || e.operator === "未识别") miss.push("实验人员");
  if (!e.purpose) miss.push("实验目的");
  if (!e.conclusion && !e.results) miss.push("实验结论/结果");
  if (!e.hypothesis) miss.push("实验假设（建议填写）");
  // 仪器
  if (e.instruments.length === 0 && !e.device.model) miss.push("仪器设备");
  for (const inst of e.instruments) {
    if (!inst.calibrationDate) miss.push(`仪器「${inst.name}」缺少校准日期`);
    if (!inst.serialNumber) miss.push(`仪器「${inst.name}」缺少序列号`);
  }
  // 材料
  if (e.materials.length === 0 && !e.sample.id) miss.push("材料/样品");
  for (const mat of e.materials) {
    if (!mat.lotNumber && !mat.casNumber) miss.push(`材料「${mat.name}」缺少批次号或CAS号`);
  }
  if (!e.sample.id) miss.push("样品编号");
  if (!e.sample.batch) miss.push("样品批次");
  // 协议
  if (!e.protocol?.name && e.steps.length < 2) miss.push("实验协议/详细步骤（至少 2 步）");
  if (!e.environment.temperature) miss.push("环境温度");
  if (!e.results) miss.push("结果数据描述");
  // 参数
  e.params.forEach((p) => {
    if (p.value && !p.unit && !["气氛", "电解液"].includes(p.name))
      miss.push(`参数「${p.name}」缺少单位`);
  });
  if (e.params.length === 0) miss.push("关键实验参数");
  // 质控
  if (e.controls.length === 0 && e.experimentType !== "simulation") miss.push("质控样本（建议添加）");
  if (!e.replicates || e.replicates < 2) miss.push("重复实验次数（建议 ≥2）");
  return miss;
}

// 生成 Methods 段落
export function generateMethods(e: Experiment): string {
  const paramStr = e.params
    .map((p) => `${p.name} ${p.value}${p.unit ? " " + p.unit : ""}`)
    .join("，");
  const materialStr = (e.materials ?? [])
    .map((m) => `${m.name}${m.purity ? ` (${m.purity})` : ""}${m.casNumber ? ` CAS: ${m.casNumber}` : ""}`)
    .join("、");
  const instrumentStr = (e.instruments ?? [])
    .map((inst) => `${inst.name}（${inst.model}，${inst.vendor}${inst.serialNumber ? `，SN: ${inst.serialNumber}` : ""}）`)
    .join("；");
  const protocolStr = e.protocol?.name
    ? `按照 ${e.protocol.name}${e.protocol.version ? ` v${e.protocol.version}` : ""} 进行。`
    : "";
  const controlStr = (e.controls ?? []).length > 0
    ? "质控样本：" + e.controls.map((c) => `${c.name}(${c.type})`).join("、") + "。"
    : "";

  return `实验于 ${e.date} 由 ${e.operator || "操作人员"} 完成${
    e.supervisor ? `，在 ${e.supervisor} 指导下` : ""
  }。\n\n${
    materialStr ? `**材料**：${materialStr}。\n\n` : ""
  }${
    instrumentStr ? `**仪器**：${instrumentStr}。\n\n` : ""
  }${
    protocolStr
  }采用 ${e.device?.name || "（设备）"}${
    e.device?.vendor ? `（${e.device.vendor}）` : ""
  }对样品 ${e.sample?.id || "（样品编号）"}${
    e.sample?.batch ? `（批次 ${e.sample.batch}）` : ""
  }进行处理。\n\n主要实验参数为：${paramStr || "（待补充）"}。\n\n${
    e.steps?.length
      ? "**步骤**：" + e.steps.map((s, i) => `(${i + 1}) ${s}`).join("；") + "。\n\n"
      : ""
  }${
    e.protocol?.steps?.length
      ? "**详细规程**：" + e.protocol.steps.map((s) => `(${s.order}) ${s.action}${s.duration ? ` [${s.duration}]` : ""}${s.temperature ? ` @${s.temperature}` : ""}`).join("；") + "。\n\n"
      : ""
  }环境条件：温度 ${e.environment?.temperature || "N/A"} ℃，湿度 ${
    e.environment?.humidity || "N/A"
  } %。${e.environment?.other ? `其他：${e.environment.other}。` : ""}\n\n${
    controlStr ? controlStr + "\n\n" : ""
  }${
    e.results ? "**结果**：" + e.results + "\n\n" : ""
  }${
    e.conclusion ? "**结论**：" + e.conclusion + "\n\n" : ""
  }${
    e.notes ? "**备注**：" + e.notes : ""
  }`.trim();
}
