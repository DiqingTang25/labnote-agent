/**
 * localStorage 持久化层
 * - 实验数据版本化存储，支持未来迁移
 * - 配额超限时自动丢弃最旧实验
 * - 用户配置独立存储
 */
import type { Experiment } from "./labStore";

const EXPERIMENTS_KEY = "labnote:v1:experiments";
const PROFILE_KEY = "labnote:v1:profile";
const MAX_EXPERIMENTS = 200;
const CURRENT_VERSION = 1;

interface PersistedData {
  version: number;
  experiments: Experiment[];
  savedAt: string;
}

// ═══════════════════════════════════════════════════════
// 实验数据
// ═══════════════════════════════════════════════════════

export function saveExperiments(experiments: Experiment[]): boolean {
  try {
    const trimmed = experiments.slice(0, MAX_EXPERIMENTS);
    const data: PersistedData = {
      version: CURRENT_VERSION,
      experiments: trimmed,
      savedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(data);

    // 尝试直接写入
    try {
      localStorage.setItem(EXPERIMENTS_KEY, json);
      return true;
    } catch {
      // 配额超限：逐条丢弃最旧的实验
    }

    for (let i = trimmed.length - 1; i >= 1; i--) {
      const reduced: PersistedData = {
        version: CURRENT_VERSION,
        experiments: trimmed.slice(0, i),
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(reduced));
        console.warn(
          `[persistence] Quota exceeded — dropped ${trimmed.length - i} oldest experiments, kept ${i}`,
        );
        return true;
      } catch {
        continue;
      }
    }

    console.error("[persistence] Cannot save even a single experiment — localStorage full");
    return false;
  } catch (err) {
    console.error("[persistence] Save failed:", err);
    return false;
  }
}

export function loadExperiments(): Experiment[] | null {
  try {
    const raw = localStorage.getItem(EXPERIMENTS_KEY);
    if (!raw) return null;

    const data: PersistedData = JSON.parse(raw);

    // 版本迁移（未来扩展）
    if (data.version !== CURRENT_VERSION) {
      console.warn(
        `[persistence] Data version ${data.version} → migrating to ${CURRENT_VERSION}`,
      );
      // v1 → v2: 在此添加迁移逻辑
    }

    if (!Array.isArray(data.experiments)) return null;

    // 确保所有实验有 attachedFiles 字段（向后兼容 v0）
    for (const exp of data.experiments) {
      if (!exp.attachedFiles) exp.attachedFiles = [];
      if (!exp.lastParsedAt) exp.lastParsedAt = null;
    }

    return data.experiments;
  } catch (err) {
    console.error("[persistence] Load failed:", err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// 用户配置
// ═══════════════════════════════════════════════════════

export function saveProfile(profile: {
  name: string;
  org: string;
  discipline: string;
}): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    console.warn("[persistence] Cannot save profile — localStorage full");
  }
}

export function loadProfile(): {
  name: string;
  org: string;
  discipline: string;
} | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// 工具
// ═══════════════════════════════════════════════════════

export function clearStorage(): void {
  localStorage.removeItem(EXPERIMENTS_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export function getStorageUsage(): {
  usedBytes: number;
  totalBytes: number;
  percent: number;
} {
  let used = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("labnote:")) {
      used += (localStorage.getItem(key) ?? "").length * 2; // UTF-16 → bytes approx
    }
  }
  const total = 5 * 1024 * 1024; // 5MB 保守估计
  return { usedBytes: used, totalBytes: total, percent: Math.round((used / total) * 100) };
}
