/**
 * API 用量仪表盘 — 展示 AI API 调用统计和费用估算
 *
 * 数据来源：sanitizer audit log (localStorage + Supabase)
 */
import { useState, useEffect, useMemo, type ComponentType } from "react";
import { BarChart3, TrendingUp, Zap, Clock, DollarSign, Activity, FileText, Image, Video, Music, Microscope, Folder, Mic, CheckCircle2 } from "lucide-react";
import { loadAuditFromLocal, queryAuditLogs } from "../lib/sanitizer/audit-log";
import type { AuditLogEntry } from "../lib/sanitizer";

/** AI 模型定价 (USD/1M tokens) — 通过 XJTLU AI Gateway */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "d8j2d4r9dhtg6s3fevfg": { input: 0.55, output: 2.19 },
  "d95koqj7u3anoctav5sg": { input: 0.40, output: 1.20 },
  "d8efv05lt96sitl7kjcg": { input: 0.20, output: 0 },
  "d8egv6v9ohgtar18hvrg": { input: 0.10, output: 0 },
  "default": { input: 0.55, output: 2.19 },
};

/** 数据类型图标映射 */
const DATA_TYPE_ICONS: Record<string, string> = {
  paper: "FileText", experiment: "Microscope", file: "Folder", csv: "BarChart3", transcript: "Mic",
};

/** 数据类型中文标签 */
const DATA_TYPE_LABELS: Record<string, string> = {
  paper: "论文", experiment: "实验", file: "文件", csv: "表格", transcript: "语音",
};

const DATA_TYPE_ICON_COMPONENTS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  FileText, Microscope, Folder, BarChart3, Mic,
};

/** 估算 token 数（中文: ~0.5 token/char, 英文: ~0.3 token/char） */
function estimateTokens(textLength: number, isChinese: boolean = true): number {
  return Math.round(textLength * (isChinese ? 0.5 : 0.3));
}

/** 聚合统计 */
type UsageStats = {
  totalCalls: number;
  totalInputEstimate: number;
  totalCostEstimate: number;
  sanitizedCalls: number;
  callsByModel: Record<string, number>;
  callsByType: Record<string, number>;
  dailyCalls: { date: string; count: number }[];
  recentLogs: AuditLogEntry[];
};

export function UsageDashboard() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    // 尝试从 Supabase 加载，fallback 到 localStorage
    let logs: AuditLogEntry[] = [];
    try {
      logs = await queryAuditLogs({ limit: 500 });
    } catch {
      logs = loadAuditFromLocal();
    }
    setStats(computeStats(logs));
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats || stats.totalCalls === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        <Activity size={24} className="mx-auto mb-2 text-muted-foreground/50" />
        暂无 API 调用记录。完成一次 AI 拆解或文件解析后，数据将显示在这里。
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      {/* 总览卡片 */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          icon={<Zap size={16} className="text-amber-500" />}
          label="总调用次数"
          value={stats.totalCalls.toString()}
          detail={`${stats.sanitizedCalls} 次经脱敏`}
        />
        <StatCard
          icon={<BarChart3 size={16} className="text-blue-500" />}
          label="估算 Token 数"
          value={formatTokens(stats.totalInputEstimate)}
          detail={`约 ${(stats.totalInputEstimate / 1000).toFixed(0)}K tokens`}
        />
        <StatCard
          icon={<DollarSign size={16} className="text-green-500" />}
          label="估算费用"
          value={`¥${(stats.totalCostEstimate * 7.2).toFixed(2)}`}
          detail={`≈ $${stats.totalCostEstimate.toFixed(4)}`}
        />
        <StatCard
          icon={<Clock size={16} className="text-purple-500" />}
          label="最近调用"
          value={stats.recentLogs[0]?.dataType ? (DATA_TYPE_LABELS[stats.recentLogs[0].dataType] ?? "其他") : "—"}
          detail={stats.recentLogs[0] ? formatTime(stats.recentLogs[0].timestamp) : "无"}
        />
      </div>

      {/* 模型分布 */}
      <div className="rounded-lg border border-border p-3">
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground">按模型分布</h4>
        <div className="space-y-1.5">
          {Object.entries(stats.callsByModel).map(([model, count]) => (
            <div key={model} className="flex items-center gap-2 text-xs">
              <span className="flex-1 truncate text-muted-foreground">{model.split("/").pop()}</span>
              <span className="font-mono tabular-nums">{count}</span>
              <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(count / stats.totalCalls) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 数据类型分布 */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(stats.callsByType).map(([type, count]) => (
          <span key={type} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px]">
            {(() => { const Icon = DATA_TYPE_ICON_COMPONENTS[DATA_TYPE_ICONS[type]] ?? FileText; return <Icon size={11} />; })()} {type === "paper" ? "论文" : type === "experiment" ? "实验" : type === "file" ? "文件" : type === "csv" ? "CSV" : type === "transcript" ? "转录" : type}
            <span className="font-mono ml-0.5">{count}</span>
          </span>
        ))}
      </div>

      {/* 最近调用 */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition">
          最近 10 次调用记录
        </summary>
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          {stats.recentLogs.slice(0, 10).map((log) => (
            <div key={log.id} className="flex items-center gap-2 py-1 border-b border-border/50 text-[11px]">
              <span className="w-5 text-muted-foreground">
                {(() => { const Icon = DATA_TYPE_ICON_COMPONENTS[DATA_TYPE_ICONS[log.dataType]] ?? FileText; return <Icon size={12} />; })()}
              </span>
              <span className="flex-1 truncate text-muted-foreground">{DATA_TYPE_LABELS[log.dataType] ?? "其他"}</span>
              <span className={log.sanitized ? "text-green-600" : "text-muted-foreground"}>
                {log.sanitized ? <CheckCircle2 size={12} /> : "—"}
              </span>
              <span className="text-muted-foreground/70 w-16 text-right">{formatTime(log.timestamp)}</span>
            </div>
          ))}
        </div>
      </details>

      {/* 刷新 */}
      <button
        onClick={loadStats}
        className="text-[11px] text-muted-foreground hover:text-foreground transition flex items-center gap-1"
      >
        <TrendingUp size={11} /> 刷新数据
      </button>
    </div>
  );
}

function StatCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-[9px] text-muted-foreground/70">{detail}</div>
    </div>
  );
}

function computeStats(logs: AuditLogEntry[]): UsageStats {
  const totalCalls = logs.length;
  const callsByModel: Record<string, number> = {};
  const callsByType: Record<string, number> = {};
  const dailyMap: Record<string, number> = {};
  let totalInputEstimate = 0;
  let totalCostEstimate = 0;
  let sanitizedCalls = 0;

  for (const log of logs) {
    callsByModel[log.model] = (callsByModel[log.model] ?? 0) + 1;
    callsByType[log.dataType] = (callsByType[log.dataType] ?? 0) + 1;
    if (log.sanitized) sanitizedCalls++;

    const day = log.timestamp.slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + 1;

    const tokenEstimate = estimateTokens(log.contentLength);
    totalInputEstimate += tokenEstimate;

    const pricing = MODEL_PRICING[log.model] ?? MODEL_PRICING["default"];
    totalCostEstimate += (tokenEstimate / 1_000_000) * pricing.input;
  }

  const dailyCalls = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14); // 最近14天

  return {
    totalCalls,
    totalInputEstimate,
    totalCostEstimate,
    sanitizedCalls,
    callsByModel,
    callsByType,
    dailyCalls,
    recentLogs: logs.slice(0, 30),
  };
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
