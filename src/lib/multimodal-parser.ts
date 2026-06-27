/**
 * 多模态解析流水线 — 真实 AI 集成版
 *
 * 流程：读取文件 → 按类型调 SiliconFlow API → 提取 JSON → 合并去重 → 出实验卡片
 */
import type { AttachedFile, Experiment } from "./labStore";
import {
  parseTextFile,
  parseImage,
  parseCSV,
  parseTranscript,
  parseVideo,
  parseAudio,
  mergeResults,
  fileToBase64,
} from "./siliconflow";
import { parseAPIResponse, normalizeExperiment } from "./json-parser";

// ═══════════════════════════════════════════════════════
// 类型
// ═══════════════════════════════════════════════════════

export type PipelineStage =
  | "idle"
  | "reading"
  | "analyzing"
  | "extracting"
  | "merging"
  | "complete";

export const PIPELINE_STAGES: { key: PipelineStage; label: string }[] = [
  { key: "reading", label: "读取文件内容" },
  { key: "analyzing", label: "AI 多模态识别" },
  { key: "extracting", label: "结构化信息抽取" },
  { key: "merging", label: "去重合并生成卡片" },
  { key: "complete", label: "完成" },
];

export type FileProgress = {
  name: string;
  status: "waiting" | "reading" | "analyzing" | "extracting" | "complete" | "error";
  detail?: string;
  error?: string;
};

// ═══════════════════════════════════════════════════════
// 文件类型检测
// ═══════════════════════════════════════════════════════

export function detectFileInfo(fileName: string): { type: string; icon: string } {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, { type: string; icon: string }> = {
    pdf: { type: "PDF文档", icon: "📄" },
    docx: { type: "Word文档", icon: "📝" },
    xlsx: { type: "Excel表格", icon: "📊" },
    csv: { type: "CSV数据表", icon: "📊" },
    jpg: { type: "实验图像", icon: "🖼️" },
    jpeg: { type: "实验图像", icon: "🖼️" },
    png: { type: "显微图像", icon: "🔬" },
    tif: { type: "显微图像", icon: "🔬" },
    tiff: { type: "显微图像", icon: "🔬" },
    txt: { type: "文本笔记", icon: "📃" },
    md: { type: "实验方案", icon: "📋" },
    log: { type: "仪器日志", icon: "📜" },
    mp4: { type: "视频记录", icon: "🎬" },
    m4a: { type: "语音记录", icon: "🎙️" },
    mp3: { type: "语音记录", icon: "🎙️" },
    wav: { type: "语音记录", icon: "🎙️" },
  };
  return map[ext] ?? { type: "其他格式", icon: "📎" };
}

/**
 * 分类文件到 API 路由类型
 */
export function classifyFile(
  fileName: string,
): "image" | "text" | "csv" | "audio" | "video" | "document" {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "tif", "tiff", "bmp", "webp"].includes(ext)) return "image";
  if (["mp3", "wav", "m4a", "ogg", "flac"].includes(ext)) return "audio";
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return "video";
  if (ext === "csv") return "csv";
  if (["pdf", "docx", "xlsx"].includes(ext)) return "document";
  return "text";
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const API_DELAY_MS = 200; // 文件间延迟避免限流

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ═══════════════════════════════════════════════════════
// 主流水线
// ═══════════════════════════════════════════════════════

