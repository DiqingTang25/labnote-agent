/**
 * Materials Project Client — 客户端封装
 *
 * 提供化学公式提取 + API 查询 + 结果缓存。
 * 作为 domain-knowledge.ts 的外部数据源补充。
 */
import type { MPMaterialResult } from "./api/materials-project.functions";

// ═══════════════════════════════════════════════════════
// 化学公式提取
// ═══════════════════════════════════════════════════════

/**
 * 常见化学元素符号（用于公式识别）
 * 覆盖材料科学/无机化学中的所有稳定元素
 */
const ELEMENT_SYMBOLS = new Set([
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
  "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
  "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
  "Ga", "Ge", "As", "Se", "Br", "Kr",
  "Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd",
  "In", "Sn", "Sb", "Te", "I", "Xe",
  "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy",
  "Ho", "Er", "Tm", "Yb", "Lu",
  "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg",
  "Tl", "Pb", "Bi", "Po", "At", "Rn",
  "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm",
]);

/** 化学式正则：元素符号+可选数字，可含括号和点分隔 */
const FORMULA_REGEX =
  /(?:[A-Z][a-z]?\d*(?:\.[0-9]+)?)+(?:\s*[•·\-/]\s*(?:[A-Z][a-z]?\d*(?:\.[0-9]+)?)+)*/g;

/** 非材料关键词 — 匹配到这些不算化学式 */
const NON_MATERIAL_KEYWORDS = new Set([
  "DI", "UV", "IR", "FT", "XRD", "SEM", "TEM", "XPS", "BET", "DLS",
  "PL", "DRS", "FE", "HR", "EDS", "SAED", "AFM", "STM",
  "MB", "RhB", "BQ", "AO", "IPA", "EDTA", "DMSO", "PBS", "HEPES",
  "Tris", "SDS", "PAGE", "PCR", "ELISA", "FBS", "DMEM",
  "pH", "mV", "nm", "μm", "mm", "cm", "eV", "keV", "MeV",
]);

/**
 * 从文本中提取可能的化学式
 * 返回去重后的化学式列表，排除非材料关键词
 */
export function extractChemicalFormulas(text: string): string[] {
  const allMatches = text.match(FORMULA_REGEX) ?? [];
  const seen = new Set<string>();
  const formulas: string[] = [];

  for (const match of allMatches) {
    const cleaned = match.trim();
    if (cleaned.length < 2) continue;
    if (cleaned.length > 80) continue; // 太长的不是化学式
    if (NON_MATERIAL_KEYWORDS.has(cleaned)) continue;

    // 必须包含至少一个大写元素符号
    const hasElement = /[A-Z][a-z]?/.test(cleaned);
    if (!hasElement) continue;

    // 标准化分隔符
    const normalized = cleaned
      .replace(/\s*[•·]\s*/g, "-") // 中点 → 连字符
      .replace(/\s*\/\s*/g, "-")   // 斜杠 → 连字符
      .trim();

    if (!seen.has(normalized)) {
      seen.add(normalized);
      formulas.push(normalized);
    }
  }

  return formulas;
}

// ═══════════════════════════════════════════════════════
// API 查询 + 缓存
// ═══════════════════════════════════════════════════════

/** 会话级缓存 — 同一次页面访问中相同公式不重复查询 */
const sessionCache = new Map<string, MPMaterialResult[]>();

/**
 * 批量查询 Materials Project 数据库
 *
 * @param formulas 化学式数组
 * @returns 按 formula 分组的查询结果 Map<formula, results[]>
 */
export async function queryMaterialsProject(
  formulas: string[],
): Promise<Map<string, MPMaterialResult[]>> {
  const resultMap = new Map<string, MPMaterialResult[]>();

  // 过滤已在缓存中的公式
  const uncached = formulas.filter((f) => !sessionCache.has(f));

  // 缓存命中
  for (const formula of formulas) {
    const cached = sessionCache.get(formula);
    if (cached) {
      resultMap.set(formula, cached);
    }
  }

  if (uncached.length === 0) return resultMap;

  // 调用 server function 查询未缓存公式
  try {
    const { searchMaterialsProject } = await import(
      "./api/materials-project.functions"
    );
    const response = await searchMaterialsProject({
      data: { formulas: uncached },
    });
    const results: MPMaterialResult[] = response?.results ?? [];

    // 按 formula 分组
    for (const r of results) {
      const key = r.formula;
      if (!resultMap.has(key)) resultMap.set(key, []);
      resultMap.get(key)!.push(r);

      // 也以查询公式为 key 缓存一份
      if (!sessionCache.has(r.formula)) {
        sessionCache.set(r.formula, []);
      }
      sessionCache.get(r.formula)!.push(r);
    }

    // 标记已查询但无结果的公式（避免重复请求）
    for (const f of uncached) {
      if (!resultMap.has(f)) {
        sessionCache.set(f, []);
      }
    }
  } catch (err) {
    console.warn("[MaterialsProject] query failed:", err);
  }

  return resultMap;
}

/**
 * 获取材料的自然语言摘要（用于注入参数 inferenceRationale）
 */
export function summarizeMPResult(r: MPMaterialResult): string {
  const parts: string[] = [];
  parts.push(`Materials Project (ID: ${r.materialId})`);

  if (r.bandGap !== null) {
    parts.push(`带隙 ${r.bandGap.toFixed(2)} eV`);
  }
  if (r.formationEnergyPerAtom !== null) {
    parts.push(
      `形成能 ${r.formationEnergyPerAtom.toFixed(3)} eV/atom`,
    );
  }
  if (r.crystalSystem) {
    parts.push(
      `晶系: ${r.crystalSystem} (${r.spacegroupSymbol ?? "N/A"})`,
    );
  }
  if (r.density !== null) {
    parts.push(`密度 ${r.density.toFixed(2)} g/cm³`);
  }
  parts.push(r.isStable ? "热力学稳定" : "亚稳态");

  return parts.join("; ");
}

/**
 * 清除缓存（页面切换时可调用）
 */
export function clearMPCache(): void {
  sessionCache.clear();
}
