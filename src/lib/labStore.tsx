/**
 * LabNote Agent — 全局实验数据 store
 *
 * 零硬编码字段。所有实验数据通过 properties JSONB + templates 驱动。
 * Supabase 云端存储，不再依赖 localStorage。
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode, type SetStateAction } from "react";
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
  fetchMyTeams,
  fetchTeamTemplates,
  type TeamRow,
} from "./supabase";
import { getTemplate } from "./templates/presets";
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
  // ── 工作空间（个人 / 团队）──
  workspace: { mode: "personal" | "team"; teamId: string | null };
  setWorkspace: (w: { mode: "personal" | "team"; teamId: string | null }) => void;
  myTeams: { team: TeamRow; role: string; roleTitle: string | null }[];
  myRole: string;
  visibleExperiments: ExperimentDoc[];
  refreshTeams: () => Promise<void>;
  // ── 团队模板（团队工作空间时加载）──
  teamTemplates: Template[];
  refreshTeamTemplates: () => Promise<void>;
  // ── 工作空间弹窗唤起（无团队时从团队页主动打开创建/加入流程）──
  gate: { open: boolean; view: "pick" | "create" | "join" };
  requestGate: (view: "pick" | "create" | "join") => void;
  closeGate: () => void;
  /** 按 id 解析模板：先查预置，再查团队模板（DynamicCardEditor 渲染字段用） */
  resolveTemplate: (id: string | undefined) => Template | undefined;
  addExperiment: (e: ExperimentDoc) => void;
  updateExperiment: (id: string, patch: Partial<ExperimentDoc>) => void;
  deleteExperiment: (id: string) => void;
  getById: (id: string) => ExperimentDoc | undefined;
  profile: { name: string; org: string; discipline: string };
  setProfile: (p: Ctx["profile"]) => void;
  // ── 全局 UI 状态（切页不丢失）──
  workbenchActiveId: string | undefined;
  setWorkbenchActiveId: (id: string | undefined) => void;
  pipelineRunning: boolean;
  pipelineStage: string;
  pipelineDetail: string;
  pipelineFiles: Record<number, { name: string; status: string; detail?: string; error?: string }>;
  pipelineCards: ExperimentDoc[];
  pipelineSummary: boolean;
  setPipelineRunning: (v: boolean) => void;
  setPipelineStage: (s: string) => void;
  setPipelineDetail: (d: string) => void;
  setPipelineFiles: (f: SetStateAction<Record<number, { name: string; status: string; detail?: string; error?: string }>>) => void;
  setPipelineCards: (c: ExperimentDoc[]) => void;
  setPipelineSummary: (v: boolean) => void;
  resetPipeline: () => void;
  decomposing: boolean;
  decompStep: string;
  decompDetail: string;
  setDecomposing: (v: boolean) => void;
  setDecompProgress: (step: string, detail?: string) => void;
  addFileToExperiment: (expId: string, file: AttachedFile) => void;
  removeFileFromExperiment: (expId: string, fileId: string) => void;
};

const LabCtx = createContext<Ctx | null>(null);

// ═══════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════

