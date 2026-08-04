/**
 * Token-level Confidence Calibration
 *
 * 利用 API 返回的 logprobs 对 LLM 输出的 JSON 逐字段计算置信度。
 *
 * 算法：
 *   1. 调 API 时开启 logprobs
 *   2. 拿到 tokens[] 和 logprobs[]
 *   3. 拼接 tokens 恢复完整输出文本
 *   4. 解析 JSON
 *   5. 对每个字段值，在 token 流中定位，聚合该段 tokens 的平均 logprob
 *   6. 将 logprob 转化为置信度分数
 *
 * 如果 API 不支持 logprobs（返回 null），降级为基于 token 分布的启发式估计。
 */

import { chatCompletionWithLogprobs, type TokenLogprob } from "./api/ai.functions";
import { extractJSON } from "./json-parser";

// ═══════════════════════════════════════════════════════
// 类型
// ═══════════════════════════════════════════════════════

export type FieldConfidence = {
  /** 字段路径，如 "device.name", "params[0].value" */
  path: string;
  /** 字段值 */
  value: unknown;
  /** 置信度 0-100 */
  confidence: number;
  /** 该字段涉及的 token 数量 */
  tokenCount: number;
  /** 原始平均 logprob */
  avgLogprob: number;
};

export type CalibratedResult<T = Record<string, unknown>> = {
  /** 解析后的数据 */
  data: T;
  /** 逐字段置信度（扁平化，不含嵌套路径的中间节点） */
  fields: FieldConfidence[];
  /** 整体置信度（所有叶子字段的平均） */
  overallConfidence: number;
  /** 是否来自真实 logprobs（false = 降级模式） */
  fromLogprobs: boolean;
};

// ═══════════════════════════════════════════════════════
// Token → 字符偏移映射
// ═══════════════════════════════════════════════════════

type TokenSpan = {
  token: string;
  start: number;
  end: number;
  logprob: number;
};

function buildTokenSpans(tokens: string[], logprobs: number[]): TokenSpan[] {
  const spans: TokenSpan[] = [];
  let pos = 0;
  for (let i = 0; i < tokens.length; i++) {
    spans.push({
      token: tokens[i],
      start: pos,
      end: pos + tokens[i].length,
      logprob: logprobs[i],
    });
    pos = spans[i].end;
  }
  return spans;
}

/** 在文本中查找子串的所有出现位置 */
function findInText(text: string, substr: string): Array<{ start: number; end: number }> {
  const results: Array<{ start: number; end: number }> = [];
  let idx = 0;
  while ((idx = text.indexOf(substr, idx)) !== -1) {
    results.push({ start: idx, end: idx + substr.length });
    idx += substr.length;
  }
  return results;
}

/** 给定字符范围，找出覆盖该范围的 token spans */
function spansForRange(spans: TokenSpan[], start: number, end: number): TokenSpan[] {
  return spans.filter((s) => s.end > start && s.start < end);
}

/** token 平均 logprob → 0-100 置信度分数 */
function logprobToConfidence(avgLogprob: number): number {
  // logprob 通常为负数，越接近 0 置信度越高
  // exp(avgLogprob) ≈ 0.01-0.95
  // 映射：-0.1 → 90, -1 → 37, -3 → 5, -5 → 1
  const linearProb = Math.exp(avgLogprob);
  return Math.round(Math.min(100, Math.max(0, linearProb * 100)));
}

// ═══════════════════════════════════════════════════════
// 扁平化字段提取
// ═══════════════════════════════════════════════════════

type FlatField = {
  path: string;
  value: unknown;
  strValue: string; // 用于匹配的字符串表示
  parentJsonPath: string; // JSON 中的定位路径
};

/**
 * 将嵌套 JSON 扁平化为 (path, value) 列表
 * 只提取叶子字段（string | number | boolean | null）
 * 跳过中间容器对象和数组
 */
