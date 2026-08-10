/**
 * AI 解析流水线 — 文件 → 结构化实验卡片
 *
 * 支持: TXT, CSV, MD, LOG, JSON, XML, PDF, DOCX, XLSX, PNG, JPG
 * 图片: Qwen3-VL-8B 视觉识别
 */
import type { ExperimentDoc, Template } from "./exp-core";
import { getProperty, getString } from "./property-utils";
import {
  parseTextFile,
  parseImage,
  parseCSV,
  parseTranscript,
  mergeResults,
  fileToBase64,
} from "./deepseek";
import { parseAPIResponse, normalizeExperiment } from "./json-parser";
import { classifyExperimentType } from "./prompt-builder";
import { matchTemplate, GENERIC_TEMPLATE } from "./templates/presets";
import { createBlankDoc } from "./exp-core";

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
  | "merging"
  | "complete";

export const PIPELINE_STAGES: { key: PipelineStage; label: string }[] = [
  { key: "reading", label: "读取文件内容" },
  { key: "analyzing", label: "AI 文本识别" },
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
    txt: { type: "文本笔记", icon: "📃" },
    md: { type: "实验方案", icon: "📋" },
    log: { type: "仪器日志", icon: "📜" },
    json: { type: "JSON数据", icon: "📋" },
    xml: { type: "XML数据", icon: "📋" },
  };
  return map[ext] ?? { type: "文本文件", icon: "📎" };
}

