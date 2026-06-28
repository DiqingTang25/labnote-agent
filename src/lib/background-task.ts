/**
 * Background Task — 模块级后台任务
 *
 * TanStack Router 是 SPA 路由，JS 上下文在页面切换时持久存在。
 * 这里的模块级 Promise 不会因 React 组件卸载而中断。
 *
 * 流程：
 *   1. 组件调用 startTask() → 启动异步拆解 → 返回 taskId
 *   2. 进度通过 onProgress 回调更新模块级 task.progress
 *   3. 结果存入 task.result + localStorage（防页面刷新丢失）
 *   4. 组件通过 getTask() 轮询进度
 *   5. 组件重新挂载时通过 getTask() 恢复进度/结果
 */
import type { DecompositionProgress } from "./paper-decomposer";
import type { ReproductionAudit } from "./reproduction-audit";

export type BgTaskStatus = "running" | "done" | "error";

export type BgTask = {
  id: string;
  status: BgTaskStatus;
  paperTitle: string;
  discipline: string;
  progress: DecompositionProgress;
  result: ReproductionAudit | null;
  error: string | null;
  startedAt: number;
};

const tasks = new Map<string, BgTask>();
let _counter = 0;

const STORAGE_PREFIX = "bg_task_";

function saveToStorage(task: BgTask) {
  try {
    localStorage.setItem(STORAGE_PREFIX + task.id, JSON.stringify({
      id: task.id,
      status: task.status,
      paperTitle: task.paperTitle,
      discipline: task.discipline,
      progress: task.progress,
      result: task.result,
      error: task.error,
      startedAt: task.startedAt,
    }));
  } catch {}
}

function loadFromStorage(): BgTask[] {
  const result: BgTask[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const data = JSON.parse(localStorage.getItem(key)!);
        if (Date.now() - data.startedAt < 600000) { // 10分钟内有效
          result.push(data as BgTask);
        } else {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {}
  return result;
}

function removeFromStorage(id: string) {
  try { localStorage.removeItem(STORAGE_PREFIX + id); } catch {}
}

/** 启动后台拆解任务 */
export function startBackgroundDecomposition(
  paperTitle: string,
  paperDoi: string,
  methodsText: string,
  discipline: string,
): string {
  const id = `task_${Date.now().toString(36)}_${++_counter}`;

  const task: BgTask = {
    id,
    status: "running",
    paperTitle,
    discipline,
    progress: { step: "connecting" },
    result: null,
    error: null,
    startedAt: Date.now(),
  };

  tasks.set(id, task);
  saveToStorage(task);

  // 启动异步执行（不 await！让它独立运行）
  runDecomposition(id, paperTitle, paperDoi, methodsText, discipline);

  return id;
}

/** 查询任务 */
export function getTask(id: string): BgTask | null {
  // 先从内存查
  if (tasks.has(id)) return tasks.get(id)!;
  // 再从 localStorage 查（页面刷新后恢复）
  const stored = loadFromStorage();
  const found = stored.find((t) => t.id === id);
  if (found) {
    tasks.set(id, found);
    return found;
  }
  return null;
}

/** 获取所有任务 */
export function getAllTasks(): BgTask[] {
  const stored = loadFromStorage();
  for (const t of stored) {
    if (!tasks.has(t.id)) tasks.set(t.id, t);
  }
  return [...tasks.values()];
}

/** 获取最新任务 */
export function getLatestTask(): BgTask | null {
  const all = getAllTasks();
  if (all.length === 0) return null;
  return all.reduce((a, b) => (a.startedAt > b.startedAt ? a : b));
}

/** 获取进行中的任务 */
export function getRunningTasks(): BgTask[] {
  return getAllTasks().filter((t) => t.status === "running");
}

/** 清除已完成任务 */
export function clearDoneTasks(): void {
  for (const [id, t] of tasks) {
    if (t.status !== "running") {
      tasks.delete(id);
      removeFromStorage(id);
    }
  }
}

/** 清除单个任务 */
export function clearTask(id: string): void {
  tasks.delete(id);
  removeFromStorage(id);
}

// ═══════════════════════════════════════════════════════
// 内部：执行拆解（动态 import 避免 SSR 加载重依赖）
// ═══════════════════════════════════════════════════════

async function runDecomposition(
  id: string,
  paperTitle: string,
  paperDoi: string,
  methodsText: string,
  discipline: string,
): Promise<void> {
  try {
    // 动态 import — 仅在浏览器端加载
    const [{ decomposePaperMethods }, { saveAudit }] = await Promise.all([
      import("./paper-decomposer"),
      import("./supabase"),
    ]);

    const updateProgress = (p: DecompositionProgress) => {
      const t = tasks.get(id);
      if (t) {
        t.progress = p;
        saveToStorage(t);
      }
    };

    updateProgress({ step: "connecting" });
    updateProgress({ step: "decomposing", detail: "DeepSeek-V3 拆解中…" });

    const result = await decomposePaperMethods(
      paperTitle,
      paperDoi,
      methodsText,
      discipline,
      updateProgress,
    );

    updateProgress({ step: "done" });

    // 保存到 Supabase
    const savedId = await saveAudit(result, discipline);

    const t = tasks.get(id);
    if (t) {
      t.status = "done";
      t.result = result;
      t.progress = { step: "done" };
      (t as any).savedAuditId = savedId;
      saveToStorage(t);
    }
  } catch (err) {
    const t = tasks.get(id);
    if (t) {
      t.status = "error";
      t.error = err instanceof Error ? err.message : String(err);
      t.progress = { step: "done" };
      saveToStorage(t);
    }
  }
}