function flattenFields(
  obj: unknown,
  prefix = "",
): FlatField[] {
  const result: FlatField[] = [];

  if (obj === null || obj === undefined) return result;

  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
    result.push({
      path: prefix || "value",
      value: obj,
      strValue: typeof obj === "string" ? obj : String(obj),
      parentJsonPath: prefix,
    });
    return result;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];
      if (typeof item === "object" && item !== null) {
        // 数组元素是对象：递归展平
        result.push(...flattenFields(item, `${prefix}[${i}]`));
      } else {
        // 数组元素是基本类型
        result.push({
          path: `${prefix}[${i}]`,
          value: item,
          strValue: String(item ?? ""),
          parentJsonPath: prefix,
        });
      }
    }
    return result;
  }

  if (typeof obj === "object") {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const childPrefix = prefix ? `${prefix}.${key}` : key;
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        // 嵌套对象：递归
        result.push(...flattenFields(val, childPrefix));
      } else if (Array.isArray(val)) {
        // 数组值
        result.push(...flattenFields(val, childPrefix));
      } else {
        // 叶子字段
        result.push({
          path: childPrefix,
          value: val,
          strValue: val === null || val === undefined ? "" : String(val),
          parentJsonPath: prefix,
        });
      }
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════
// 将 logprobs 映射到 JSON 字段
// ═══════════════════════════════════════════════════════

