/**
 * FolderWatcherPanel — 文件夹监听面板组件
 *
 * 放置在 workbench 页面的左栏中，显示监听状态、检测到的文件列表。
 * 支持：选择文件夹、开始/停止监听、查看新文件、一键生成实验卡片。
 */
import { useState } from "react";
import { FolderOpen, Play, Square, FileText, Loader2, AlertCircle, CheckCircle2, Hash, HardDrive } from "lucide-react";
import type { WatchedFileInfo } from "./useElectron";

// ---- 组件 Props ----

export interface FolderWatcherPanelProps {
  /** 是否在 Electron 环境中 */
  isElectron: boolean;
  /** 当前监听状态 */
  watching: boolean;
  /** 当前监听的文件夹路径 */
  folderPath: string;
  /** 最近检测到的文件 */
  recentFiles: WatchedFileInfo[];
  /** 选择文件夹并开始监听 */
  onSelectFolder: () => void;
  /** 停止监听 */
  onStopWatch: () => void;
  /** 用户点击"生成实验卡片"时触发 */
  onGenerateCard?: (file: WatchedFileInfo) => void;
}

// ---- 组件 ----

export function FolderWatcherPanel({
  isElectron,
  watching,
  folderPath,
  recentFiles,
  onSelectFolder,
  onStopWatch,
  onGenerateCard,
}: FolderWatcherPanelProps) {
  const [expanded, setExpanded] = useState(false);

  // 浏览器环境降级提示
  if (!isElectron) {
    return (
      <div className="card-soft p-4 border-dashed">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
          <FolderOpen size={15} />
          文件夹监听
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          请在 LabNote Agent 桌面应用中启动此功能。
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/70">
          终端执行：<code className="rounded bg-secondary px-1">cd ~/labnote-electron && bun start</code>
        </p>
      </div>
    );
  }

  return (
    <div className="card-soft p-4 space-y-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span
            className={`flex h-2 w-2 rounded-full ${
              watching ? "bg-[color:var(--color-success)] animate-pulse" : "bg-muted-foreground"
            }`}
          />
          <FolderOpen size={15} />
          文件夹监听
        </h3>
        {watching && (
          <span className="text-[10px] rounded-full bg-[color:var(--color-success)]/10 text-[color:var(--color-success)] px-2 py-0.5">
            运行中
          </span>
        )}
      </div>

      {/* 监听路径 */}
      {watching && folderPath ? (
        <div className="rounded-lg bg-secondary/60 p-2.5 text-xs">
          <div className="text-muted-foreground">监听目录</div>
          <div className="mt-0.5 font-mono text-[11px] truncate" title={folderPath}>
            {folderPath}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">尚未选择监听文件夹</p>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        {!watching ? (
          <button
            onClick={onSelectFolder}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground hover:bg-primary/90 transition"
          >
            <Play size={13} />
            选择并监听
          </button>
        ) : (
          <button
            onClick={onStopWatch}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive hover:bg-destructive/20 transition"
          >
            <Square size={13} />
            停止监听
          </button>
        )}
        {watching && (
          <button
            onClick={onSelectFolder}
            className="rounded-lg border border-border px-3 py-2 text-xs hover:border-primary/40 transition"
            title="切换到其他文件夹"
          >
            <FolderOpen size={13} />
          </button>
        )}
      </div>

      {/* 最近检测到的文件 */}
      {recentFiles.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition"
          >
            <span className="flex items-center gap-1.5">
              <FileText size={12} />
              检测到 {recentFiles.length} 个新文件
            </span>
            <span className="text-[10px]">{expanded ? "收起" : "展开"}</span>
          </button>

          {expanded && (
            <ul className="mt-2 space-y-1.5 max-h-64 overflow-auto">
              {recentFiles.map((file, i) => (
                <FileEntry
                  key={file.path + file.detectedAt}
                  file={file}
                  onGenerateCard={onGenerateCard ? () => onGenerateCard(file) : undefined}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ---- 单个文件条目 ----

function FileEntry({
  file,
  onGenerateCard,
}: {
  file: WatchedFileInfo;
  onGenerateCard?: () => void;
}) {
  const extColors: Record<string, string> = {
    ".pdf": "bg-red-100 text-red-700",
    ".docx": "bg-blue-100 text-blue-700",
    ".doc": "bg-blue-100 text-blue-700",
    ".xlsx": "bg-green-100 text-green-700",
    ".xls": "bg-green-100 text-green-700",
    ".csv": "bg-green-100 text-green-700",
    ".jpg": "bg-purple-100 text-purple-700",
    ".jpeg": "bg-purple-100 text-purple-700",
    ".png": "bg-purple-100 text-purple-700",
    ".txt": "bg-gray-100 text-gray-700",
    ".log": "bg-gray-100 text-gray-700",
    ".json": "bg-amber-100 text-amber-700",
  };

  const extBadge = extColors[file.ext] ?? "bg-secondary text-muted-foreground";

  return (
    <li className="rounded-lg border border-border bg-card p-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{file.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className={`rounded px-1 py-0.5 ${extBadge}`}>{file.ext}</span>
            <span>{(file.size / 1024).toFixed(1)} KB</span>
            <span className="flex items-center gap-0.5" title={`SHA-256: ${file.hash}`}>
              <Hash size={9} />
              {file.hash.slice(0, 10)}…
            </span>
          </div>
        </div>
        {onGenerateCard && (
          <button
            onClick={onGenerateCard}
            className="shrink-0 rounded-md bg-primary-soft text-primary px-2 py-1 text-[10px] hover:bg-primary/15 transition"
          >
            生成卡片
          </button>
        )}
      </div>
    </li>
  );
}
