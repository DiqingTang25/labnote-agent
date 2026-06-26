/**
 * 首页 → 工作台 文件上传桥接
 * 首页拖入文件后存入此模块，工作台挂载后自动取出并触发解析
 */

let pendingFiles: File[] | null = null;
let pendingCallback: ((files: File[]) => void) | null = null;

/** 首页调用：存入待上传文件 */
export function setPendingUpload(files: File[]) {
  pendingFiles = files;
}

/** 工作台调用：取出并清空 */
export function consumePendingUpload(): File[] | null {
  const f = pendingFiles;
  pendingFiles = null;
  return f;
}

/** 注册回调：工作台启动时注册，首页存入时触发 */
export function onPendingUpload(cb: (files: File[]) => void) {
  pendingCallback = cb;
  // 如果已有待处理文件，立即触发
  if (pendingFiles && pendingFiles.length > 0) {
    cb(pendingFiles);
    pendingFiles = null;
  }
}

export function clearPendingCallback() {
  pendingCallback = null;
}