export async function runPipeline(
  files: File[],
  onStage: (stage: PipelineStage, detail: string) => void,
  onFileProgress: (fileIndex: number, progress: FileProgress) => void,
  useRealAPI = true,
): Promise<Experiment[]> {
  if (files.length === 0) return [];

  // 初始化所有文件为 waiting
  for (let i = 0; i < files.length; i++) {
    onFileProgress(i, { name: files[i].name, status: "waiting" });
  }

  // ═══ Stage 1: 读取文件 ═══
  onStage("reading", `读取 ${files.length} 个文件`);
  const fileContents: Array<{
    textContent: string;
    base64?: string;
    mime?: string;
    isBinary: boolean;
  }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onFileProgress(i, { name: file.name, status: "reading", detail: "读取中..." });

    if (file.size > MAX_FILE_SIZE) {
      onFileProgress(i, {
        name: file.name,
        status: "error",
        error: `文件过大 (${(file.size / 1024 / 1024).toFixed(1)}MB > 10MB)`,
      });
      fileContents.push({ textContent: "", isBinary: true });
      continue;
    }

    const category = classifyFile(file.name);

    try {
      if (category === "image" || category === "audio" || category === "video") {
        const { base64, mime } = await fileToBase64(file);
        fileContents.push({ textContent: "", base64, mime, isBinary: true });
      } else {
        const text = await file.text();
        fileContents.push({ textContent: text.slice(0, 8000), isBinary: false });
      }
      onFileProgress(i, { name: file.name, status: "reading", detail: "读取完成" });
    } catch (err) {
      onFileProgress(i, { name: file.name, status: "error", error: `读取失败: ${err}` });
      fileContents.push({ textContent: "", isBinary: false });
    }
  }

  await sleep(200);

  // ═══ Stage 2: AI 分析 ═══
  onStage("analyzing", `AI 分析 ${files.length} 个文件`);
  const rawResults: Array<{ fileName: string; fileType: string; rawOutput: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fc = fileContents[i];
    const category = classifyFile(file.name);

    // 跳过大文件
    if (fc.isBinary && !fc.base64) {
      rawResults.push({ fileName: file.name, fileType: category, rawOutput: "" });
      continue;
    }

    const modelHint =
      category === "image"
        ? "Qwen3-VL-32B"
        : category === "audio" || category === "video"
          ? "Qwen3-Omni"
          : "DeepSeek-V3";

    onFileProgress(i, {
      name: file.name,
      status: "analyzing",
      detail: `调用 ${modelHint}...`,
    });

    await sleep(API_DELAY_MS); // 限流延迟

    let rawOutput = "";
    try {
      if (!useRealAPI) {
        rawOutput = JSON.stringify({
          experiments: [{ name: file.name.replace(/\.[^.]+$/, ""), source: file.name }],
        });
      } else {
        switch (category) {
          case "image":
            rawOutput = await parseImage(fc.base64!, fc.mime!, file.name);
            break;
          case "text":
            rawOutput = await parseTextFile(fc.textContent, file.name);
            break;
          case "csv":
            rawOutput = await parseCSV(fc.textContent, file.name);
            break;
          case "audio":
            rawOutput = await parseAudio(fc.base64!, fc.mime!);
            break;
          case "video":
            rawOutput = await parseVideo(fc.base64!, fc.mime!, file.name);
            break;
          case "document":
            rawOutput = await parseTextFile(fc.textContent || file.name, file.name);
            break;
          default:
            rawOutput = await parseTextFile(fc.textContent, file.name);
        }
      }
      onFileProgress(i, { name: file.name, status: "analyzing", detail: "API 响应已收到" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onFileProgress(i, { name: file.name, status: "error", error: `API: ${msg.slice(0, 60)}` });
      // 生成兜底卡片
      rawOutput = JSON.stringify({
        experiments: [{ name: file.name.replace(/\.[^.]+$/, ""), source: file.name }],
      });
    }

    rawResults.push({ fileName: file.name, fileType: category, rawOutput });
  }

  // ═══ Stage 3: 结构化抽取 ═══
  onStage("extracting", "解析 AI 响应为实验卡片");
  const allPartials: Array<{ fileName: string; experiment: Partial<Experiment> }> = [];

  for (let i = 0; i < rawResults.length; i++) {
    const rr = rawResults[i];
    onFileProgress(i, { name: files[i].name, status: "extracting", detail: "解析 JSON..." });

    try {
      const parsed = parseAPIResponse(rr.rawOutput, rr.fileName);
      parsed.forEach((p) => allPartials.push({ fileName: rr.fileName, experiment: p }));
      onFileProgress(i, { name: files[i].name, status: "extracting", detail: `提取 ${parsed.length} 条` });
    } catch {
      // JSON 解析失败：创建基础卡片
      allPartials.push({
        fileName: rr.fileName,
        experiment: {
          name: rr.fileName.replace(/\.[^.]+$/, ""),
          results: rr.rawOutput.slice(0, 500), // 原始输出放入结果区
          notes: "AI JSON 解析失败，原始响应已放入结果区。请手动整理。",
        },
      });
      onFileProgress(i, { name: files[i].name, status: "extracting", detail: "解析失败" });
    }
  }

  // ═══ Stage 4: 合并 ═══
  onStage("merging", "去重合并生成最终卡片");
  let finalExperiments: Experiment[];

  const validResults = rawResults.filter((r) => r.rawOutput.length > 0);

  if (useRealAPI && validResults.length > 1) {
    // 多文件 → 调 mergeResults 去重
    try {
      const mergedRaw = await mergeResults(validResults);
      const merged = parseAPIResponse(mergedRaw, "__merged__");
      finalExperiments = merged.map((p) =>
        normalizeExperiment(p, { lastParsedAt: new Date().toISOString() }),
      );
    } catch {
      // merge 失败：直接用 partials
      finalExperiments = buildFromPartials(allPartials);
    }
  } else if (allPartials.length > 0) {
    finalExperiments = buildFromPartials(allPartials);
  } else {
    finalExperiments = [];
  }

  // 附加文件元数据
  const now = new Date().toISOString();
  for (const exp of finalExperiments) {
    exp.attachedFiles = files.map((f, i) => ({
      id: `af_${Math.random().toString(36).slice(2, 11)}`,
      name: f.name,
      mediaType: classifyFile(f.name),
      mimeType: f.type || "application/octet-stream",
      size: f.size,
      addedAt: now,
      textContent: fileContents[i]?.textContent ?? "",
      parsedRaw: rawResults[i]?.rawOutput ?? "",
    }));
    exp.lastParsedAt = now;
  }

  // ═══ Stage 5: 完成 ═══
  onStage("complete", `${finalExperiments.length} 张卡片`);

  for (let i = 0; i < files.length; i++) {
    const pf = fileContents[i];
    if (pf.isBinary && !pf.base64) continue; // 已标记错误
    onFileProgress(i, { name: files[i].name, status: "complete" });
  }

  return finalExperiments;
}

// ═══════════════════════════════════════════════════════
// 辅助
// ═══════════════════════════════════════════════════════

/** @deprecated 已移除硬编码文件映射，返回空数组 */
export function getLocalFiles(): Array<{
  name: string;
  type: string;
  label: string;
  cardIndex: number;
}> {
  return [];
}

function buildFromPartials(
  allPartials: Array<{ fileName: string; experiment: Partial<Experiment> }>,
): Experiment[] {
  // 简单去重：名称相近的合并
  const groups = new Map<string, Partial<Experiment>[]>();

  for (const p of allPartials) {
    const key = (p.experiment.name || p.fileName).slice(0, 20);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p.experiment);
  }

  return Array.from(groups.values()).map((parts) => {
    const merged: Partial<Experiment> = {};
    for (const part of parts) {
      for (const [k, v] of Object.entries(part)) {
        if (v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)) {
          (merged as Record<string, unknown>)[k] = v;
        }
      }
    }
    return normalizeExperiment(merged, { lastParsedAt: new Date().toISOString() });
  });
}

