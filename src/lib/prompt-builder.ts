/**
 * 动态 AI Prompt 构建器
 *
 * 从 Template.fieldGroups 动态生成 AI 提取/补全/评估 prompt。
 * 不再有硬编码字段列表 — 字段全部来自模板定义。
 */

import type { Template, FieldGroup, FieldDef } from "./exp-core";

// ═══════════════════════════════════════════════════════
// 字段 Schema 生成 — AI 看到的结构示例
// ═══════════════════════════════════════════════════════

/**
 * 从模板的 fieldGroups 生成 JSON 结构示例
 * AI 更容易复制示例形状，而非记住 schema 列表
 */
function buildShapeExample(groups: FieldGroup[]): Record<string, unknown> {
  const shape: Record<string, unknown> = {};

  for (const group of groups) {
    for (const field of group.fields) {
      const parts = field.path.split(".");
      let current = shape;

      // Navigate/create nested path
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!current[key]) current[key] = {};
        current = current[key] as Record<string, unknown>;
      }

      const lastKey = parts[parts.length - 1];
      // Generate illustrative placeholder value based on type
      current[lastKey] = exampleValue(field);
    }

    // Steps group is special — array of strings
    if (group.id === "steps") {
      shape["steps"] = ["步骤1描述", "步骤2描述"];
    }
  }

  // Always include extra bucket
  shape["extra"] = { anyKey: "AI 无法归类的信息原样保留于此" };

  return shape;
}

function exampleValue(field: FieldDef): unknown {
  switch (field.type) {
    case "number": return 0;
    case "boolean": return false;
    case "select": return field.options?.[0] ?? "";
    case "table": return [];
    case "taglist": return [];
    default: return field.placeholder || "";
  }
}

// ═══════════════════════════════════════════════════════
// 通用字段提取到 properties
// ═══════════════════════════════════════════════════════

function extractCommonFields(groups: FieldGroup[]): string {
  const fields: string[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    if (group.id === "steps") continue; // handled separately
    for (const field of group.fields) {
      if (!seen.has(field.path)) {
        seen.add(field.path);
        fields.push(`"${field.path}": ${field.label}${field.required ? "（必填）" : ""}${field.unit ? ` [单位: ${field.unit}]` : ""}`);
      }
    }
  }

  return fields.join("\n");
}

// ═══════════════════════════════════════════════════════
// 主 Prompt 构建函数
// ═══════════════════════════════════════════════════════

/**
 * 构建 AI 提取 prompt — 从文件中提取实验信息
 */
export function buildExtractPrompt(template: Template): string {
  const shape = buildShapeExample(template.fieldGroups);
  const shapeJson = JSON.stringify(shape, null, 2);

  return `你是科研数据治理专家。从以下文件内容中提取实验信息。

【重要】输出纯JSON（不要markdown代码块），包含以下字段。

该实验属于「${template.name}」类型（${template.domain}领域）。
以下是该类型实验的推荐数据结构，请根据文件内容填充：

${shapeJson}

【铁律】
1. 提取文件中出现的所有信息。上述结构只是建议——文件里出现而结构中未包含的信息，
   请将新字段添加到对应的语义组中（如 dataset、model、hyperparams 等）。
2. 无法归入任何组的信息，一律放入 "extra": { "任意键名": "原样保留" }。
   例如：文件中提到了冷却速率 5K/min，但结构中无此字段 →
   "extra": { "coolingRate": "5K/min" }
3. 无法推断的字段保留默认值（""、0、false、[]），不得虚构。
4. 数组类型字段（如 steps）请保留文件中的原始顺序。
5. aiInsights 中总结数据质量、实验关联性和改进建议。

输出格式：
{
  "experiments": [{
    "name": "简洁实验名称",
    "experimentType": "${template.experimentType}",
    "date": "YYYY-MM-DD HH:mm",
    "operator": "操作人",
    "properties": ${shapeJson.slice(0, 300)}... （按上述结构填充）
  }]
}

请确保 properties 中包含所有上述结构中的字段，且保留 extra 组。`;
}

/**
 * 构建 AI 补全 prompt — 推断缺失字段
 */
