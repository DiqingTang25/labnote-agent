/**
 * LabNote Agent — 全局实验数据 store
 *
 * 零硬编码字段。所有实验数据通过 properties JSONB + templates 驱动。
 * Supabase 云端存储，不再依赖 localStorage。
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
import type { ExperimentDoc, AttachedFile, DocProperties } from "./exp-core";
import { createBlankDoc } from "./exp-core";
import type { Template } from "./exp-core";

// Re-export for consumers
export type { ExperimentDoc, AttachedFile, DocProperties, Template };
export type { FieldDef, FieldGroup, FieldPattern } from "./exp-core";
export { createBlankDoc } from "./exp-core";

// ═══════════════════════════════════════════════════════
// Store Context
// ═══════════════════════════════════════════════════════

type Ctx = {
  experiments: ExperimentDoc[];
  loading: boolean;
  addExperiment: (e: ExperimentDoc) => void;
  updateExperiment: (id: string, patch: Partial<ExperimentDoc>) => void;
  deleteExperiment: (id: string) => void;
  getById: (id: string) => ExperimentDoc | undefined;
  profile: { name: string; org: string; discipline: string };
  setProfile: (p: Ctx["profile"]) => void;
  addFileToExperiment: (expId: string, file: AttachedFile) => void;
  removeFileFromExperiment: (expId: string, fileId: string) => void;
};

const LabCtx = createContext<Ctx | null>(null);

// ═══════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════

export function LabProvider({ children }: { children: ReactNode }) {
  const [experiments, setExperiments] = useState<ExperimentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Ctx["profile"]>({
    name: "研究员",
    org: "智能材料课题组",
    discipline: "材料科学",
  });

  // 启动时从 Supabase 拉取数据
  useEffect(() => {
    if (!isSupabaseReady()) {
      setLoading(false);
      return;
    }

    Promise.all([fetchExperiments(), fetchProfile()])
      .then(([dbExps, p]) => {
        if (dbExps.length > 0) setExperiments(dbExps);
        if (p) {
          setProfile({
            name: p.name ?? "研究员",
            org: p.org ?? "智能材料课题组",
            discipline: p.discipline ?? "材料科学",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const addExperiment = useCallback((e: ExperimentDoc) => {
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

  const updateExperiment = useCallback((id: string, patch: Partial<ExperimentDoc>) => {
    setExperiments((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    if (isSupabaseReady()) {
      updateExperimentDB(id, patch).then(() => embedExperiment(id));
    }
  }, []);

  const deleteExperiment = useCallback((id: string) => {
    setExperiments((arr) => arr.filter((x) => x.id !== id));
    if (isSupabaseReady()) {
      import("./storage.server").then(({ deleteExperimentFiles }) => {
        import("./supabase").then(({ supabase }) => {
          supabase.auth
            .getSession()
            .then(
              ({ data: { session } }: { data: { session: { access_token: string } | null } }) => {
                const accessToken = session?.access_token;
                if (accessToken) deleteExperimentFiles({ data: { accessToken, expId: id } });
              },
            );
        });
      });
      deleteExperimentDB(id);
    }
  }, []);

  const getById = useCallback((id: string) => experiments.find((x) => x.id === id), [experiments]);

  const addFileToExperiment = useCallback((expId: string, file: AttachedFile) => {
    setExperiments((arr) =>
      arr.map((x) =>
        x.id === expId
          ? {
              ...x,
              attachedFiles: [...x.attachedFiles, file],
              lastParsedAt: new Date().toISOString(),
            }
          : x,
      ),
    );
  }, []);

  const removeFileFromExperiment = useCallback((expId: string, fileId: string) => {
    setExperiments((arr) =>
      arr.map((x) =>
        x.id === expId
          ? { ...x, attachedFiles: x.attachedFiles.filter((f) => f.id !== fileId) }
          : x,
      ),
    );
  }, []);

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

// ═══════════════════════════════════════════════════════
// 完整性检查 — 基于模板 required 字段
// ═══════════════════════════════════════════════════════

import { getProperty } from "./property-utils";

export function checkCompleteness(doc: ExperimentDoc, template?: Template): string[] {
  const miss: string[] = [];

  // Core fields
  if (!doc.name || doc.name === "未命名实验") miss.push("实验名称");
  if (!doc.operator) miss.push("实验人员");
  if (!doc.experimentType) miss.push("实验类型");

  // Template required fields
  if (template) {
    for (const group of template.fieldGroups) {
      for (const field of group.fields) {
        if (field.required) {
          const val = getProperty(doc.properties, field.path);
          if (
            val === undefined ||
            val === null ||
            val === "" ||
            (typeof val === "number" && val === 0)
          ) {
            miss.push(field.label);
          }
        }
      }
    }
  }

  return miss;
}

// ═══════════════════════════════════════════════════════
// Methods 段落生成 — 基于 properties 遍历
// ═══════════════════════════════════════════════════════

import { flattenProperties } from "./property-utils";

export function generateMethods(doc: ExperimentDoc): string {
  const parts: string[] = [];

  // Header
  parts.push(`## ${doc.name}`);
  parts.push(`- 时间: ${doc.date}`);
  parts.push(`- 操作人: ${doc.operator}`);
  parts.push(`- 类型: ${doc.experimentType}`);

  // Properties — 按 group 组织
  const flat = flattenProperties(doc.properties);
  const byGroup = new Map<string, string[]>();

  for (const entry of flat) {
    if (entry.path.startsWith("extra.") || entry.path.startsWith("_meta.")) continue;
    const groupName = entry.path.includes(".") ? entry.path.split(".")[0] : "通用";
    if (!byGroup.has(groupName)) byGroup.set(groupName, []);
    const label = entry.path.includes(".") ? entry.path.split(".").slice(1).join(".") : entry.path;
    byGroup.get(groupName)!.push(`  - ${label}: ${entry.value}`);
  }

  for (const [group, items] of byGroup) {
    if (items.length === 0) continue;
    parts.push(`\n### ${group}`);
    parts.push(...items);
  }

  // Notes
  if (doc.aiInsights) {
    parts.push(`\n### AI 洞察\n${doc.aiInsights}`);
  }

  return parts.join("\n");
}
