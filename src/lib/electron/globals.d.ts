/**
 * 全局类型声明 — window.labnote API
 * 将此文件放到前端项目的 src/ 目录下，TypeScript 就能识别 window.labnote
 */

import type { WatchedFileInfo, WatchStatus } from "./useElectron";

declare global {
  interface Window {
    labnote?: {
      selectFolder: () => Promise<string | null>;
      startWatch: (folderPath: string) => Promise<void>;
      stopWatch: () => Promise<void>;
      getWatchedFolder: () => Promise<string | null>;
      getWatchStatus: () => Promise<WatchStatus>;
      onFileReady: (callback: (file: WatchedFileInfo) => void) => () => void;
      onFileDetected: (callback: (filePath: string) => void) => () => void;
      onWatchError: (callback: (errorMsg: string) => void) => () => void;
      onWatchStatusChange: (callback: (status: WatchStatus) => void) => () => void;
    };
  }
}

export {};