export function LabProvider({ children }: { children: ReactNode }) {
  const [experiments, setExperiments] = useState<ExperimentDoc[]>([]);
  const experimentsRef = useRef<ExperimentDoc[]>([]);
  useEffect(() => {
    experimentsRef.current = experiments;
  }, [experiments]);
  // 进行中的初始插入（expId → Promise）：保存前等待，避免与回退插入竞态
  const pendingInsertsRef = useRef(new Map<string, Promise<boolean>>());
  // ── 工作空间状态（localStorage 记忆上次选择）──
  const [workspace, setWorkspaceState] = useState<{ mode: "personal" | "team"; teamId: string | null }>(() => {
    try {
      const raw = localStorage.getItem("labnote:workspace");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.mode === "personal" || parsed.mode === "team")) return parsed;
      }
    } catch {
      // ignore
    }
    return { mode: "personal", teamId: null };
  });
  const [myTeams, setMyTeams] = useState<{ team: TeamRow; role: string; roleTitle: string | null }[]>([]);
  const [teamTemplates, setTeamTemplates] = useState<Template[]>([]);
  const [gate, setGate] = useState<{ open: boolean; view: "pick" | "create" | "join" }>({ open: false, view: "pick" });
  const requestGate = useCallback((view: "pick" | "create" | "join") => {
    setGate({ open: true, view });
  }, []);
  const closeGate = useCallback(() => {
    setGate((g) => ({ ...g, open: false }));
  }, []);

  const refreshTeams = useCallback(async () => {
    if (!isSupabaseReady()) return;
    try {
      const teams = await fetchMyTeams();
      setMyTeams(teams);
    } catch {
      // ignore
    }
  }, []);

  const setWorkspace = useCallback((w: { mode: "personal" | "team"; teamId: string | null }) => {
    setWorkspaceState(w);
    try {
      localStorage.setItem("labnote:workspace", JSON.stringify(w));
    } catch {
      // ignore
    }
  }, []);

  // ── 团队模板：团队工作空间时加载（RLS 仅团队成员可读）──
  const refreshTeamTemplates = useCallback(async () => {
    if (!isSupabaseReady()) return;
    if (workspace.mode !== "team" || !workspace.teamId) {
      setTeamTemplates([]);
      return;
    }
    try {
      const rows = await fetchTeamTemplates(workspace.teamId);
      setTeamTemplates(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          experimentType: r.experiment_type,
          domain: r.domain,
          version: r.version,
          fieldGroups: r.field_groups as Template["fieldGroups"],
          isPreset: false,
          teamId: r.team_id,
        })),
      );
    } catch {
      // ignore
    }
  }, [workspace]);

  useEffect(() => {
    refreshTeamTemplates();
  }, [refreshTeamTemplates]);

  // 模板解析：预置优先，团队模板兜底（含团队模板的字段渲染）
  const resolveTemplate = useCallback(
    (id: string | undefined): Template | undefined => {
      if (!id) return undefined;
      return getTemplate(id) ?? teamTemplates.find((t) => t.id === id);
    },
    [teamTemplates],
  );

  // 当前工作空间内的角色（个人模式为空）
  const myRole = useMemo(
    () =>
      workspace.mode === "team" && workspace.teamId
        ? myTeams.find((t) => t.team.id === workspace.teamId)?.role ?? ""
        : "",
    [workspace, myTeams],
  );

  // 按工作空间过滤的实验列表（个人模式 = teamId 为空；团队模式 = 本团队）
  const visibleExperiments = useMemo(
    () =>
      workspace.mode === "team" && workspace.teamId
        ? experiments.filter((e) => e.teamId === workspace.teamId)
        : experiments.filter((e) => !e.teamId),
    [experiments, workspace],
  );

  const [loading, setLoading] = useState(true);
  // ── 全局 UI 状态 ──
  const [workbenchActiveId, setWorkbenchActiveId] = useState<string | undefined>(undefined);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStage, setPipelineStage] = useState("idle");
  const [pipelineDetail, setPipelineDetail] = useState("");
  const [pipelineFiles, setPipelineFiles] = useState<Record<number, { name: string; status: string; detail?: string; error?: string }>>({});
  const [pipelineCards, setPipelineCards] = useState<ExperimentDoc[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState(false);
  const resetPipeline = useCallback(() => {
    setPipelineRunning(false);
    setPipelineStage("idle");
    setPipelineDetail("");
    setPipelineFiles({});
    setPipelineCards([]);
    setPipelineSummary(false);
  }, []);
  const [decomposing, setDecomposing] = useState(false);
  const [decompStep, setDecompStep] = useState("idle");
  const [decompDetail, setDecompDetail] = useState("");
  const setDecompProgress = useCallback((step: string, detail?: string) => {
    setDecompStep(step);
    setDecompDetail(detail ?? "");
  }, []);
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

    refreshTeams();

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
    // 团队工作空间下新建的实验自动归属当前团队
    const doc =
      workspace.mode === "team" && workspace.teamId
        ? { ...e, teamId: workspace.teamId }
        : { ...e, teamId: e.teamId ?? null };
    setExperiments((arr) => [doc, ...arr]);
    if (isSupabaseReady()) {
      // 审核工作流：团队模式下普通成员上传 → 待审核（管理员通过后才对全队可见）
      const role = workspace.mode === "team" && workspace.teamId
        ? myTeams.find((t) => t.team.id === workspace.teamId)?.role ?? ""
        : "";
      const approval: "approved" | "pending" =
        workspace.mode === "team" && role === "member" ? "pending" : "approved";
      const p = insertExperiment(doc, undefined, approval).then((ok) => {
        if (ok) {
          embedExperiment(doc.id);
          autoGenerateRelations(doc);
        }
        return ok;
      });
      // 记录进行中的插入：保存时先等它落库，避免 UPDATE 0 行回退插入撞主键（409）
      pendingInsertsRef.current.set(doc.id, p);
      p.finally(() => {
        if (pendingInsertsRef.current.get(doc.id) === p) pendingInsertsRef.current.delete(doc.id);
      });
    }
  }, [workspace, myTeams]);

  const updateExperiment = useCallback((id: string, patch: Partial<ExperimentDoc>) => {
    setExperiments((arr) => {
      experimentsRef.current = arr.map((x) => (x.id === id ? { ...x, ...patch } : x));
      return experimentsRef.current;
    });
    if (isSupabaseReady()) {
      const pending = pendingInsertsRef.current.get(id);
      const run = async () => {
        // 等初始插入落库后再更新，避免竞态（插入在途时 UPDATE 匹配 0 行）
        if (pending) await pending.catch(() => {});
        const updated = await updateExperimentDB(id, patch);
        if (!updated) {
          // UPDATE 匹配 0 行：该实验确实从未入库 → 转为插入，避免"假保存"
          const full = experimentsRef.current.find((x) => x.id === id);
          if (full) {
            const ok = await insertExperiment(full);
            console.log(ok ? `[LabStore] 实验 ${id} 未入库，已自动转为插入` : `[LabStore] 实验 ${id} 插入失败`);
            if (ok) embedExperiment(id);
          }
        } else {
          embedExperiment(id);
        }
      };
      run();
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
        workspace,
        setWorkspace,
        myTeams,
        myRole,
        visibleExperiments,
        refreshTeams,
        teamTemplates,
        refreshTeamTemplates,
        resolveTemplate,
        gate,
        requestGate,
        closeGate,
        addExperiment,
        updateExperiment,
        deleteExperiment,
        getById,
        profile,
        setProfile: updateProfile,
        addFileToExperiment,
        removeFileFromExperiment,
        workbenchActiveId,
        setWorkbenchActiveId,
        pipelineRunning,
        pipelineStage,
        pipelineDetail,
        pipelineFiles,
        pipelineCards,
        pipelineSummary,
        setPipelineRunning,
        setPipelineStage,
        setPipelineDetail,
        setPipelineFiles,
        setPipelineCards,
        setPipelineSummary,
        resetPipeline,
        decomposing,
        decompStep,
        decompDetail,
        setDecomposing,
        setDecompProgress,
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