export function classifyFile(
  fileName: string,
): "image" | "text" | "csv" | "document" {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "tif", "tiff", "bmp", "webp"].includes(ext)) return "image";
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
      if (category === "image") {
        const { base64, mime } = await fileToBase64(file);
        fileContents.push({ textContent: "", base64, mime, isBinary: true });
      } else {
        const text = await file.text();
        fileContents.push({ textContent: text.slice(0, 12000), isBinary: false });
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
  template?: Template,
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
        case "csv":
          rawOutput = await parseCSV(content.textContent, file.name, template);
          break;
        case "text":
        case "document":
        default:
          rawOutput = await parseTextFile(content.textContent || file.name, file.name, template ?? GENERIC_TEMPLATE);
          break;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Pipeline] API failed for ${file.name}:`, msg.slice(0, 120));
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
  partials: Array<{ fileName: string; experiment: Partial<ExperimentDoc> }>,
): string {
  if (partials.length === 0) return "";

  const lines: string[] = ["## 批处理摘要", ""];

  for (const p of partials) {
    const e = p.experiment;
    const props = e.properties ?? {};
    const params = getProperty(props, "params");
    const paramsStr = Array.isArray(params)
      ? params
        .filter((value) => value !== null && typeof value === "object" && !Array.isArray(value))
        .map((value) => {
          const param = value as Record<string, unknown>;
          return typeof param.name === "string"
            ? `${param.name}=${String(param.value ?? "")}${String(param.unit ?? "")}`
            : "";
        })
        .filter(Boolean)
        .join(", ")
      : "";
    const purpose = getString(props, "purpose");
    const deviceName = getString(props, "device.name");
    const deviceModel = getString(props, "device.model");
    const sampleId = getString(props, "sample.id");
    const results = getString(props, "results");
    const notes = getString(props, "notes");

    lines.push(`### ${e.name || "未命名"}`);
    lines.push(`- 来源: ${p.fileName}`);
    if (e.date) lines.push(`- 日期: ${e.date}`);
    if (e.operator) lines.push(`- 操作人: ${e.operator}`);
    if (purpose) lines.push(`- 目的: ${purpose}`);
    if (deviceName) lines.push(`- 设备: ${deviceName} (${deviceModel})`);
    if (sampleId) lines.push(`- 样品: ${sampleId}`);
    if (paramsStr) lines.push(`- 参数: ${paramsStr}`);
    if (results) lines.push(`- 结果: ${results.slice(0, 120)}`);
    if (notes) lines.push(`- 备注: ${notes.slice(0, 80)}`);
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
  template?: Template,
): Promise<{
  partials: Array<{ fileName: string; experiment: Partial<ExperimentDoc> }>;
  summaryMd: string;
}> {
  const rawResults: RawResult[] = [];
  const globalStartIdx = batchIndex * BATCH_SIZE;

  // 2a: 逐文件调 API
  for (let i = 0; i < batchFiles.length; i++) {
    const globalIdx = globalStartIdx + i;
    const file = batchFiles[i];
    const fc = batchContents[i];

    const modelHint = classifyFile(file.name) === "image" ? "Qwen3-VL-8B" : "DeepSeek V4";

    onFileProgress(globalIdx, {
      name: file.name,
      status: "analyzing",
      detail: `批次${batchIndex + 1}/${totalBatches} · ${modelHint}`,
    });

    await sleep(API_DELAY_MS);

    const result = await analyzeFile(file, fc, useRealAPI, template);
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
  const allPartials: Array<{ fileName: string; experiment: Partial<ExperimentDoc> }> = [];
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
          properties: {
            results: rr.rawOutput.slice(0, 300),
            notes: "AI JSON 解析失败，原始响应已放入结果区。",
          },
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
      const mergedRaw = await mergeResults(validResults, template);
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
): Promise<ExperimentDoc[]> {
  if (files.length === 0) return [];

  // 初始化进度
  for (let i = 0; i < files.length; i++) {
    onFileProgress(i, { name: files[i].name, status: "waiting" });
  }

  // ═══ 模板分类 ═══
  // 从第一个文本文件的内容推断实验类型
  let template: Template | undefined;
  if (useRealAPI) {
    const firstTextFile = files.find((f) => classifyFile(f.name) !== "image");
    if (firstTextFile) {
      try {
        const textSample = (await firstTextFile.text()).slice(0, 2000);
        const { type } = classifyExperimentType(firstTextFile.name, textSample);
        template = matchTemplate(type);
        if (template) {
          onStage("reading", `检测到实验类型: ${template.name}`);
        }
      } catch { /* keep generic template */ }
    }
  }

  // ═══ 读取文件 ═══
  onStage("reading", `读取 ${files.length} 个文件`);
  const fileContents = await readFiles(files, onFileProgress);
  await sleep(200);

  // ═══ 分批 AI 分析 ═══
  const totalBatches = Math.ceil(files.length / BATCH_SIZE);
  const allBatchSummaries: string[] = [];
  const allBatchPartials: Array<{ fileName: string; experiment: Partial<ExperimentDoc> }> = [];

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
      template,
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

  let finalExperiments: ExperimentDoc[];

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

        const { chat, MODEL_TEXT } = await import("./deepseek");
        const tpl = template ?? GENERIC_TEMPLATE;
        const { buildMergePrompt: _bmp } = await import("./prompt-builder");
        const summaryResultsForMerge: RawResult[] = [{
          fileName: "全部摘要", fileType: "text",
          rawOutput: truncatedSummary,
        }];
        const customMergePrompt = _bmp(tpl, summaryResultsForMerge);
        const mergedRaw = await chat(
          MODEL_TEXT,
          [{
            role: "user",
            content: `你是科研实验记录管理员。以下是 ${totalBatches} 个批次的实验摘要，请去重合并，输出最终的实验卡片列表。\n\n【重要】输出纯JSON（不要markdown代码块），字段尽可能完整：\n{"experiments":[{"name":"...","experimentType":"synthesis|characterization|measurement|simulation|other","date":"...","operator":"...","purpose":"...","hypothesis":"...","conclusion":"...","device":{"name":"...","model":"...","vendor":"..."},"instruments":[{"name":"...","model":"...","vendor":"..."}],"materials":[{"name":"...","casNumber":"...","purity":"...","role":"reactant|..."}],"sample":{"id":"...","batch":"...","source":"..."},"params":[{"name":"...","value":"...","unit":"..."}],"environment":{"temperature":"","humidity":"","other":""},"protocol":{"name":"...","version":"..."},"steps":["..."],"results":"...","notes":"...","controls":[{"type":"standard|...","name":"..."}],"replicates":1,"qcStatus":"na|...","source":"...","aiInsights":"..."}]}\n\n${truncatedSummary}`,
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

  // ═══ 附加文件元数据（不含 textContent，文件内容在 Supabase Storage）═══
  const now = new Date().toISOString();
  for (const exp of finalExperiments) {
    exp.attachedFiles = files.map((f, i) => ({
      id: `af_${Math.random().toString(36).slice(2, 11)}`,
      name: f.name,
      mediaType: classifyFile(f.name),
      mimeType: f.type || "application/octet-stream",
      size: f.size,
      addedAt: now,
      file_url: "",  // 待 workbench 上传后填充
      storage_path: "",
      parsedRaw: getString(allBatchPartials[i]?.experiment.properties ?? {}, "results"),
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
  allPartials: Array<{ fileName: string; experiment: Partial<ExperimentDoc> }>,
): ExperimentDoc[] {
  // 去重：名称相近的合并
  const groups = new Map<string, Partial<ExperimentDoc>[]>();

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
    return normalizeExperiment(merged as Partial<ExperimentDoc>, {
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
): Promise<ExperimentDoc[]> {
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
    const allPartials: Array<{ fileName: string; experiment: Partial<ExperimentDoc> }> = [];
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
