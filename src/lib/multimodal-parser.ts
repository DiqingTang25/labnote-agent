/**
 * 多模态解析流水线 — v2 上下文感知版
 *
 * 核心改进：
 *   1. 分批处理（每批 5 个文件）
 *   2. 批内压缩为 markdown 摘要（~80%→10% 上下文压缩）
 *   3. 跨批合并只读摘要，不读原始数据
 *   4. 逐批进度上报
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
// 配置
// ═══════════════════════════════════════════════════════

const BATCH_SIZE = 5;                // 每批最多文件数
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const API_DELAY_MS = 200;            // 文件间延迟避免限流
const CONTEXT_LIMIT = 8000;          // merge 上下文上限 (字符)
const CONTEXT_THRESHOLD = 6400;      // 80% 触发压缩

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

type FileContent = {
  textContent: string;
  base64?: string;
  mime?: string;
  isBinary: boolean;
};

type RawResult = {
  fileName: string;
  fileType: string;
  rawOutput: string;
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ═══════════════════════════════════════════════════════
// 步骤1: 读取文件
// ═══════════════════════════════════════════════════════

async function readFiles(
  files: File[],
  onFileProgress: (fileIndex: number, progress: FileProgress) => void,
): Promise<FileContent[]> {
  const fileContents: FileContent[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onFileProgress(i, { name: file.name, status: "reading", detail: "读取中..." });

    if (file.size > MAX_FILE_SIZE) {
      onFileProgress(i, {
        name: file.name,
        status: "error",
        error: `文件过大 (${(file.size / 1024 / 1024).toFixed(1)}MB > 20MB)`,
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

  return fileContents;
}

// ═══════════════════════════════════════════════════════
// 步骤2: AI 分析单个文件
// ═══════════════════════════════════════════════════════

async function analyzeFile(
  file: File,
  content: FileContent,
  useRealAPI: boolean,
): Promise<RawResult> {
  const category = classifyFile(file.name);

  if (content.isBinary && !content.base64) {
    return { fileName: file.name, fileType: category, rawOutput: "" };
  }

  let rawOutput = "";
  try {
    if (!useRealAPI) {
      rawOutput = JSON.stringify({
        experiments: [{ name: file.name.replace(/\.[^.]+$/, ""), source: file.name }],
      });
    } else {
      switch (category) {
        case "image":
          rawOutput = await parseImage(content.base64!, content.mime!, file.name);
          break;
        case "text":
          rawOutput = await parseTextFile(content.textContent, file.name);
          break;
        case "csv":
          rawOutput = await parseCSV(content.textContent, file.name);
          break;
        case "audio":
          rawOutput = await parseAudio(content.base64!, content.mime!);
          break;
        case "video":
          rawOutput = await parseVideo(content.base64!, content.mime!, file.name);
          break;
        case "document":
          rawOutput = await parseTextFile(content.textContent || file.name, file.name);
          break;
        default:
          rawOutput = await parseTextFile(content.textContent, file.name);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Pipeline] API failed for ${file.name}:`, msg.slice(0, 120));
    // 生成兜底卡片
    rawOutput = JSON.stringify({
      experiments: [{ name: file.name.replace(/\.[^.]+$/, ""), source: file.name }],
    });
  }

  return { fileName: file.name, fileType: category, rawOutput };
}

// ═══════════════════════════════════════════════════════
// 步骤3: 压缩实验结果 → 紧凑 markdown 摘要
// ═══════════════════════════════════════════════════════

function compressToMarkdown(
  partials: Array<{ fileName: string; experiment: Partial<Experiment> }>,
): string {
  if (partials.length === 0) return "";

  const lines: string[] = ["## 批处理摘要", ""];

  for (const p of partials) {
    const e = p.experiment;
    const paramsStr = (e.params ?? [])
      .filter((x) => x?.name)
      .map((x) => `${x.name}=${x.value}${x.unit}`)
      .join(", ");

    lines.push(`### ${e.name || "未命名"}`);
    lines.push(`- 来源: ${p.fileName}`);
    if (e.date) lines.push(`- 日期: ${e.date}`);
    if (e.operator) lines.push(`- 操作人: ${e.operator}`);
    if (e.purpose) lines.push(`- 目的: ${e.purpose}`);
    if (e.device?.name) lines.push(`- 设备: ${e.device.name} (${e.device.model || ""})`);
    if (e.sample?.id) lines.push(`- 样品: ${e.sample.id}`);
    if (paramsStr) lines.push(`- 参数: ${paramsStr}`);
    if (e.results) lines.push(`- 结果: ${e.results.slice(0, 120)}`);
    if (e.notes) lines.push(`- 备注: ${e.notes.slice(0, 80)}`);
    lines.push("");
  }

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════
// 步骤4: 处理一个批次
// ═══════════════════════════════════════════════════════

async function processBatch(
  batchFiles: File[],
  batchContents: FileContent[],
  batchIndex: number,
  totalBatches: number,
  onFileProgress: (fileIndex: number, progress: FileProgress) => void,
  useRealAPI: boolean,
): Promise<{
  partials: Array<{ fileName: string; experiment: Partial<Experiment> }>;
  summaryMd: string;
}> {
  const rawResults: RawResult[] = [];
  const globalStartIdx = batchIndex * BATCH_SIZE;

  // 2a: 逐文件调 API
  for (let i = 0; i < batchFiles.length; i++) {
    const globalIdx = globalStartIdx + i;
    const file = batchFiles[i];
    const fc = batchContents[i];

    if (fc.isBinary && !fc.base64) continue;

    const modelHint =
      classifyFile(file.name) === "image"
        ? "Qwen3-VL-32B"
        : classifyFile(file.name) === "audio" || classifyFile(file.name) === "video"
          ? "Qwen3-Omni"
          : "DeepSeek-V3";

    onFileProgress(globalIdx, {
      name: file.name,
      status: "analyzing",
      detail: `批次${batchIndex + 1}/${totalBatches} · ${modelHint}`,
    });

    await sleep(API_DELAY_MS);

    const result = await analyzeFile(file, fc, useRealAPI);
    rawResults.push(result);

    if (result.rawOutput.length > 0) {
      onFileProgress(globalIdx, {
        name: file.name,
        status: "extracting",
        detail: "解析 JSON...",
      });
    } else {
      onFileProgress(globalIdx, {
        name: file.name,
        status: "error",
        error: "API 返回为空",
      });
    }
  }

  // 2b: 解析所有响应 → partial experiments
  const allPartials: Array<{ fileName: string; experiment: Partial<Experiment> }> = [];
  for (let i = 0; i < rawResults.length; i++) {
    const rr = rawResults[i];
    const globalIdx = globalStartIdx + i;

    if (!rr.rawOutput) {
      onFileProgress(globalIdx, {
        name: batchFiles[i].name,
        status: "error",
        error: "无 AI 响应",
      });
      continue;
    }

    try {
      const parsed = parseAPIResponse(rr.rawOutput, rr.fileName);
      parsed.forEach((exp) => allPartials.push({ fileName: rr.fileName, experiment: exp }));
      onFileProgress(globalIdx, {
        name: batchFiles[i].name,
        status: "extracting",
        detail: `提取 ${parsed.length} 条`,
      });
    } catch {
      // JSON 解析失败：创建基础卡片
      allPartials.push({
        fileName: rr.fileName,
        experiment: {
          name: rr.fileName.replace(/\.[^.]+$/, ""),
          results: rr.rawOutput.slice(0, 300),
          notes: "AI JSON 解析失败，原始响应已放入结果区。",
        },
      });
      onFileProgress(globalIdx, {
        name: batchFiles[i].name,
        status: "error",
        error: "JSON 解析失败",
      });
    }
  }

  // 2c: 批内合并（如果该批有多个文件的结果）
  let batchPartials = allPartials;
  const validResults = rawResults.filter((r) => r.rawOutput.length > 0);

  if (useRealAPI && validResults.length > 1) {
    try {
      const mergedRaw = await mergeResults(validResults);
      const merged = parseAPIResponse(mergedRaw, `__batch${batchIndex}__`);
      if (merged.length > 0) {
        batchPartials = merged.map((m) => ({
          fileName: `批次${batchIndex + 1}合并`,
          experiment: m,
        }));
      }
    } catch {
      // merge 失败，用原始 partials
    }
  }

  // 2d: 生成 markdown 摘要
  const summaryMd = compressToMarkdown(batchPartials);

  return { partials: batchPartials, summaryMd };
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

  // 初始化进度
  for (let i = 0; i < files.length; i++) {
    onFileProgress(i, { name: files[i].name, status: "waiting" });
  }

  // ═══ 读取文件 ═══
  onStage("reading", `读取 ${files.length} 个文件`);
  const fileContents = await readFiles(files, onFileProgress);
  await sleep(200);

  // ═══ 分批 AI 分析 ═══
  const totalBatches = Math.ceil(files.length / BATCH_SIZE);
  const allBatchSummaries: string[] = [];
  const allBatchPartials: Array<{ fileName: string; experiment: Partial<Experiment> }> = [];

  for (let bi = 0; bi < totalBatches; bi++) {
    onStage("analyzing", `批次 ${bi + 1}/${totalBatches} · AI 多模态识别`);

    const start = bi * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, files.length);
    const batchFiles = files.slice(start, end);
    const batchContents = fileContents.slice(start, end);

    const { partials, summaryMd } = await processBatch(
      batchFiles,
      batchContents,
      bi,
      totalBatches,
      onFileProgress,
      useRealAPI,
    );

    allBatchPartials.push(...partials);

    // 上下文检查：摘要累积超过 80% 则触发压缩提示
    const totalSummarySize = allBatchSummaries.reduce((s, m) => s + m.length, 0) + summaryMd.length;
    if (totalSummarySize > CONTEXT_THRESHOLD) {
      console.log(`[Pipeline] 批${bi + 1}: 累计摘要 ${totalSummarySize} 字符，超过 80% 阈值`);
    }

    allBatchSummaries.push(summaryMd);
  }

  // ═══ 跨批合并 ═══
  onStage("merging", `合并 ${totalBatches} 批结果`);

  let finalExperiments: Experiment[];

  if (totalBatches === 1) {
    // 单批次：直接用 partials
    finalExperiments = buildFromPartials(allBatchPartials);
  } else {
    // 多批次：将所有批摘要作为上下文，调一次 merge
    const combinedSummary = allBatchSummaries.join("\n\n---\n\n");
    const truncatedSummary = combinedSummary.slice(0, CONTEXT_LIMIT);

    if (useRealAPI && allBatchPartials.length > 0) {
      try {
        const summaryResults: RawResult[] = [{
          fileName: `全部摘要`,
          fileType: "text",
          rawOutput: `请基于以下 ${totalBatches} 个批次的实验摘要，去重合并为最终的实验卡片列表。\n\n${truncatedSummary}`,
        }];

        // 直接调 chat 而非 mergeResults，因为 mergeResults 期望的是 rawOutput
        const { chat } = await import("./siliconflow");
        const mergedRaw = await chat(
          "deepseek-ai/DeepSeek-V3",
          [{
            role: "user",
            content: `你是科研实验记录管理员。以下是 ${totalBatches} 个批次的实验摘要，请去重合并，输出最终的实验卡片列表。\n\n【重要】输出纯JSON（不要markdown代码块）：\n{"experiments":[{"name":"...","date":"...","operator":"...","purpose":"...","device":{"name":"...","model":"...","vendor":"..."},"sample":{"id":"...","batch":"...","source":"..."},"params":[{"name":"...","value":"...","unit":"..."}],"environment":{"temperature":"","humidity":"","other":""},"steps":["..."],"results":"...","notes":"...","source":"..."}]}\n\n${truncatedSummary}`,
          }],
          4096,
        );

        const parsed = parseAPIResponse(mergedRaw, "__final__");
        finalExperiments = parsed.length > 0
          ? parsed.map((p) => normalizeExperiment(p, { lastParsedAt: new Date().toISOString() }))
          : buildFromPartials(allBatchPartials);
      } catch (err) {
        console.error("[Pipeline] 跨批合并失败，使用原始结果", err);
        finalExperiments = buildFromPartials(allBatchPartials);
      }
    } else {
      finalExperiments = buildFromPartials(allBatchPartials);
    }
  }

  // ═══ 附加文件元数据 ═══
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
      parsedRaw: "", // 最终卡片不再保留原始响应
    }));
    exp.lastParsedAt = now;
  }

  // ═══ 完成 ═══
  onStage("complete", `${finalExperiments.length} 张卡片`);
  for (let i = 0; i < files.length; i++) {
    if (fileContents[i].isBinary && !fileContents[i].base64) continue;
    onFileProgress(i, { name: files[i].name, status: "complete" });
  }

  return finalExperiments;
}

// ═══════════════════════════════════════════════════════
// 辅助
// ═══════════════════════════════════════════════════════

function buildFromPartials(
  allPartials: Array<{ fileName: string; experiment: Partial<Experiment> }>,
): Experiment[] {
  // 去重：名称相近的合并
  const groups = new Map<string, Partial<Experiment>[]>();

  for (const p of allPartials) {
    const key = (p.experiment.name || p.fileName).slice(0, 20);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p.experiment);
  }

  return Array.from(groups.values()).map((parts) => {
    const merged: Record<string, unknown> = {};
    for (const part of parts) {
      for (const [k, v] of Object.entries(part)) {
        if (v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)) {
          merged[k] = v;
        }
      }
    }
    return normalizeExperiment(merged as Partial<Experiment>, {
      lastParsedAt: new Date().toISOString(),
    });
  });
}

/**
 * 仅重新合并（使用存储的 parsedRaw，不重调文件级 API）
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
