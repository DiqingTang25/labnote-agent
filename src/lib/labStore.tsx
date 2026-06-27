/**
 * LabNote Agent - 全局实验数据 store
 * Supabase 为主存储，localStorage 为离线缓存
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  saveExperiments,
  loadExperiments,
  saveProfile as persistProfile,
  loadProfile,
} from "./persistence";
import {
  isSupabaseReady,
  fetchExperiments,
  insertExperiment,
  updateExperimentDB,
  deleteExperimentDB,
  fetchProfile,
  upsertProfile,
} from "./supabase";

export type Param = { name: string; value: string; unit: string };

export type AttachedFile = {
  id: string;
  name: string;
  mediaType: string; // "image" | "text" | "csv" | "audio" | "video" | "document"
  mimeType: string;
  size: number;
  addedAt: string;
  textContent: string; // 文本内容或 AI 提取的描述
  parsedRaw: string; // 上次 API 解析的原始响应
};

export type Experiment = {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD HH:mm
  operator: string;
  purpose: string;
  background: string;
  device: { name: string; model: string; vendor: string };
  sample: { id: string; batch: string; source: string };
  params: Param[];
  environment: { temperature: string; humidity: string; other: string };
  steps: string[];
  results: string;
  notes: string;
  source: string;
  discipline: string;
  attachedFiles: AttachedFile[];
  lastParsedAt: string | null;
};

const newId = () => "exp_" + Math.random().toString(36).slice(2, 9);

type Ctx = {
  experiments: Experiment[];
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

/** 将持久化写入延迟到下一个事件循环，避免阻塞 UI */
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(experiments: Experiment[]) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    saveExperiments(experiments);
    _saveTimer = null;
  }, 100);
}

export function LabProvider({ children }: { children: ReactNode }) {
  const [experiments, setExperiments] = useState<Experiment[]>(() => {
    const saved = loadExperiments();
    if (saved && saved.length > 0) return saved;
    return [];
  });
  const [profile, setProfile] = useState<Ctx["profile"]>(() => {
    const saved = loadProfile();
    if (saved) return saved;
    return {
      name: "研究员",
      org: "智能材料课题组",
      discipline: "材料科学",
    };
  });

  // 启动时从 Supabase 拉取最新数据
  useEffect(() => {
    if (!isSupabaseReady()) return;

    fetchExperiments().then((dbExps) => {
      if (dbExps.length > 0) {
        setExperiments(dbExps);
        saveExperiments(dbExps); // 更新本地缓存
      }
    });

    fetchProfile().then((p) => {
      if (p) {
        const prof = {
          name: p.name ?? "研究员",
          org: p.org ?? "智能材料课题组",
          discipline: (p.discipline as Experiment["discipline"]) ?? "材料科学",
        };
        setProfile(prof);
        persistProfile(prof);
      }
    });
  }, []);

  const addExperiment = useCallback((e: Experiment) => {
    setExperiments((arr) => {
      const next = [e, ...arr];
      scheduleSave(next);
      return next;
    });
    // 异步写 Supabase（不阻塞 UI）
    if (isSupabaseReady()) insertExperiment(e);
  }, []);
  const updateExperiment = useCallback(
    (id: string, patch: Partial<Experiment>) => {
      setExperiments((arr) => {
        const next = arr.map((x) => (x.id === id ? { ...x, ...patch } : x));
        scheduleSave(next);
        return next;
      });
      if (isSupabaseReady()) updateExperimentDB(id, patch);
    },
    [],
  );
  const deleteExperiment = useCallback((id: string) => {
    setExperiments((arr) => {
      const next = arr.filter((x) => x.id !== id);
      scheduleSave(next);
      return next;
    });
    if (isSupabaseReady()) deleteExperimentDB(id);
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
        scheduleSave(next);
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
        scheduleSave(next);
        return next;
      });
    },
    [],
  );

  // 用户配置变更 → localStorage + Supabase
  const updateProfile = useCallback((p: Ctx["profile"]) => {
    setProfile(p);
    persistProfile(p);
    if (isSupabaseReady()) upsertProfile(p);
  }, []);

  return (
    <LabCtx.Provider
      value={{
        experiments,
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
  if (!e.device.model) miss.push("设备型号");
  if (!e.device.vendor) miss.push("设备厂家");
  if (!e.sample.id) miss.push("样品编号");
  if (!e.sample.batch) miss.push("样品批次");
  if (!e.environment.temperature) miss.push("环境温度");
  if (e.steps.length < 2) miss.push("详细实验步骤（至少 2 步）");
  if (!e.results) miss.push("结果数据描述");
  e.params.forEach((p) => {
    if (p.value && !p.unit && !["气氛", "电解液"].includes(p.name))
      miss.push(`参数「${p.name}」缺少单位`);
  });
  if (e.params.length === 0) miss.push("关键实验参数");
  return miss;
}

// 生成 Methods 段落
export function generateMethods(e: Experiment): string {
  const paramStr = e.params
    .map((p) => `${p.name} ${p.value}${p.unit ? " " + p.unit : ""}`)
    .join("，");
  return `实验于 ${e.date} 由 ${e.operator || "操作人员"} 完成。采用 ${
    e.device.vendor || "（厂家）"
  } ${e.device.name || "（设备）"}（型号 ${e.device.model || "N/A"}）对样品 ${
    e.sample.id || "（样品编号）"
  }（批次 ${e.sample.batch || "N/A"}）进行处理。主要实验参数为：${
    paramStr || "（待补充）"
  }。实验流程如下：${
    e.steps.length ? e.steps.map((s, i) => `(${i + 1}) ${s}`).join("；") : "（待补充）"
  }。环境条件：温度 ${e.environment.temperature || "N/A"} ℃，湿度 ${
    e.environment.humidity || "N/A"
  } %。${e.results ? "结果：" + e.results : ""}`;
}
