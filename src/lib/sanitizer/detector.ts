/**
 * Data Sanitizer — 敏感信息检测引擎
 *
 * 扫描文本中的 PII/PHI/机构/凭证等敏感信息。
 * 返回结构化的 ScanResult 供 UI 层展示和决策。
 */
import type { SensitivityMatch, ScanResult, SanitizeOptions } from "./types";
import { DEFAULT_SANITIZE_OPTIONS } from "./types";
import { ALL_RULES } from "./patterns";

/**
 * 扫描文本中的敏感信息
 *
 * @param text 待扫描文本
 * @param options 脱敏选项（控制扫描范围）
 * @returns 结构化扫描结果
 */
export function scanSensitivity(
  text: string,
  options: Partial<SanitizeOptions> = {},
): ScanResult {
  const opts = { ...DEFAULT_SANITIZE_OPTIONS, ...options };
  const matches: SensitivityMatch[] = [];
  const coveredRanges = new Set<number>();

  // 按优先级依次匹配（高优先级规则先匹配，已覆盖区域不再匹配）
  for (const rule of ALL_RULES) {
    // 根据选项跳过不需要的类别
    if (!isCategoryEnabled(rule.category, opts)) continue;

    // 重置 regex lastIndex
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);

    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;

      // 检查是否与已有匹配重叠（避免重复报告）
      let overlaps = false;
      for (let i = start; i < end; i++) {
        if (coveredRanges.has(i)) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      // 标记覆盖区域
      for (let i = start; i < end; i++) {
        coveredRanges.add(i);
      }

      // 生成替换值（支持函数形式的 replacement）
      const repl = rule.replacement;
      const replacement =
        typeof repl === "function"
          ? repl(...(m.slice(1) as string[]))
          : repl;

      matches.push({
        matched: m[0],
        category: rule.category,
        risk: rule.risk,
        startIndex: start,
        endIndex: end,
        label: rule.label,
        replacement,
      });
    }
  }

  // 按位置排序
  matches.sort((a, b) => a.startIndex - b.startIndex);

  const highRisk = matches.filter((m) => m.risk === "high");
  const mediumRisk = matches.filter((m) => m.risk === "medium");

  return {
    hasSensitive: matches.length > 0,
    matches,
    summary: buildSummary(matches),
    highRiskCount: highRisk.length,
    mediumRiskCount: mediumRisk.length,
  };
}

/**
 * 快速检测（仅返回是否有敏感信息，不返回详细匹配）
 */
export function quickCheck(text: string): boolean {
  for (const rule of ALL_RULES) {
    if (rule.pattern.test(text)) return true;
  }
  return false;
}

/**
 * 检测指定类别的敏感信息
 */
export function scanCategory(
  text: string,
  category: SensitivityMatch["category"],
): SensitivityMatch[] {
  const result = scanSensitivity(text, buildCategoryOnlyOptions(category));
  return result.matches.filter((m) => m.category === category);
}

// ===== helpers =====

function isCategoryEnabled(
  category: string,
  opts: SanitizeOptions,
): boolean {
  switch (category) {
    case "pii":
    case "contact":
    case "credential":
      return opts.sanitizePII;
    case "phi":
      return opts.sanitizePHI;
    case "institution":
      return opts.sanitizeInstitution;
    case "location":
      return opts.sanitizeLocation;
    case "compound":
      return opts.sanitizeCompound;
    case "date":
      return opts.sanitizeDate;
    default:
      return true;
  }
}

function buildCategoryOnlyOptions(cat: string): SanitizeOptions {
  return {
    sanitizePII: cat === "pii" || cat === "contact" || cat === "credential",
    sanitizePHI: cat === "phi",
    sanitizeInstitution: cat === "institution",
    sanitizeLocation: cat === "location",
    sanitizeCompound: cat === "compound",
    sanitizeDate: cat === "date",
    confirmationLevel: "auto",
  };
}

function buildSummary(matches: SensitivityMatch[]): string {
  if (matches.length === 0) return "未检测到敏感信息";

  const high = matches.filter((m) => m.risk === "high").length;
  const med = matches.filter((m) => m.risk === "medium").length;
  const low = matches.filter((m) => m.risk === "low").length;

  const parts: string[] = [];
  if (high > 0) parts.push(`${high} 项高风险`);
  if (med > 0) parts.push(`${med} 项中风险`);
  if (low > 0) parts.push(`${low} 项低风险`);

  const cats = [...new Set(matches.map((m) => m.label))];
  return `检测到 ${matches.length} 项敏感信息（${parts.join("，")}）：${cats.slice(0, 3).join("、")}${cats.length > 3 ? "等" : ""}`;
}
