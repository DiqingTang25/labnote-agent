# LabNote Agent — 剩余任务清单（给 Codex 执行）

项目路径: `D:\labnote\labnote-vault-main`
GitHub: `DiqingTang25/labnote-agent` (private)
Supabase: `kwwjdrwcvgjbjxtewbnk.supabase.co`

---

## 任务 1: 验证 TS 编译

```bash
cd D:\labnote\labnote-vault-main
npx tsc --noEmit --pretty
```

期望输出: 零错误。如果有错误，修复后再继续。

---

## 任务 2: Seed 26 个模板到 Supabase

### 背景
`src/lib/templates/presets.ts` 定义了 26 个模板（1 个通用 + 25 个专业）。Supabase 的 `templates` 表已建好（通过 SQL Editor 执行了 migration），但表为空。

### 需要做的
写一个脚本把 26 个模板插入 `templates` 表。

### 文件
- 模板定义：`src/lib/templates/presets.ts` — `ALL_PRESET_TEMPLATES` 数组
- Server function：`src/lib/api/template.functions.ts` — `seedPresetTemplates`
- Supabase 表结构：
```sql
templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  experiment_type TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT '',
  version INT DEFAULT 1,
  field_groups JSONB NOT NULL DEFAULT '[]',
  is_preset BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### 方案
A. 最简单的：在 Supabase SQL Editor 手动跑 INSERT 语句（26 条）
B. 写一个 Node 脚本，读取 presets.ts 的模板数据，调 Supabase REST API 插入
C. 在前端 workbench 加载时自动调 `seedPresetTemplates`

推荐方案 A（最快）或 B（可重复）。

### 方案 B 详细步骤
1. 把 `ALL_PRESET_TEMPLATES` 数组导出为 JSON 文件
2. 用 service_role key 调 Supabase REST API upsert

```bash
# 提取模板为 JSON
node -e "
const { ALL_PRESET_TEMPLATES } = require('./src/lib/templates/presets.ts');
// 但是 presets.ts 是 ESM...需要转成 CJS 或直接手写 JSON
"
```

实际上最直接的方式：写一个 `.cjs` 脚本，import 不行就直接把 26 个模板手写为 INSERT 语句。

### 验证
```sql
SELECT id, name, experiment_type FROM templates ORDER BY domain, name;
-- 应该返回 26 行
```

---

## 任务 3: 多 Agent 提取流水线（P1）

### 背景
当前 `runPipeline`（`src/lib/multimodal-parser.ts`）是单轮 AI 提取。需要改为三 Agent 流水线。

### 架构
```
文件上传 → Extractor Agent → properties
                ↓
          Validator Agent → 检查必填字段 + 物理约束
                ↓ pass
             入库
                ↓ fail
          Corrector Agent → 重新审视原始文件，修正可疑字段
                ↓
          Validator Agent → 再次检查 → pass/fail
```

### 需要修改的文件

#### A. `src/lib/multimodal-parser.ts`
在 `runPipeline` 的 "merging" 阶段之后、"complete" 阶段之前，插入 Validator + Corrector 步骤。

修改 `runPipeline` 函数：
```typescript
// 现有: buildFromPartials → normalizeExperiment → 入库
// 改为: buildFromPartials → normalizeExperiment → validate → correct if needed → 入库
```

#### B. 新建 `src/lib/validator-agent.ts`
- 函数 `validateExperimentDoc(doc: ExperimentDoc, template: Template): BatchResult`
- 调用 `constraint-validator.ts` 的 `validateProperties`
- 额外检查：模板的 `required` 字段是否为空（从 properties 读取判断）
- 返回：`{ passed, errors, warnings }`

#### C. 新建 `src/lib/corrector-agent.ts`
- 函数 `correctExperimentDoc(doc: ExperimentDoc, template: Template, sourceFiles: FileContent[], errors: ValidationResult[]): Promise<ExperimentDoc>`
- 构建修正 prompt：列出 Validator 发现的错误 → LLM 重新审视文件 → 修正 properties
- 使用 `buildReparsePrompt`（`prompt-builder.ts`）作为基础
- 最多重试 2 次，2 次后仍失败则标记 `properties._meta.validationFailed = true`

#### D. 调用链
在 `runPipeline` 中添加：
```typescript
// after normalizeExperiment
import { validateExperimentDoc } from './validator-agent';
import { correctExperimentDoc } from './corrector-agent';

