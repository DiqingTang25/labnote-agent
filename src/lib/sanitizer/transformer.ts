/**
 * Data Sanitizer — 脱敏转换器
 *
 * 将检测到的敏感信息替换为脱敏版本。
 * 支持多种脱敏策略：掩码、泛化、删除、模糊化、占位符。
 */
import type { SensitivityMatch, SanitizeResult, SanitizeStrategy } from "./types";

/**
 * 对文本应用脱敏（基于扫描结果）
 *
 * @param text 原始文本
 * @param matches 检测到的敏感信息（来自 detector.scanSensitivity）
 * @param skipIds 跳过的匹配项索引（用户选择不脱敏的项）
 * @returns 脱敏后的文本 + 统计
 */
export function applySanitization(
  text: string,
  matches: SensitivityMatch[],
  skipIndices: Set<number> = new Set(),
): SanitizeResult {
  if (matches.length === 0) {
    return {
      sanitized: text,
      appliedCount: 0,
      strategyBreakdown: initBreakdown(),
      hasRemainingHighRisk: false,
    };
  }

  // 按位置倒序排列（从后往前替换，保证索引正确）
  const sorted = [...matches]
    .map((m, i) => ({ match: m, idx: i }))
    .sort((a, b) => b.match.startIndex - a.match.startIndex);

  let result = text;
  let applied = 0;
  const breakdown = initBreakdown();
  let remainingHighRisk = false;

  for (const { match, idx } of sorted) {
    const before = result.slice(0, match.startIndex);
    const after = result.slice(match.endIndex);

    if (skipIndices.has(idx)) {
      // 用户选择跳过 — 保持原样
      if (match.risk === "high") remainingHighRisk = true;
      result = before + match.matched + after;
    } else {
      // 应用脱敏
      result = before + match.replacement + after;
      applied++;
      const strategy = getStrategy(match);
      breakdown[strategy]++;
    }
  }

  return {
    sanitized: result,
    appliedCount: applied,
    strategyBreakdown: breakdown,
    hasRemainingHighRisk: remainingHighRisk,
  };
}

/**
 * 仅对高风险项脱敏（保留低风险项）
 */
export function sanitizeHighRiskOnly(
  text: string,
  matches: SensitivityMatch[],
): SanitizeResult {
  const skipIndices = new Set<number>();
  matches.forEach((m, i) => {
    if (m.risk !== "high") skipIndices.add(i);
  });
  return applySanitization(text, matches, skipIndices);
}

/**
 * 严格模式 — 脱敏全部匹配项
 */
export function sanitizeAll(
  text: string,
  matches: SensitivityMatch[],
): SanitizeResult {
  return applySanitization(text, matches, new Set());
}

/**
 * 获取脱敏策略
 */
function getStrategy(match: SensitivityMatch): SanitizeStrategy {
  if (match.replacement === "") return "redact";
  if (match.replacement.startsWith("[") && match.replacement.endsWith("已脱敏]"))
    return "mask";
  if (match.replacement.includes("操作员") || match.replacement.includes("姓名"))
    return "placeholder";
  if (
    match.category === "location" &&
    /^\d+\.\d+/.test(match.replacement)
  )
    return "blur";
  return "generalize";
}

function initBreakdown(): Record<SanitizeStrategy, number> {
  return { mask: 0, generalize: 0, redact: 0, blur: 0, placeholder: 0 };
}

/**
 * 生成脱敏前后的对比摘要（用于 UI 展示）
 */
export function generateDiffSummary(
  original: string,
  sanitized: string,
  matches: SensitivityMatch[],
): string {
  const lines: string[] = [];
  lines.push(`脱敏前: ${original.length} 字符`);
  lines.push(`脱敏后: ${sanitized.length} 字符`);
  lines.push(`已处理 ${matches.length} 项敏感信息`);
  lines.push("");

  for (const m of matches) {
    const ctx = original.slice(
      Math.max(0, m.startIndex - 15),
      Math.min(original.length, m.endIndex + 15),
    );
    lines.push(
      `  [${m.risk.toUpperCase()}] ${m.label}: "${ctx.trim()}" → "${m.replacement}"`,
    );
  }

  return lines.join("\n");
}
