/**
 * SiliconFlow 多模态 API — 自动按文件类型选择最优模型
 * 不向 UI 暴露模型名称，仅返回解析结果
 */

const SF_BASE = "https://api.siliconflow.cn/v1";
const SF_KEY = import.meta.env.VITE_SF_API_KEY || "sk-yhzitgqarzjovxshluqqwuzoozcbnkiaiamncapwjqwooist";

// ===== 模型选择（不暴露给 UI） =====
const MODEL_TEXT = "deepseek-ai/DeepSeek-V3";        // 文本结构化提取
const MODEL_VL = "Qwen/Qwen3-VL-32B-Instruct";       // 图片理解
const MODEL_OMNI = "Qwen/Qwen3-Omni-30B-A3B-Instruct"; // 视频/音频
const MODEL_OCR = "deepseek-ai/DeepSeek-OCR";         // 文档OCR

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
const EXTRACT_PROMPT = `你是科研数据治理专家。从以下文件内容中提取实验信息，严格输出JSON（不要markdown代码块）：

{
  "experiments": [{
    "name": "简洁实验名称",
    "date": "YYYY-MM-DD 或推断",
    "operator": "操作人",
    "purpose": "实验目的",
    "background": "背景说明",
    "discipline": "学科",
    "device": {"name":"","model":"","vendor":""},
    "sample": {"id":"","batch":"","source":""},
    "params": [{"name":"","value":"","unit":""}],
    "environment": {"temperature":"","humidity":"","other":""},
    "steps": ["步骤"],
    "results": "结果摘要",
    "notes": "异常与备注",
    "source": "文件名"
  }]
}`;

export async function parseTextFile(text: string, fileName: string): Promise<string> {
  const content = text.slice(0, 8000);
  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: `${EXTRACT_PROMPT}\n\n文件名：${fileName}\n内容：\n${content}`,
    },
  ], 4096);
}

// ===== CSV 数据解析 =====
export async function parseCSV(csvContent: string, fileName: string): Promise<string> {
  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: `分析这个科研CSV数据文件（${fileName}），识别：数据类型、测量参数、关键数据点、趋势、异常值。同时提取可转化为实验卡片的信息。输出为中文JSON。\n\n${csvContent.slice(0, 4000)}`,
    },
  ], 4096);
}

// ===== 语音转录文本解析 =====
export async function parseTranscript(text: string, fileName: string): Promise<string> {
  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: `${EXTRACT_PROMPT}\n\n这是一段语音转录文本（${fileName}），包含口语化的实验记录。请提取其中的实验信息。\n\n${text.slice(0, 6000)}`,
    },
  ], 4096);
}

// ===== 视频解析（如有真视频文件） =====
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