export function buildAutofillPrompt(
  template: Template,
  currentProperties: Record<string, unknown>,
): string {
  const shape = buildShapeExample(template.fieldGroups);
  const currentJson = JSON.stringify(currentProperties, null, 2);

  return `你是科研实验专家。根据已有字段，推断并补全以下实验卡片中缺失或明显为占位值的信息。

【实验类型】${template.name}（${template.domain}）
【已有属性】
${currentJson}

【规则】
- 已有有效值的字段保持原样，不要改动
- 空字符串、0、"未识别"、"AI推断" 这类占位符表示缺失，需要推断
- 基于实验名称、目的、已有参数等进行合理推断
- 推断结果后面标注 "AI推断" 以便人工复核
- 无法推断的字段保持空值
- 不要删除任何已有字段
- 如有新发现的信息，放入 extra 组

【输出格式】纯JSON（不要markdown代码块），与输入的 properties 结构一致。`;
}

/**
 * 构建 AI 评估 prompt — 实验卡片质量评估
 */
export function buildEvaluatePrompt(
  template: Template,
  properties: Record<string, unknown>,
): string {
  const fieldCount = template.fieldGroups.reduce(
    (sum, g) => sum + g.fields.length,
    0,
  );
  const fieldList = extractCommonFields(template.fieldGroups);

  return `你是科研实验质量审核专家。评估以下实验卡片的完整性与可信度。

【实验类型】${template.name}（模板共 ${fieldCount} 个推荐字段）
【当前属性】
${JSON.stringify(properties, null, 2)}

【推荐字段列表】
${fieldList}

【输出格式】纯JSON（不要markdown代码块）：
{
  "trustScore": 85,
  "completeness": { "total": ${fieldCount}, "filled": 20 },
  "issues": [
    { "field": "字段路径", "severity": "high|medium|low", "suggestion": "具体建议" }
  ],
  "strengths": ["优点1"],
  "riskSummary": "一句话风险总结"
}`;
}

/**
 * 构建 AI 重新解析 prompt — 根据文件内容修正/补充实验卡片
 */
export function buildReparsePrompt(
  template: Template,
  experiment: { name: string; properties: Record<string, unknown> },
  fileContents: Array<{ name: string; textContent: string }>,
): string {
  const shape = buildShapeExample(template.fieldGroups);
  const expJson = JSON.stringify(experiment, null, 2);
  const filesText = fileContents
    .map((f) => `=== 文件: ${f.name} ===\n${f.textContent.slice(0, 6000)}`)
    .join("\n\n");

  return `你是科研数据治理专家。以下是之前已解析的实验卡片和关联文件的文本内容。
请重新分析文件内容，更新实验卡片中可能遗漏或错误的信息。

【实验类型】${template.name}（${template.domain}）

【当前实验卡片】
${expJson}

【关联文件内容】
${filesText}

【规则】
- 保留原有正确的字段值
- 如果文件内容揭示了新信息，补充到对应字段
- 如果发现原有字段与文件内容矛盾，以文件内容为准并标注"🔧修正"
- 新增信息按推荐结构组织，无法归类的放入 extra
- aiInsights 中总结本次重新解析的发现

【推荐数据结构】
${JSON.stringify(shape, null, 2).slice(0, 500)}

【输出格式】纯JSON，与输入的 properties 结构一致（不要markdown代码块）。`;
}

/**
 * 构建跨文件去重合并 prompt
 */
export function buildMergePrompt(
  template: Template,
  allResults: Array<{ fileName: string; fileType: string; rawOutput: string }>,
): string {
  const summary = allResults
    .map((r) => `[${r.fileType}] ${r.fileName}:\n${r.rawOutput.slice(0, 1500)}`)
    .join("\n\n---\n\n");

  return `你是科研实验记录管理员。以下是多个文件分别解析的结果，请去重合并，
输出最终的实验卡片列表（每个独立实验一张卡片）。

【实验类型】${template.name}

【各文件解析结果】
${summary.slice(0, 8000)}

【输出格式】严格JSON数组（不要markdown代码块）：
[{"name":"...", "experimentType":"${template.experimentType}", "date":"...", "operator":"...", "properties":{...}}]

合并规则：
- 同名同操作人同日期的实验 → 合并为一张卡片
- properties 按路径合并，有值优先
- 文件间冲突信息 → 标注在 extra.conflicts 中`;
}

// ═══════════════════════════════════════════════════════
// 实验类型分类 — 委托给 matchTemplate 的 25 模板关键词匹配
// ═══════════════════════════════════════════════════════

import { matchTemplate } from "./templates/presets";

export function classifyExperimentType(
  fileName: string,
  textSample: string,
): { type: string; confidence: "high" | "medium" | "low" } {
  const combined = `${fileName} ${textSample.slice(0, 2000)}`;

  // 先用模板关键词匹配
  const matched = matchTemplate(combined);
  if (matched) return { type: matched.id, confidence: "high" };

  // 无匹配时回退为通用
  return { type: "other", confidence: "low" };
}