function calibrateFromLogprobs(
  fullText: string,
  tokens: string[],
  logprobs: number[],
  parsed: Record<string, unknown>,
): FieldConfidence[] {
  const spans = buildTokenSpans(tokens, logprobs);
  const fields = flattenFields(parsed);
  const result: FieldConfidence[] = [];

  // 已使用的字符范围（避免同一段 token 被重复分配给多个字段）
  const usedRanges: Array<{ start: number; end: number }> = [];

  for (const field of fields) {
    if (!field.strValue || field.strValue.length === 0) {
      result.push({
        path: field.path,
        value: field.value,
        confidence: 0,
        tokenCount: 0,
        avgLogprob: -Infinity,
      });
      continue;
    }

    // 在完整文本中查找字段值的字符串表示
    const occurrences = findInText(fullText, field.strValue);

    // 优先选未被占用的匹配
    let bestOccurrence: { start: number; end: number } | null = null;
    for (const occ of occurrences) {
      const alreadyUsed = usedRanges.some(
        (r) => occ.start < r.end && occ.end > r.start,
      );
      if (!alreadyUsed) {
        bestOccurrence = occ;
        break;
      }
    }
    // 都被占了就用第一个
    if (!bestOccurrence && occurrences.length > 0) {
      bestOccurrence = occurrences[0];
    }

    if (bestOccurrence) {
      usedRanges.push(bestOccurrence);
      const fieldSpans = spansForRange(spans, bestOccurrence.start, bestOccurrence.end);
      const avgLogprob = fieldSpans.length > 0
        ? fieldSpans.reduce((s, sp) => s + sp.logprob, 0) / fieldSpans.length
        : -10;

      result.push({
        path: field.path,
        value: field.value,
        confidence: logprobToConfidence(avgLogprob),
        tokenCount: fieldSpans.length,
        avgLogprob,
      });
    } else {
      // 字符串匹配失败（可能因 tokenization 差异）
      result.push({
        path: field.path,
        value: field.value,
        confidence: 50, // 无法定位时的默认值
        tokenCount: 0,
        avgLogprob: -0.7,
      });
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════
// 降级模式：无 logprobs 时的启发式估计
// ═══════════════════════════════════════════════════════

function calibrateHeuristic(parsed: Record<string, unknown>): FieldConfidence[] {
  const fields = flattenFields(parsed);
  return fields.map((f) => ({
    path: f.path,
    value: f.value,
    // 启发式：空值=0，短值(<10字)=60，长值=85（仅基于长度推测）
    confidence: !f.strValue ? 0 : f.strValue.length < 10 ? 60 : 85,
    tokenCount: 0,
    avgLogprob: -0.5,
  }));
}

// ═══════════════════════════════════════════════════════
// 公开 API
// ═══════════════════════════════════════════════════════

export async function calibratedExtract(
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  maxTokens = 4096,
): Promise<CalibratedResult> {
  // 1. 调 API 获取 logprobs
  const result = await chatCompletionWithLogprobs({
    data: { model, messages, maxTokens, temperature: 0.3, topLogprobs: 3 },
  });

  const content = result.content;
  const logprobsData = result.logprobs;

  // 2. 解析 JSON
  const parsed = extractJSON<Record<string, unknown>>(content);
  if (!parsed || typeof parsed !== "object") {
    return {
      data: {},
      fields: [],
      overallConfidence: 0,
      fromLogprobs: false,
    };
  }

  // 3. 校准
  let fields: FieldConfidence[];
  let fromLogprobs: boolean;

  if (logprobsData && logprobsData.length > 0) {
    const lpTokens = logprobsData.map((tl: TokenLogprob) => tl.token);
    const lpValues = logprobsData.map((tl: TokenLogprob) => tl.logprob);
    fields = calibrateFromLogprobs(content, lpTokens, lpValues, parsed);
    fromLogprobs = true;
  } else {
    fields = calibrateHeuristic(parsed);
    fromLogprobs = false;
  }

  // 4. 整体置信度
  const validFields = fields.filter((f) => f.confidence > 0);
  const overallConfidence = validFields.length > 0
    ? Math.round(validFields.reduce((s, f) => s + f.confidence, 0) / validFields.length)
    : 0;

  return { data: parsed, fields, overallConfidence, fromLogprobs };
}

/**
 * 专门用于评估实验卡片置信度
 * 对 extractJSON 返回的 experiments[0] 逐字段校准
 */
export async function calibrateExperimentFields(
  experiment: {
    name: string; date: string; operator: string; purpose: string; background: string;
    discipline: string; device: { name: string; model: string; vendor: string };
    sample: { id: string; batch: string; source: string };
    params: Array<{ name: string; value: string; unit: string }>;
    environment: { temperature: string; humidity: string; other: string };
    steps: string[]; results: string; notes: string;
  },
  sourceFiles?: Array<{ name: string; textContent: string }>,
): Promise<CalibratedResult> {
  const expJson = JSON.stringify(experiment, null, 2);
  const sourceContext = sourceFiles?.length
    ? "\n\n【原始文件内容用于校验】\n" + sourceFiles
        .map((f) => `=== ${f.name} ===\n${f.textContent.slice(0, 4000)}`)
        .join("\n\n")
    : "";

  return calibratedExtract("d8j2d4r9dhtg6s3fevfg", [
    {
      role: "user",
      content: `你是科研实验数据审核专家。对以下实验卡片的每个字段逐项评估置信度。

【评估规则】
- 如果该字段值在原始文件中有明确依据 → 高置信度 (80-100)
- 如果该字段值是合理推断但无原文直接支撑 → 中等置信度 (50-79)
- 如果该字段值为空或纯占位符（如"未识别""待确认""AI推断"）→ 低置信度 (0-49)
- aiInsights 字段和 steps 字段也需评估

输出纯JSON，每个字段附上置信度和理由（不要markdown代码块）：
{"name":"实验名","nameConfidence":95,"nameReason":"原文明确写了实验标题",...同样对 date, operator, purpose, background, discipline, results, notes 逐一评估...,
"device":{"name":"设备名","nameConfidence":90,"nameReason":"原文第3行","model":"型号","modelConfidence":70,"modelReason":"推断自上下文","vendor":"厂家","vendorConfidence":0,"vendorReason":"无法确定"},
"sample":{"id":"编号","idConfidence":85,"idReason":"...","batch":"批次","batchConfidence":60,"batchReason":"...","source":"来源","sourceConfidence":40,"sourceReason":"..."},
"params":[{"name":"参数名","nameConfidence":90,"nameReason":"...","value":"值","valueConfidence":90,"valueReason":"...","unit":"单位","unitConfidence":90,"unitReason":"..."}],
"environment":{"temperature":"温度","temperatureConfidence":80,"temperatureReason":"...","humidity":"湿度","humidityConfidence":80,"humidityReason":"...","other":"其他","otherConfidence":30,"otherReason":"..."},
"steps":["步骤1"...,"stepsConfidence":85,"stepsReason":"..."],
"overallConfidence":85,
"summary":"一句话总结：哪些字段可靠，哪些需要人工核对"}

当前实验卡片：
${expJson}${sourceContext}`,
    },
  ], 4096);
}
