/**
 * SiliconFlow 多模态 API — 自动按文件类型选择最优模型
 * 不向 UI 暴露模型名称，仅返回解析结果
 */

const SF_BASE = "https://api.siliconflow.cn/v1";
const SF_KEY = import.meta.env.VITE_SF_API_KEY || "sk-yhzitgqarzjovxshluqqwuzoozcbnkiaiamncapwjqwooist";

// ===== 模型选择（不暴露给 UI） =====
const MODEL_TEXT = "deepseek-ai/DeepSeek-V3";
const MODEL_VL = "Qwen/Qwen3-VL-32B-Instruct";
const MODEL_OMNI = "Qwen/Qwen3-Omni-30B-A3B-Instruct";
const MODEL_OCR = "deepseek-ai/DeepSeek-OCR";

export async function chat(
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  maxTokens = 2048,
): Promise<string> {
  const res = await fetch(`${SF_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SF_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ===== 文件 → base64 =====
export async function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(",");
      const mime = header.split(":")[1].split(";")[0];
      resolve({ base64, mime });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== 图片解析 =====
export async function parseImage(imageBase64: string, mime: string, fileName: string): Promise<string> {
  return chat(MODEL_VL, [
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:${mime};base64,${imageBase64}` },
        },
        {
          type: "text",
          text: `分析这张科研实验图片（${fileName}）。识别：图像类型(SEM/TEM/XRD/操作照片/其他)、材料、形貌、标尺、仪器、关键观察点。用中文JSON格式输出，不要其他文字。`,
        },
      ],
    },
  ]);
}

// ===== 文本文件 → 结构化实验数据 =====
const EXTRACT_PROMPT = `你是科研数据治理专家。从以下文件内容中提取实验信息。

【重要】输出纯JSON（不要markdown代码块），包含以下字段。aiInsights 字段用于记录AI分析中发现的非结构化洞察（关联、建议、风险、后续步骤等），请认真填写，不要留空。
{"experiments":[{"name":"简洁实验名称","date":"YYYY-MM-DD HH:mm","operator":"操作人","purpose":"实验目的","background":"背景说明","discipline":"学科","device":{"name":"设备名","model":"型号","vendor":"厂家"},"sample":{"id":"样品编号","batch":"批次","source":"来源"},"params":[{"name":"参数名","value":"值","unit":"单位"}],"environment":{"temperature":"","humidity":"","other":""},"steps":["步骤1"],"results":"结果摘要","notes":"异常备注","source":"文件名","aiInsights":"数据质量评估、实验间关联、改进建议、潜在风险等AI观察"}]}
无法推断的字段填空字符串""。`;

export async function parseTextFile(text: string, fileName: string): Promise<string> {
  const content = text.slice(0, 12000);
  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: `${EXTRACT_PROMPT}\n\n文件名：${fileName}\n内容：\n${content}`,
    },
  ], 8192);
}

// ===== CSV 预分析引擎 =====

type ColumnAnalysis = {
  name: string;
  type: "number" | "datetime" | "text";
  count: number;
  // numeric stats
  min?: number;
  max?: number;
  mean?: number;
  trend?: "上升" | "下降" | "稳定" | "波动";
  // text stats
  uniqueCount?: number;
  samples?: string[];
  // anomalies
  anomalies?: string[];
};

