/**
 * Data Sanitizer — 类型定义
 *
 * LabNote 数据脱敏系统的核心类型。
 * 三层架构：检测 → 脱敏 → 审计
 */

/** 敏感信息类别 */
export type SensitivityCategory =
  | "pii"           // 个人身份信息 (姓名、邮箱、电话、身份证)
  | "phi"           // 受保护健康信息 (年龄+疾病组合)
  | "contact"       // 联系方式 (邮箱、电话)
  | "institution"   // 机构信息 (医院、大学、公司)
  | "location"      // 精确地理位置
  | "compound"      // 专利/未发表化合物
  | "date"          // 精确日期
  | "credential";   // 凭证信息 (token, key, password)

/** 风险等级 */
export type RiskLevel = "high" | "medium" | "low";

/** 单个敏感信息匹配结果 */
export type SensitivityMatch = {
  /** 匹配到的文本 */
  matched: string;
  /** 敏感信息类别 */
  category: SensitivityCategory;
  /** 风险等级 */
  risk: RiskLevel;
  /** 在原文中的起始位置 */
  startIndex: number;
  /** 在原文中的结束位置 */
  endIndex: number;
  /** 人类可读的说明 */
  label: string;
  /** 推荐的替换值 */
  replacement: string;
};

/** 扫描结果 */
export type ScanResult = {
  /** 是否发现敏感信息 */
  hasSensitive: boolean;
  /** 匹配到的所有敏感信息 */
  matches: SensitivityMatch[];
  /** 风险摘要 */
  summary: string;
  /** 高风险匹配数 */
  highRiskCount: number;
  /** 中风险匹配数 */
  mediumRiskCount: number;
};

/** 脱敏策略 */
export type SanitizeStrategy =
  | "mask"       // 完全掩码 → "[已脱敏]"
  | "generalize" // 泛化 → "55-60岁", "三甲医院"
  | "redact"     // 删除 → ""
  | "blur"       // 模糊化 → 降低精度
  | "placeholder"; // 占位符 → "操作员A"

/** 脱敏选项 */
export type SanitizeOptions = {
  /** 是否脱敏 PII */
  sanitizePII: boolean;
  /** 是否脱敏 PHI */
  sanitizePHI: boolean;
  /** 是否脱敏机构信息 */
  sanitizeInstitution: boolean;
  /** 是否脱敏地理位置 */
  sanitizeLocation: boolean;
  /** 是否脱敏化合物 */
  sanitizeCompound: boolean;
  /** 是否脱敏日期 */
  sanitizeDate: boolean;
  /** 用户确认级别 */
  confirmationLevel: "auto" | "prompt" | "strict";
};

/** 默认脱敏选项 */
export const DEFAULT_SANITIZE_OPTIONS: SanitizeOptions = {
  sanitizePII: true,
  sanitizePHI: true,
  sanitizeInstitution: true,
  sanitizeLocation: true,
  sanitizeCompound: false,
  sanitizeDate: false,
  confirmationLevel: "prompt",
};

/** 脱敏后结果 */
export type SanitizeResult = {
  /** 脱敏后的文本 */
  sanitized: string;
  /** 应用的脱敏次数 */
  appliedCount: number;
  /** 各策略应用次数 */
  strategyBreakdown: Record<SanitizeStrategy, number>;
  /** 是否仍有未脱敏的高风险项（用户选择跳过的） */
  hasRemainingHighRisk: boolean;
};

/** 审计日志条目 */
export type AuditLogEntry = {
  /** 日志 ID */
  id: string;
  /** 时间戳 */
  timestamp: string;
  /** 数据类型 */
  dataType: "paper" | "experiment" | "file" | "csv" | "transcript";
  /** 目标 API */
  targetApi: string;
  /** 模型名称 */
  model: string;
  /** 是否经过脱敏 */
  sanitized: boolean;
  /** 脱敏策略（如脱敏） */
  sanitizeStrategies?: SanitizeStrategy[];
  /** 原始内容哈希 (SHA-256，不存原文) */
  contentHash: string;
  /** 原始内容长度 */
  contentLength: number;
  /** 敏感项检测数 */
  sensitivityMatchCount: number;
  /** 用户确认方式 */
  userConfirmation: "auto_sanitized" | "manual_approve" | "skipped" | "none_needed";
  /** 用户 ID */
  userId?: string;
};