/**
 * 仅重新合并（不重调文件级 API，使用存储的 parsedRaw）
 */
export async function rerunMerge(
  fileResults: Array<{ fileName: string; fileType: string; rawOutput: string }>,
  onStage: (stage: PipelineStage, detail: string) => void,
): Promise<Experiment[]> {
  onStage("merging", `重新合并 ${fileResults.length} 个文件的结果`);

  const valid = fileResults.filter((r) => r.rawOutput.length > 0);
  if (valid.length === 0) return [];

  try {
    const mergedRaw = await mergeResults(valid);
    const parsed = parseAPIResponse(mergedRaw, "__remerge__");
    onStage("complete", `${parsed.length} 张卡片`);
    return parsed.map((p) =>
      normalizeExperiment(p, { lastParsedAt: new Date().toISOString() }),
    );
  } catch {
    // 回退：用 allPartials 直接构建
    const allPartials: Array<{ fileName: string; experiment: Partial<Experiment> }> = [];
    for (const r of valid) {
      try {
        const p = parseAPIResponse(r.rawOutput, r.fileName);
        p.forEach((x) => allPartials.push({ fileName: r.fileName, experiment: x }));
      } catch {
        /* skip */
      }
    }
    const result = buildFromPartials(allPartials);
    onStage("complete", `${result.length} 张卡片 (回退模式)`);
    return result;
  }
}
