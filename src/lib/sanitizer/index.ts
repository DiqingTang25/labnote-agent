/**
 * Data Sanitizer — 统一导出
 *
 * 使用方式：
 * ```
 * import { scanSensitivity, applySanitization, createAuditEntry } from "../lib/sanitizer";
 *
 * const scan = scanSensitivity(text);
 * if (scan.hasSensitive) {
 *   // 展示给用户确认...
 *   const result = applySanitization(text, scan.matches);
 *   const audit = await createAuditEntry({ ... });
 * }
 * ```
 */
export { scanSensitivity, quickCheck, scanCategory } from "./detector";
export { applySanitization, sanitizeHighRiskOnly, sanitizeAll, generateDiffSummary } from "./transformer";
export { createAuditEntry, persistAuditEntry, queryAuditLogs, saveAuditToLocal, loadAuditFromLocal } from "./audit-log";
export { ALL_RULES, getRulesByCategory, getRulesByRisk } from "./patterns";
export type { DetectionRule } from "./patterns";
export type {
  SensitivityCategory,
  SensitivityMatch,
  ScanResult,
  SanitizeOptions,
  SanitizeResult,
  SanitizeStrategy,
  AuditLogEntry,
  RiskLevel,
} from "./types";
export { DEFAULT_SANITIZE_OPTIONS } from "./types";
