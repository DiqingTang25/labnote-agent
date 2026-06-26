/**
 * useElectron — React hook 封装 window.labnote API
 *
 * 在 Electron 环境中调用真实 API，在浏览器中自动降级为 mock。
 * 用法：
 *   const { watchStatus, selectFolder, startWatch, stopWatch, onNewFile } = useElectron();
 */
import { useState, useEffect, useCallback, useRef } from "react";

// ---- 类型（与 preload.ts 保持一致）----

export interface WatchedFileInfo {
  path: string;
  name: string;
  ext: string;
  size: number;
  mtime: string;
  hash: string;
  detectedAt: string;
  readyAt: string;
}

export interface WatchStatus {
  watching: boolean;
  folderPath: string;
}

export interface LabnoteAPI {
  selectFolder: () => Promise<string | null>;
  startWatch: (folderPath: string) => Promise<void>;
  stopWatch: () => Promise<void>;
  getWatchedFolder: () => Promise<string | null>;
  getWatchStatus: () => Promise<WatchStatus>;
  onFileReady: (callback: (file: WatchedFileInfo) => void) => () => void;
  onFileDetected: (callback: (filePath: string) => void) => () => void;
  onWatchError: (callback: (errorMsg: string) => void) => () => void;
  onWatchStatusChange: (callback: (status: WatchStatus) => void) => () => void;
}

// ---- 环境检测 ----

export function isElectron(): boolean {
  return typeof window !== "undefined" && !!(window as any).labnote;
}

function getAPI(): LabnoteAPI | null {
  if (typeof window === "undefined") return null;
  return (window as any).labnote ?? null;
}

// ---- Hook ----

export function useElectron() {
  const api = getAPI();
  const [watchStatus, setWatchStatus] = useState<WatchStatus>({
    watching: false,
    folderPath: "",
  });
  // 最新检测到的文件列表
  const [recentFiles, setRecentFiles] = useState<WatchedFileInfo[]>([]);

  // 注册事件监听
  useEffect(() => {
    if (!api) {
      // 浏览器环境：假装在监听（mock）
      return;
    }

    // 初始化时获取当前状态
    api.getWatchStatus().then((status) => {
      setWatchStatus(status);
    }).catch(() => {});

    // 监听文件就绪
    const unsubReady = api.onFileReady((file) => {
      setRecentFiles((prev) => [file, ...prev].slice(0, 50));
    });

    // 监听文件检测
    const unsubDetected = api.onFileDetected((filePath) => {
      console.log("[useElectron] 检测到新文件:", filePath);
    });

    // 监听错误
    const unsubError = api.onWatchError((errorMsg) => {
      console.error("[useElectron] 监听错误:", errorMsg);
    });

    // 监听状态变化
    const unsubStatus = api.onWatchStatusChange((status) => {
      setWatchStatus(status);
    });

    return () => {
      unsubReady();
      unsubDetected();
      unsubError();
      unsubStatus();
    };
  }, [api]);

  // 选择文件夹
  const selectFolder = useCallback(async (): Promise<string | null> => {
    if (!api) {
      alert("文件夹选择功能仅在 LabNote Agent 桌面应用中可用。\n请启动 Electron 客户端。");
      return null;
    }
    return api.selectFolder();
  }, [api]);

  // 开始监听
  const startWatch = useCallback(async (folderPath: string) => {
    if (!api) return;
    await api.startWatch(folderPath);
    setWatchStatus({ watching: true, folderPath });
  }, [api]);

  // 停止监听
  const stopWatch = useCallback(async () => {
    if (!api) return;
    await api.stopWatch();
    setWatchStatus({ watching: false, folderPath: "" });
  }, [api]);

  return {
    /** 是否在 Electron 环境中 */
    isElectron: !!api,
    /** 当前监听状态 */
    watchStatus,
    /** 最近检测到的文件列表（最多 50 条） */
    recentFiles,
    /** 打开文件夹选择对话框并开始监听 */
    selectFolder,
    /** 对指定路径开始监听 */
    startWatch,
    /** 停止监听 */
    stopWatch,
  } as const;
}
