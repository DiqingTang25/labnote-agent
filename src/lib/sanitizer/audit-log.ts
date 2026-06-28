/**
 * Data Sanitizer — 审计日志
 *
 * 记录每次向外部 API 发送数据时的脱敏决策和元数据。
 * 不存储原始内容，仅存储 SHA-256 哈希用于追溯。
 */
import type { AuditLogEntry, SanitizeStrategy } from "./types";

/**
 * 生成内容哈希 (SHA-256)
 * 使用 Web Crypto API (浏览器) 或 Node.js crypto
 */
async function sha256(text: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    // 浏览器环境
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Node.js / 服务端环境
  try {
    const { createHash } = await import("node:crypto");
    return createHash("sha256").update(text, "utf-8").digest("hex");
  } catch {
    // 降级：简单哈希
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const chr = text.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }
}

/**
 * 创建审计日志条目
 */
export async function createAuditEntry(params: {
  dataType: AuditLogEntry["dataType"];
  targetApi: string;
  model: string;
  content: string;
  sanitized: boolean;
  sanitizeStrategies?: SanitizeStrategy[];
  sensitivityMatchCount: number;
  userConfirmation: AuditLogEntry["userConfirmation"];
  userId?: string;
}): Promise<AuditLogEntry> {
  const contentHash = await sha256(params.content);

  return {
    id: `alog_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    dataType: params.dataType,
    targetApi: params.targetApi,
    model: params.model,
    sanitized: params.sanitized,
    sanitizeStrategies: params.sanitizeStrategies,
    contentHash,
    contentLength: params.content.length,
    sensitivityMatchCount: params.sensitivityMatchCount,
    userConfirmation: params.userConfirmation,
    userId: params.userId,
  };
}

/**
 * 将审计日志保存到 localStorage（客户端 fallback）
 */
export function saveAuditToLocal(audit: AuditLogEntry): void {
  try {
    const key = "labnote_api_audit_log";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push(audit);
    // 只保留最近 500 条
    if (existing.length > 500) {
      existing.splice(0, existing.length - 500);
    }
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {
    // localStorage 不可用则跳过
  }
}

/**
 * 从 localStorage 读取审计日志
 */
export function loadAuditFromLocal(): AuditLogEntry[] {
  try {
    const key = "labnote_api_audit_log";
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

/**
 * 将审计日志保存到 Supabase（服务端/已登录用户）
 */
export async function saveAuditToSupabase(
  audit: AuditLogEntry,
): Promise<boolean> {
  try {
    const { supabase, isSupabaseReady } = await import("../supabase");
    if (!isSupabaseReady()) return false;

    const { error } = await supabase.from("api_send_logs").insert({
      id: audit.id,
      timestamp: audit.timestamp,
      data_type: audit.dataType,
      target_api: audit.targetApi,
      model: audit.model,
      sanitized: audit.sanitized,
      sanitize_strategies: audit.sanitizeStrategies ?? [],
      content_hash: audit.contentHash,
      content_length: audit.contentLength,
      sensitivity_match_count: audit.sensitivityMatchCount,
      user_confirmation: audit.userConfirmation,
      user_id: audit.userId,
    });

    if (error) {
      console.warn("[AuditLog] Supabase save error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[AuditLog] Save failed:", err);
    return false;
  }
}

/**
 * 保存审计日志（自动选择最佳存储方式）
 */
export async function persistAuditEntry(audit: AuditLogEntry): Promise<void> {
  // 始终保存到 localStorage
  saveAuditToLocal(audit);

  // 尝试保存到 Supabase
  await saveAuditToSupabase(audit);
}

/**
 * 查询审计日志（按时间倒序）
 */
export async function queryAuditLogs(params?: {
  dataType?: AuditLogEntry["dataType"];
  userId?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  try {
    const { supabase, isSupabaseReady } = await import("../supabase");
    if (!isSupabaseReady()) return loadAuditFromLocal();

    let query = supabase
      .from("api_send_logs")
      .select("*")
      .order("timestamp", { ascending: false });

    if (params?.dataType) {
      query = query.eq("data_type", params.dataType);
    }
    if (params?.userId) {
      query = query.eq("user_id", params.userId);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) return loadAuditFromLocal();

    return (data as Record<string, unknown>[]).map(mapRowToEntry);
  } catch {
    return loadAuditFromLocal();
  }
}

function mapRowToEntry(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row.id as string,
    timestamp: row.timestamp as string,
    dataType: row.data_type as AuditLogEntry["dataType"],
    targetApi: row.target_api as string,
    model: row.model as string,
    sanitized: Boolean(row.sanitized),
    sanitizeStrategies: (row.sanitize_strategies as SanitizeStrategy[]) ?? [],
    contentHash: row.content_hash as string,
    contentLength: row.content_length as number,
    sensitivityMatchCount: row.sensitivity_match_count as number,
    userConfirmation: row.user_confirmation as AuditLogEntry["userConfirmation"],
    userId: row.user_id as string | undefined,
  };
}
