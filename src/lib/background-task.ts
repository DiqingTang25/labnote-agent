/**
 * Background Task Manager — 模块级后台任务
 *
 * 核心特性：
 *   - 任务存储在模块级 Map 中，不绑定任何 React 组件
 *   - 页面切换（组件卸载）不会中断任务
 *   - 组件重新挂载时可查询任务状态并恢复 UI
 *
 * 使用场景：AI 论文拆解耗时较长，用户可能切换到其他页面
 */

import type { DecompositionProgress } from "./paper-decomposer";
import type { ReproductionAudit } from "./reproduction-audit";

// ═══════════════════════════════════════════════════════
// 类型
// ═══════════════════════════════════════════════════════

export type BgTaskStatus = "running" | "done" | "error";

export type BgTask = {
  id: string;
  status: BgTaskStatus;
  paperTitle: string;
  paperDoi: string;
  discipline: string;
  progress: DecompositionProgress;
  result: ReproductionAudit | null;
  error: string | null;
  startedAt: number;
  /** Supabase 保存成功后的 audit id */
  savedAuditId: string | null;
};

// ═══════════════════════════════════════════════════════
// 模块级存储（不随组件卸载而消失）
// ═══════════════════════════════════════════════════════

const tasks = new Map<string, BgTask>();

// ═══════════════════════════════════════════════════════
// 公开 API
// ═══════════════════════════════════════════════════════

let _taskCounter = 0;

/**
 * 启动后台 AI 拆解任务
 * 立即返回 taskId，不阻塞 UI
 */
export function startBackgroundDecomposition(
  paperTitle: string,
  paperDoi: string,
  methodsText: string,
  discipline: string,
): string {
  const id = `task_${Date.now().toString(36)}_${++_taskCounter}`;

  const task: BgTask = {
    id,
    status: "running",
    paperTitle,
    paperDoi,
    discipline,
    progress: { step: "connecting" },
    result: null,
    error: null,
    startedAt: Date.now(),
    savedAuditId: null,
  };

  tasks.set(id, task);

  // 在后台执行（不 await — 让任务独立运行）
  runTask(id, paperTitle, paperDoi, methodsText, discipline);

  return id;
}

/** 查询任务状态 */
export function getTask(id: string): BgTask | null {
  return tasks.get(id) ?? null;
}

/** 获取最新任务（用于恢复 UI） */
export function getLatestTask(): BgTask | null {
  let latest: BgTask | null = null;
  for (const t of tasks.values()) {
    if (!latest || t.startedAt > latest.startedAt) latest = t;
  }
  return latest;
}

/** 获取所有进行中的任务 */
export function getRunningTasks(): BgTask[] {
  return [...tasks.values()].filter((t) => t.status === "running");
}

/** 清除已完成/错误的任务 */
export function clearDoneTasks(): void {
  for (const [id, t] of tasks) {
    if (t.status !== "running") tasks.delete(id);
  }
}

// ═══════════════════════════════════════════════════════
// 内部：实际执行
// ═══════════════════════════════════════════════════════

async function runTask(
  id: string,
  paperTitle: string,
  paperDoi: string,
  methodsText: string,
  discipline: string,
): Promise<void> {
  const task = tasks.get(id);
  if (!task) return;

  try {
    // 动态 import — 避免 SSR 时加载重依赖链
    const [{ decomposePaperMethods }, { saveAudit }] = await Promise.all([
      import("./paper-decomposer"),
      import("./supabase"),
    ]);

    const result = await decomposePaperMethods(
      paperTitle,
      paperDoi,
      methodsText,
      discipline,
      (progress) => {
        // 进度回调 — 更新模块级 task
        const t = tasks.get(id);
        if (t) t.progress = progress;
      },
    );

    // 自动保存到 Supabase
    const savedId = await saveAudit(result, discipline);

    const t = tasks.get(id);
    if (t) {
      t.status = "done";
      t.result = result;
      t.progress = { step: "done" };
      t.savedAuditId = savedId;
    }
  } catch (err) {
    const t = tasks.get(id);
    if (t) {
      t.status = "error";
      t.error = err instanceof Error ? err.message : String(err);
      t.progress = { step: "done" };
    }
  }
}
