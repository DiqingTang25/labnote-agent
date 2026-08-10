/**
 * field_patterns 自演化引擎 — 客户端统计函数
 *
 * 从实验数据中自动涌现字段 schema：
 * - 每种实验类型出现哪些字段（频率、分布）
 * - 字段间的共现模式
 * - 驱动 AI 补全建议和 UI 字段推荐
 */

import type { FieldPattern, ExperimentDoc } from "./exp-core";
import { flattenProperties, type FlatEntry } from "./property-utils";

// ═══════════════════════════════════════════════════════
// 计算 field_patterns
// ═══════════════════════════════════════════════════════

/**
 * 从实验列表中计算 field_patterns
 * 用于客户端 fallback 统计
 */
export function computePatterns(
  experiments: ExperimentDoc[],
): FieldPattern[] {
  // 按 experimentType 分组
  const byType = new Map<string, ExperimentDoc[]>();
  for (const exp of experiments) {
    const type = exp.experimentType || "other";
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(exp);
  }

  const allPatterns: FieldPattern[] = [];

  for (const [expType, exps] of byType) {
    const total = exps.length;
    const pathCounts = new Map<string, number>();
    const pathValues = new Map<string, FlatEntry[]>();
    const pathCooc = new Map<string, Set<string>>(); // field_path → co-occurring paths
    const experimentFlatMap = new Map<string, Set<string>>(); // expId → its paths

    for (const exp of exps) {
      const flat = flattenProperties(exp.properties);
      const expPaths = new Set<string>();

      for (const entry of flat) {
        expPaths.add(entry.path);
        pathCounts.set(entry.path, (pathCounts.get(entry.path) || 0) + 1);
        if (!pathValues.has(entry.path)) pathValues.set(entry.path, []);
        pathValues.get(entry.path)!.push(entry);
      }

      experimentFlatMap.set(exp.id, expPaths);
    }

    // Co-occurrence: for each path, find other paths in same experiments
    for (const [path, count] of pathCounts) {
      const cooc = new Set<string>();
      for (const [expId, expPaths] of experimentFlatMap) {
        if (expPaths.has(path)) {
          for (const other of expPaths) {
            if (other !== path) cooc.add(other);
          }
        }
      }
      pathCooc.set(path, cooc);
    }

    // Build stats per path
    for (const [path, count] of pathCounts) {
      const entries = pathValues.get(path) || [];
      const nonEmpty = entries.filter(
        (e) => e.value !== null && e.value !== undefined && e.value !== "",
      );

      const valueType = inferValueType(entries);
      const valueStats = computeValueStats(nonEmpty, valueType);
      const cooc = Array.from(pathCooc.get(path) || [])
        .sort((a, b) => (pathCounts.get(b) || 0) - (pathCounts.get(a) || 0))
        .slice(0, 10);

      allPatterns.push({
        id: `${expType}:${path}`,
        experimentType: expType,
        fieldPath: path,
        occurrenceCount: nonEmpty.length,
        occurrenceRate: total > 0 ? nonEmpty.length / total : 0,
        valueType,
        valueStats,
        coOccurring: cooc,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return allPatterns;
}

function inferValueType(entries: FlatEntry[]): FieldPattern["valueType"] {
  const types = entries.map((e) => e.type);
  if (types.every((t) => t === "number")) return "number";
  if (types.every((t) => t === "boolean")) return "boolean";
  if (types.every((t) => t === "array")) return "array";
  if (types.every((t) => t === "object")) return "object";
  return "string";
}

function computeValueStats(
  entries: FlatEntry[],
  valueType: FieldPattern["valueType"],
): FieldPattern["valueStats"] {
  if (entries.length === 0) return {};

  const stats: FieldPattern["valueStats"] = {};

  if (valueType === "number") {
    const nums = entries
      .map((e) => (typeof e.value === "number" ? e.value : parseFloat(String(e.value))))
      .filter((n) => !isNaN(n));
    if (nums.length > 0) {
      stats.min = Math.min(...nums);
      stats.max = Math.max(...nums);
      stats.mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    }
  }

  if (valueType === "string" || valueType === "number") {
    const strValues = entries.map((e) => String(e.value));
    const freq = new Map<string, number>();
    for (const v of strValues) {
      freq.set(v, (freq.get(v) || 0) + 1);
    }
    stats.commonValues = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([v]) => v);
    stats.samples = strValues.slice(0, 3);
  }

  return stats;
}

// ═══════════════════════════════════════════════════════
// 建议缺失字段
// ═══════════════════════════════════════════════════════

export type FieldSuggestion = {
  path: string;
  label: string;
  rate: number;
  reason: string;
};

/**
 * 根据 field_patterns 统计，为当前实验建议缺失的高频字段
 */
export function buildSuggestions(
  patterns: FieldPattern[],
  doc: ExperimentDoc,
  threshold = 0.6,
): FieldSuggestion[] {
  const docPaths = new Set(
    flattenProperties(doc.properties).map((e) => e.path),
  );

  const suggestions: FieldSuggestion[] = [];

  for (const p of patterns) {
    if (
      p.experimentType === doc.experimentType &&
      p.occurrenceRate >= threshold &&
      !docPaths.has(p.fieldPath) &&
      !p.fieldPath.startsWith("extra.") &&
      !p.fieldPath.startsWith("_meta.")
    ) {
      suggestions.push({
        path: p.fieldPath,
        label: p.fieldPath.split(".").pop() || p.fieldPath,
        rate: p.occurrenceRate,
        reason: `${Math.round(p.occurrenceRate * 100)}% 的同类实验有此字段`,
      });
    }
  }

  return suggestions.sort((a, b) => b.rate - a.rate);
}