for (const card of finalExperiments) {
  const tpl = template ?? GENERIC_TEMPLATE;
  const result = validateExperimentDoc(card, tpl);
  
  if (!result.passed && useRealAPI) {
    for (let retry = 0; retry < 2; retry++) {
      card = await correctExperimentDoc(card, tpl, fileContents, result.errors);
      const recheck = validateExperimentDoc(card, tpl);
      if (recheck.passed) break;
    }
  }
}
```

### 验证
- 上传一个有错误的 CSV（比如温度填了 -500）→ Validator 应该捕获 → Corrector 应该修正
- 上传一个正常的文件 → Validator 全 pass → 跳过 Corrector

---

## 任务 4: 前端组件适配（P2）

以下组件仍引用旧 `Experiment` 类型的字段（`.purpose`, `.device.name`, `.params` 等），需要改为从 `properties` 读取。

### A. `src/routes/compare.tsx`
- 查找所有 `experiment.purpose`, `experiment.device`, `experiment.sample`, `experiment.params` 等引用
- 替换为 `getString(experiment.properties, "purpose")` 等
- 参数/步骤列表从 properties 读取

### B. `src/routes/assets.tsx`
- `AssetCard` 组件读取 `experiment.discipline` → 改为 `getString(e.properties, "discipline")`
- 参数预览从 properties 读取

### C. `src/routes/index.tsx`
- "最近实验"列表读取 `experiment.date`, `experiment.operator` → 这些是核心列，无需改
- 其他字段从 properties 读取

### D. `src/routes/graph.tsx`
- 节点详情读取 `experiment.device?.name`, `experiment.sample?.id` → 改为从 properties 读取

### E. `src/hooks/useGraphData.ts`
- `buildGraphData` 读取字段 → 改为从 properties 读取

### F. `src/lib/graph-data.ts`
- 实体提取逻辑 → 改为从 properties 读取 `device.name`, `sample.id` 等

### 验证
- 打开每个页面，确认不报错
- `npx tsc --noEmit` 零错误

---

## 任务 5: Extra → 技能库自演化（P3）

### 背景
当同一实验类型的多个实验都在 `properties.extra` 中出现了相同字段（如 `coolingRate`），系统应该自动建议"将此字段加入模板"。

### 需要做的

#### A. `src/lib/field-patterns.ts` — 增加 `detectEmergingFields` 函数

```typescript
/**
 * 检测 extra 中高频出现的字段，建议加入模板
 */
export function detectEmergingFields(
  patterns: FieldPattern[],
  threshold: number = 0.6
): Array<{ path: string; rate: number; suggestedLabel: string }> {
  return patterns
    .filter(p => p.fieldPath.startsWith("extra.") && p.occurrenceRate >= threshold)
    .map(p => ({
      path: p.fieldPath.replace("extra.", ""),
      rate: p.occurrenceRate,
      suggestedLabel: p.fieldPath.split(".").pop() || p.fieldPath,
    }));
}
```

#### B. `src/components/fields/AddFieldDialog.tsx` — 显示"候选字段"建议
当用户点击"添加字段"时，调用 `detectEmergingFields`，在弹窗中展示：
```
🆕 发现候选字段（来自同类实验数据）:
  coolingRate — 出现于 70% 的实验  [加入模板]
  stirringSpeed — 出现于 65% 的实验 [加入模板]
```

#### C. 模板更新API — `src/lib/api/template.functions.ts`
增加 `updateTemplateFieldGroups` 函数：
```typescript
export const updateTemplateFieldGroups = createServerFn({ method: "POST" })
  .validator((data: { templateId: string; fieldGroups: FieldGroup[] }) => data)
  .handler(async ({ data }) => {
    // 更新 templates 表的 field_groups
    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from("templates")
      .update({ field_groups: data.fieldGroups, updated_at: new Date().toISOString() })
      .eq("id", data.templateId);
    return { success: !error };
  });
```

### 验证
- 创建 5 个同类型的实验，都在 extra 里有 `coolingRate`
- 在新实验的 AddFieldDialog 中看到"coolingRate 候选字段"建议
- 点击加入后，模板 fieldGroups 更新
- 下次新建同类型实验时，coolingRate 出现在卡片中

---

## 任务 6: 零样本列理解（P4）

### 背景
当前 `analyzeCSV`（`src/lib/multimodal-parser.ts`）用纯正则+统计判断列类型。遇到列名是 "τ (K)" 或 "ΔG‡" 就无法理解。

### 需要做的

在 `src/lib/multimodal-parser.ts` 的 `analyzeCSV` 函数中，增加 LLM 辅助的列类型理解：

```typescript
// 在 analyzeCSV 中，对每个列调用：
const columnHint = await chat(MODEL_TEXT, [
  { role: "user", content: `分析这个CSV列:
    列名: "${header}"
    前5个值: ${samples.join(", ")}
    判断并输出JSON:
    {"dataType":"number|text|datetime|category","physicalMeaning":"温度|浓度|时间|...","suggestedUnit":"K|mol/L|...","hasAnomalies":true|false}` }
]);
```

这样对每列的认知从"这列 70% 是数字"变成"这是温度列，单位可能是 K"。后续 Validator Agent 可以利用这个信息做更精准的校验。

### 验证
- 上传一个有非标准列名的 CSV → AI 正确识别物理含义
- 比如列名 "τ (K)" → AI 识别为 "温度，单位 K"

---

## 任务 7: DynamicCardEditor 渲染验证

### 背景
`DynamicCardEditor` 写好了但从未在浏览器渲染过。

### 需要做的

1. 启动开发服务器：`cd D:\labnote\labnote-vault-main && bun run dev`
2. 打开浏览器到 workbench 页面
3. 新建实验 → 应该看到通用模板的字段组渲染
4. 手动切换模板 → 应该看到不同模板的字段组切换
5. 修改字段值 → 检查 properties 是否正确更新
6. 保存 → 检查 Supabase 中 properties 列是否有数据

### 常见问题排查
- 如果页面白屏：检查浏览器 console 的错误
- 如果模板没渲染：检查 `getTemplate` 是否能找到模板
- 如果保存失败：检查 `updateExperimentDB` 是否正确处理 properties

---

## 执行顺序

1. 先跑任务 1（验证编译）
2. 任务 2（seed 模板）
3. 任务 7（渲染验证）— 确认 UI 能工作
4. 任务 3（多 Agent）— 核心流水线
5. 任务 4（组件适配）— 清理残留
6. 任务 5 + 6（增强功能）

每个任务完成后 `git commit` 并 `git push`。
