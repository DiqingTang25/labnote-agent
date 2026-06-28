/**
 * NIST Chemistry WebBook Client — 客户端封装
 *
 * 提供化合物热力学数据查询，用于增强论文拆解中的参数置信度。
 * 作为 domain-knowledge.ts 和 Materials Project 的外部数据源补充。
 */
import type { NISTCompoundResult } from "./api/nist.functions";

// ═══════════════════════════════════════════════════════
// 化合物名称提取
// ═══════════════════════════════════════════════════════

/** 常见化合物俗名 → 化学式映射（用于 NIST 搜索） */
const COMPOUND_NAME_MAP: Record<string, string> = {
  "titania": "TiO2",
  "titania P25": "TiO2",
  "P25": "TiO2",
  "rutile": "TiO2",
  "anatase": "TiO2",
  "hematite": "Fe2O3",
  "magnetite": "Fe3O4",
  "wurtzite": "ZnO",
  "zincite": "ZnO",
  "perovskite": "SrTiO3",
  "melamine": "C3H6N6",
  "g-C3N4": "C3N4",
  "graphitic carbon nitride": "C3N4",
  "graphene": "C",
  "graphene oxide": "C",
  "graphite": "C",
  "cobalt nitrate": "Co(NO3)2",
  "strontium chloride": "SrCl2",
  "potassium hydroxide": "KOH",
  "sodium hydroxide": "NaOH",
  "hydrazine": "N2H4",
  "hydrazine hydrate": "N2H4",
  "benzoquinone": "C6H4O2",
  "isopropyl alcohol": "C3H8O",
  "ammonium oxalate": "(NH4)2C2O4",
  "EDTA": "C10H16N2O8",
  "methylene blue": "C16H18ClN3S",
  "rhodamine B": "C28H31ClN2O3",
};

/**
 * 从参数文本中提取可查询 NIST 的化合物
 */
export function extractNISTQueries(paramText: string): Array<{ type: "formula" | "name"; value: string }> {
  const queries: Array<{ type: "formula" | "name"; value: string }> = [];
  const seen = new Set<string>();

  // 1. 提取化学式（简单模式：大写开头+数字的元素组合）
  const formulaPattern = /[A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)+/g;
  const formulas = paramText.match(formulaPattern) ?? [];
  for (const f of formulas) {
    if (f.length >= 2 && f.length <= 30 && !seen.has(f)) {
      seen.add(f);
      queries.push({ type: "formula", value: f });
    }
  }

  // 2. 匹配常见化合物俗名
  for (const [name, formula] of Object.entries(COMPOUND_NAME_MAP)) {
    if (paramText.toLowerCase().includes(name.toLowerCase()) && !seen.has(name)) {
      seen.add(name);
      queries.push({ type: "name", value: name });
    }
  }

  // 限制最多 5 个查询
  return queries.slice(0, 5);
}

// ═══════════════════════════════════════════════════════
// 查询 + 缓存
// ═══════════════════════════════════════════════════════

const sessionCache = new Map<string, NISTCompoundResult[]>();

/**
 * 查询 NIST Chemistry WebBook
 * @returns 按查询 key 分组的 Map
 */
export async function queryNIST(
  queries: Array<{ type: "formula" | "name"; value: string }>,
): Promise<Map<string, NISTCompoundResult[]>> {
  const resultMap = new Map<string, NISTCompoundResult[]>();

  // 过滤缓存的查询
  const uncached = queries.filter((q) => !sessionCache.has(q.value));

  // 缓存命中
  for (const q of queries) {
    const cached = sessionCache.get(q.value);
    if (cached) resultMap.set(q.value, cached);
  }

  if (uncached.length === 0) return resultMap;

  // 调用 server function
  try {
    const { searchNIST } = await import("./api/nist.functions");
    const response = await searchNIST({ data: { queries: uncached } });
    const results: NISTCompoundResult[] = response?.results ?? [];

    // 按查询值分组
    for (const r of results) {
      // 尝试匹配到原始查询
      for (const q of uncached) {
        if (r.formula?.includes(q.value) || r.name?.toLowerCase()?.includes(q.value?.toLowerCase())) {
          if (!resultMap.has(q.value)) resultMap.set(q.value, []);
          resultMap.get(q.value)!.push(r);
          if (!sessionCache.has(q.value)) sessionCache.set(q.value, []);
          sessionCache.get(q.value)!.push(r);
          break;
        }
      }
    }

    // 标记无结果的查询
    for (const q of uncached) {
      if (!resultMap.has(q.value)) {
        sessionCache.set(q.value, []);
        resultMap.set(q.value, []);
      }
    }
  } catch (err) {
    console.warn("[NIST] query failed:", err);
  }

  return resultMap;
}

/**
 * 获取 NIST 结果的自然语言摘要
 */
export function summarizeNISTResult(r: NISTCompoundResult): string {
  const parts: string[] = [];
  parts.push(`NIST: ${r.name || r.formula || "unknown"}`);

  if (r.molecularWeight !== null) {
    parts.push(`分子量 ${r.molecularWeight.toFixed(1)} g/mol`);
  }
  if (r.enthalpyOfFormation !== null) {
    parts.push(`ΔHf° ${r.enthalpyOfFormation.toFixed(1)} kJ/mol`);
  }
  if (r.entropy !== null) {
    parts.push(`S° ${r.entropy.toFixed(1)} J/mol·K`);
  }
  if (r.heatCapacity !== null) {
    parts.push(`Cp ${r.heatCapacity.toFixed(1)} J/mol·K`);
  }
  if (r.boilingPoint !== null) {
    parts.push(`沸点 ${r.boilingPoint.toFixed(0)} K`);
  }
  if (r.casNumber) {
    parts.push(`CAS: ${r.casNumber}`);
  }

  return parts.join("; ");
}

/**
 * 清除会话缓存
 */
export function clearNISTCache(): void {
  sessionCache.clear();
}
