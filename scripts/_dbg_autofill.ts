import { chatCompletionDirect } from "../src/lib/api/ai.functions";
import { extractJSON } from "../src/lib/json-parser";

// 复现同事场景：空卡片一键补全
const prompt = `你是科研实验专家。根据已有字段，推断并补全以下实验卡片中缺失或明显为占位值的信息。

【规则】
- 已有有效值的字段保持原样，不要改动
- 空字符串、"(AI 推断 · 待确认)"、"(AI 推断型号)" 这类占位符表示缺失，需要推断
- 基于实验名称、目的、设备、样品等已有信息进行合理推断
- 推断结果后面标注 "AI推断" 以便人工复核
- 无法推断的字段保持空字符串
- 注意补充：experimentType、materials（含CAS号/纯度）、instruments（含校准状态）、protocol、hypothesis、conclusion、controls、replicates

【输出格式】纯JSON（不要markdown代码块）：
{"name":"","experimentType":"synthesis|...","date":"","operator":"","purpose":"","background":"","hypothesis":"","conclusion":"","discipline":"","device":{"name":"","model":"","vendor":""},"instruments":[{"name":"","model":"","vendor":""}],"materials":[{"name":"","role":"reactant|..."}],"sample":{"id":"","batch":"","source":""},"params":[{"name":"","value":"","unit":""}],"environment":{"temperature":"","humidity":"","other":""},"protocol":{"name":"","version":""},"steps":[""],"results":"","notes":"","controls":[{"type":"standard|...","name":""}],"replicates":1,"qcStatus":"na|pending|passed|failed","aiInsights":""}

当前实验卡片：
{"name":"新建实验","experimentType":"other","date":"","operator":"","properties":{"purpose":"","hypothesis":"","background":"","conclusion":"","discipline":"","device":{"name":"","model":""},"sample":{"id":"","batch":""},"environment":{"temperature":"","humidity":""},"results":"","notes":""}}`;

const t0 = Date.now();
const raw = await chatCompletionDirect({
  model: "d8j2d4r9dhtg6s3fevfg",
  messages: [{ role: "user", content: prompt }],
  maxTokens: 4096,
});
console.log(`响应耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s，长度 ${raw.length}`);
console.log("开头 150 字:", raw.slice(0, 150));
try {
  const data = extractJSON(raw);
  console.log("✅ extractJSON 解析成功, name:", (data as any).name, "| keys:", Object.keys(data).length);
} catch (e) {
  console.log("❌ extractJSON 失败:", (e as Error).message.slice(0, 150));
}