function analyzeCSV(csvContent: string): {
  headers: string[];
  rowCount: number;
  columns: ColumnAnalysis[];
  summary: string;
} {
  const lines = csvContent.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { headers: [], rowCount: 0, columns: [], summary: "CSV 文件为空或只有一行" };
  }

  // 检测分隔符
  const firstLine = lines[0];
  let sep = ",";
  const sepCounts = { ",": 0, "\t": 0, ";": 0 };
  for (const s of [",", "\t", ";"]) {
    sepCounts[s as keyof typeof sepCounts] = firstLine.split(s).length;
  }
  const bestSep = Object.entries(sepCounts).sort((a, b) => b[1] - a[1])[0];
  if (bestSep[1] > 1) sep = bestSep[0];

  // 解析
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells.length >= headers.length) rows.push(cells);
    else if (cells.length > 1) {
      // 补齐缺失列
      while (cells.length < headers.length) cells.push("");
      rows.push(cells);
    }
  }

  const rowCount = rows.length;

  // 逐列分析
  const columns: ColumnAnalysis[] = headers.map((name, ci) => {
    const values = rows.map((r) => r[ci] ?? "");
    const nonEmpty = values.filter((v) => v !== "" && v !== "-" && v !== "NA");

    // 类型检测
    const numValues = nonEmpty
      .map((v) => parseFloat(v))
      .filter((n) => !isNaN(n));

    const isNumeric = numValues.length > nonEmpty.length * 0.7;

    if (isNumeric) {
      const min = Math.min(...numValues);
      const max = Math.max(...numValues);
      const mean = numValues.reduce((a, b) => a + b, 0) / numValues.length;

      // 趋势检测
      let trend: ColumnAnalysis["trend"] = "稳定";
      const firstHalf = numValues.slice(0, Math.floor(numValues.length / 2));
      const secondHalf = numValues.slice(Math.floor(numValues.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const change = secondAvg - firstAvg;
      const range = max - min;
      if (range > 0) {
        const pctChange = Math.abs(change) / range;
        if (pctChange > 0.3) trend = change > 0 ? "上升" : "下降";
        else if (pctChange > 0.1) trend = "波动";
      }

      // 异常检测
      const anomalies: string[] = [];
      const stdDev = Math.sqrt(
        numValues.reduce((s, n) => s + (n - mean) ** 2, 0) / numValues.length,
      );
      for (let i = 0; i < numValues.length; i++) {
        if (Math.abs(numValues[i] - mean) > 2 * stdDev && stdDev > 0) {
          anomalies.push(`第${i + 1}行 值=${numValues[i]} (偏离均值 ${Math.abs(numValues[i] - mean).toFixed(1)})`);
        }
      }
      if (anomalies.length > 0 && anomalies.length <= 5) {
        // only report if few anomalies
      } else if (anomalies.length > 5) {
        anomalies.length = 0; // too many to be useful
      }

      return { name, type: "number" as const, count: numValues.length, min, max, mean, trend, anomalies };
    }

    // 文本列
    const unique = [...new Set(nonEmpty)];
    return {
      name,
      type: "text" as const,
      count: nonEmpty.length,
      uniqueCount: unique.length,
      samples: unique.slice(0, 5),
    };
  });

  // 生成人类可读的分析摘要
  const parts: string[] = [];
  parts.push(`CSV 文件分析：${rowCount} 行数据，${headers.length} 列\n`);

  for (const col of columns) {
    if (col.type === "number") {
      parts.push(`列 [${col.name}]: 数值型, 范围 ${col.min} ~ ${col.max}, 均值 ${col.mean?.toFixed(2)}, 趋势: ${col.trend}`);
      if (col.anomalies && col.anomalies.length > 0) {
        parts.push(`  ⚠️ 异常点: ${col.anomalies.join("; ")}`);
      }
    } else {
      parts.push(`列 [${col.name}]: 文本型, ${col.uniqueCount} 种不同值, 示例: ${col.samples?.join(", ")}`);
    }
  }

  return { headers, rowCount, columns, summary: parts.join("\n") };
}

// ===== CSV 数据解析（带预分析）=====
export async function parseCSV(csvContent: string, fileName: string): Promise<string> {
  const analysis = analyzeCSV(csvContent);
  const rawSample = csvContent.slice(0, 1000);

  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: `分析这个科研 CSV 数据文件（${fileName}）。

【数据预分析结果】
${analysis.summary}

【原始数据样本（前几行）】
${rawSample}

请根据预分析结果判断实验数据类型，提取可转化为实验卡片的信息。aiInsights 中写明数据质量（是否有缺失/异常）、趋势判断、后续建议。
输出格式（纯JSON，不要markdown代码块）：
${EXTRACT_PROMPT.slice(EXTRACT_PROMPT.indexOf("{"))}`,
    },
  ], 8192);
}

// ===== 语音转录文本解析 =====
export async function parseTranscript(text: string, fileName: string): Promise<string> {
  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: `${EXTRACT_PROMPT}\n\n这是一段语音转录文本（${fileName}），包含口语化的实验记录。注意口语中可能有隐含信息（语气强调的异常、模糊的时间表述等），请提取并在aiInsights中标注。\n\n${text.slice(0, 10000)}`,
    },
  ], 8192);
}

// ===== 视频解析 =====
export async function parseVideo(videoBase64: string, mime: string, fileName: string): Promise<string> {
  return chat(MODEL_OMNI, [
    {
      role: "user",
      content: [
        {
          type: "video_url",
          video_url: { url: `data:${mime};base64,${videoBase64}` },
        },
        {
          type: "text",
          text: `分析这个实验视频（${fileName}）：实验操作步骤、使用的设备、关键实验条件、异常操作。用中文JSON输出。`,
        },
      ],
    },
  ], 4096);
}

// ===== 音频解析 =====
export async function parseAudio(audioBase64: string, mime: string): Promise<string> {
  return chat(MODEL_OMNI, [
    {
      role: "user",
      content: [
        {
          type: "audio_url",
          audio_url: { url: `data:${mime};base64,${audioBase64}` },
        },
        {
          type: "text",
          text: "将这段语音转写为中文文字，然后从中提取实验相关信息（日期、样品、操作、结果、问题）。输出JSON。",
        },
      ],
    },
  ], 4096);
}

// ===== 综合解析结果，去重合并为最终实验卡片 =====
export async function mergeResults(
  allResults: Array<{ fileName: string; fileType: string; rawOutput: string }>,
): Promise<string> {
  const summary = allResults
    .map((r) => `[${r.fileType}] ${r.fileName}:\n${r.rawOutput.slice(0, 1500)}`)
    .join("\n\n---\n\n");

  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: `你是科研实验记录管理员。以下是多个文件分别解析的结果，请去重合并，输出最终的实验卡片列表（每个独立实验一张卡片）。严格输出JSON数组（不要markdown代码块）：\n\n${summary.slice(0, 8000)}`,
    },
  ], 4096);
}
