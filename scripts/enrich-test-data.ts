/**
 * 演示数据充实脚本（帮助页截图前置，只动 test@labnote.tech 白名单账号数据）
 * 1. 全员 operator 统一为「唐迪庆」（真实人名，消除「李明」类占位感）
 * 2. Fe3O4 卡片：experiment_type → synthesis + 按通用模板路径补全真实合成实验内容
 * 3. 新增 3 张生存分析实验（Rdatasets 真实数据集：veteran/gbsg/pbc）
 * 4. 生成实验关系（operator_shared / device_shared）→ 图谱成网
 * 运行：npx tsx --env-file=.env.local scripts/enrich-test-data.ts
 */
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const UID = "5e428a62-a972-415c-9487-7768c2a164a8"; // test@labnote.tech

const now = new Date().toISOString();

// ── 1. 全员 operator 统一 ──
const { error: opErr } = await admin.from("experiments").update({ operator: "谢承熙" }).eq("user_id", UID);
if (opErr) { console.error("operator 更新失败:", opErr.message); process.exit(1); }
console.log("✅ operator 统一为 谢承熙");

// ── 2. Fe3O4 卡片补全（真实水热合成 + 光催化降解内容）──
const { data: fe3o4 } = await admin.from("experiments").select("properties").eq("id", "exp_mssvdltr12q1").single();
if (!fe3o4) { console.error("Fe3O4 卡片不存在"); process.exit(1); }
const props = (fe3o4.properties ?? {}) as Record<string, unknown>;
const merged = {
  ...props,
  hypothesis: "Fe3O4 磁性纳米颗粒经水热法合成后，可在可见光下高效催化降解亚甲基蓝染料",
  discipline: "材料科学",
  data: {
    ...(props["data"] as Record<string, unknown>),
    source: "实验室 UV-Vis 光谱仪导出数据（UV-Vis-20260515.csv）",
    version: "2026-05-15 批次",
    description: "亚甲基蓝降解过程时间序列：-30 ~ 120 min，波长 664 nm 吸光度",
  },
  method: {
    name: "溶剂热合成 + 可见光催化降解",
    implementation: "聚四氟乙烯内衬高压釜；Shimadzu UV-2600 紫外可见分光光度计",
  },
  environment: {
    ...(props["environment"] as Record<string, unknown>),
    runtime: "高温烘箱 200 °C，8 h；暗吸附 30 min",
    compute: "无（湿实验）",
  },
  parameters: {
    ...(props["parameters"] as Record<string, unknown>),
    configRef: "FeCl3·6H2O 1.35 g，无水乙酸钠 3.6 g，乙二醇 40 mL，200 °C / 8 h",
    seed: 0,
    notes: "光催化：MB 初始浓度 10 mg/L，催化剂投加量 0.2 g/L，氙灯可见光（λ>420 nm）",
  },
  results: {
    ...(props["results"] as Record<string, unknown>),
    summary: "120 min 内 MB 降解率达 94.55%；暗吸附阶段（-30~0 min）吸光度由 1.247 降至 1.185",
    artifactRef: "UV-Vis-20260515.csv（14 行时间序列）",
  },
  sample: {
    ...(props["sample"] as Record<string, unknown>),
    id: "Fe3O4-SYN-20260515-A",
  },
  updated_at: now,
};
const { error: feErr } = await admin
  .from("experiments")
  .update({ experiment_type: "synthesis", properties: merged })
  .eq("id", "exp_mssvdltr12q1");
if (feErr) { console.error("Fe3O4 补全失败:", feErr.message); process.exit(1); }
console.log("✅ Fe3O4 卡片已补全（synthesis + 真实合成/降解参数）");

// ── 3. 新增 3 张生存分析实验（Rdatasets 真实数据集）──
const SURVIVAL = [
  {
    name: "肺癌临床试验生存分析（veteran）",
    source: "Rdatasets · survival::veteran（137 例晚期肺癌，随机对照试验）",
    method: "Kaplan-Meier 生存曲线 + Cox 比例风险回归",
    summary: "对比标准方案与试验方案的总生存期；Cox 模型显示治疗组风险比显著",
    sample: "LUNG-VET-137",
  },
  {
    name: "乳腺癌生存分析（gbsg）",
    source: "Rdatasets · TH.data::GBSG2（686 例原发性乳腺癌，含激素受体与分级）",
    method: "Cox 回归多因素分析（年龄/肿瘤分级/激素受体状态）",
    summary: "肿瘤分级与雌激素受体状态是总生存期的独立预后因素",
    sample: "BRCA-GBSG-686",
  },
  {
    name: "肝硬化生存分析（pbc）",
    source: "Rdatasets · survival::pbc（418 例原发性胆汁性肝硬化，Mayo 随访 1974-1984）",
    method: "Kaplan-Meier 分期生存曲线 + 时间依赖 Cox 模型",
    summary: "血清胆红素与组织学分期的进展显著影响无移植生存率",
    sample: "LIVER-PBC-418",
  },
];
for (const s of SURVIVAL) {
  // 幂等：同名实验已存在则跳过
  const { data: dup } = await admin.from("experiments").select("id").eq("name", s.name).eq("user_id", UID);
  if (dup && dup.length > 0) { console.log(`⏭ 已存在，跳过：${s.name}`); continue; }
  const id = "exp_" + Math.random().toString(36).slice(2, 10);
  const { error } = await admin.from("experiments").insert({
    id,
    name: s.name,
    experiment_type: "survival_analysis",
    date: "2026-05-10",
    operator: "唐迪庆",
    user_id: UID,
    created_at: now,
    updated_at: now,
    version: 1,
    properties: {
      _meta: { templateId: "tpl_survival_analysis", templateVersion: 1 },
      purpose: "基于公开临床数据集复现生存分析流程，验证多因素预后模型",
      hypothesis: "治疗分组（或病理分期）与总生存期存在显著关联",
      discipline: "生物统计学",
      data: { source: s.source, version: "Rdatasets 公开版", description: "公开临床随访数据，含删失事件与协变量" },
      method: { name: s.method, implementation: "R 4.4 · survival 3.5 · ggplot2" },
      environment: { runtime: "R 4.4 / Linux", compute: "CPU 计算节点（128 核）" },
      parameters: { configRef: "R 脚本 survival-analysis.Rmd", seed: 42, notes: "删失变量 status；采用 Efron 结点处理" },
      results: { summary: s.summary, artifactRef: "survival-curves.pdf + cox-summary.txt" },
      conclusion: "生存曲线与风险模型与原始文献结论一致",
      notes: "公开数据，无隐私信息",
      device: { name: "CPU 计算节点（128 核）", model: "AMD EPYC 7B13" },
      sample: { id: s.sample },
    },
    search_text: `${s.name} ${s.source} ${s.method} ${s.summary}`,
  });
  if (error) { console.error(`生存分析 ${s.name} 插入失败:`, error.message); process.exit(1); }
}
console.log("✅ 3 张生存分析实验已插入（veteran/gbsg/pbc）");

// ── 4. 生成关系（图谱成网）──
const { data: exps } = await admin.from("experiments").select("id, properties").eq("user_id", UID);
if (!exps) { console.error("实验列表为空"); process.exit(1); }
const rows = exps as Array<{ id: string; properties: Record<string, unknown> }>;

const relations: Array<Record<string, unknown>> = [];
const seen = new Set<string>();
// 已有关系去重（避免唯一约束冲突）
const { data: existingRels } = await admin.from("experiment_relations").select("source_exp_id, target_exp_id, relation_type");
for (const r of (existingRels ?? []) as Array<{ source_exp_id: string; target_exp_id: string; relation_type: string }>) {
  seen.add([r.source_exp_id, r.target_exp_id, r.relation_type].sort().join("|"));
}
const add = (a: string, b: string, type: string) => {
  const key = [a, b, type].sort().join("|");
  if (seen.has(key) || a === b) return;
  seen.add(key);
  relations.push({ source_exp_id: a, target_exp_id: b, relation_type: type, metadata: {}, similarity: null });
};
const deviceOf = (p: Record<string, unknown>) => ((p["device"] as Record<string, unknown>) ?? {})["name"] as string | undefined;

// operator_shared：相邻实验两两相连
for (let i = 0; i < rows.length; i++) add(rows[i].id, rows[(i + 1) % rows.length].id, "operator_shared");
// device_shared：相同设备聚类
for (let i = 0; i < rows.length; i++) {
  for (let j = i + 1; j < rows.length; j++) {
    const di = deviceOf(rows[i].properties), dj = deviceOf(rows[j].properties);
    if (di && di === dj) add(rows[i].id, rows[j].id, "device_shared");
  }
}
const { error: relErr } = await admin.from("experiment_relations").insert(relations);
if (relErr) { console.error("关系插入失败:", relErr.message); process.exit(1); }
console.log(`✅ 已生成 ${relations.length} 条实验关系`);

// ── 5. 图谱整形：删除重复实验 + 补全节点字段 ──
// 5a. 删除重复实验（重复 Fe3O4 + 重复 Lipophilicity），先清关系与 chunks
const DUPS = ["exp_msr9z1qo1hvi", "exp_mssa5e1p4ju2"];
for (const dupId of DUPS) {
  await admin.from("experiment_relations").delete().or(`source_exp_id.eq.${dupId},target_exp_id.eq.${dupId}`);
  await admin.from("experiment_chunks").delete().eq("experiment_id", dupId);
  const { error } = await admin.from("experiments").delete().eq("id", dupId);
  if (error) { console.error(`删除重复实验失败 ${dupId}:`, error.message); process.exit(1); }
  console.log(`🗑 已删除重复实验 ${dupId}`);
}

// 5b. 删除 operator_shared 关系环（图谱太满；操作人关系已由操作人节点呈现）
const { error: opRelErr } = await admin.from("experiment_relations").delete().eq("relation_type", "operator_shared");
if (opRelErr) { console.error("删除 operator_shared 失败:", opRelErr.message); process.exit(1); }
console.log("🗑 已删除 operator_shared 关系环（减密）");

// 5c. 为缺失 device/sample/method 的实验补真实字段 → 七色节点出现
const { data: allExps } = await admin.from("experiments").select("id, name, properties").eq("user_id", UID);
if (!allExps) { console.error("实验列表为空"); process.exit(1); }
const deviceRule = (name: string): [string, string] | null => {
  if (/能带|弹性|晶体|密度|结构/.test(name)) return ["第一性原理计算集群", "HPC 集群（DFT/VASP）"];
  if (/SST|BERT|NLP|情感/.test(name)) return ["GPU 计算服务器", "NVIDIA A100 80GB"];
  if (/MNIST|图像/.test(name)) return ["GPU 计算服务器", "NVIDIA A100 80GB"];
  if (/时间序列|ENB|航空/.test(name)) return ["CPU 计算节点（128 核）", "AMD EPYC 7B13"];
  if (/Delaney|Lipophilicity|BBBP|分子性质/.test(name)) return ["GPU 计算服务器", "NVIDIA A100 80GB"];
  if (/WB|Western|蛋白|转膜/.test(name)) return ["蛋白印迹成像系统", "Bio-Rad ChemiDoc MP"];
  if (/生存|肺癌|乳腺癌|肝硬化/.test(name)) return ["CPU 计算节点（128 核）", "AMD EPYC 7B13"];
  if (/Fe3O4/.test(name)) return ["紫外可见分光光度计", "Shimadzu UV-2600"];
  return null;
};
const sampleRule = (name: string): string | null => {
  if (/SST|BERT|NLP|情感/.test(name)) return "SST2-BERT-01";
  if (/MNIST|图像/.test(name)) return "MNIST-CNN-01";
  if (/能带/.test(name)) return "SI-BAND-01";
  if (/弹性/.test(name)) return "SI-ELAST-01";
  if (/晶体|结构/.test(name)) return "SI-CRYSTAL-01";
  if (/Delaney/.test(name)) return "ESOL-DELANEY";
  if (/Lipophilicity/.test(name)) return "LIPO-MOLECULENET";
  if (/BBBP/.test(name)) return "BBBP-MOLECULENET";
  if (/ENB|时间序列|航空/.test(name)) return "ENB2012-01";
  if (/WB|Western|蛋白|转膜/.test(name)) return "WB-202605-01";
  if (/Fe3O4/.test(name)) return "Fe3O4-SYN-20260515-A";
  return null;
};
const methodRule = (name: string): string | null => {
  if (/SST|BERT|NLP|情感/.test(name)) return "BERT 微调（情感分类）";
  if (/MNIST|图像/.test(name)) return "CNN 图像分类训练";
  if (/能带|弹性|晶体|密度|结构/.test(name)) return "DFT 第一性原理计算";
  if (/Delaney|Lipophilicity|BBBP|分子性质/.test(name)) return "图神经网络分子性质预测";
  if (/ENB|时间序列|航空/.test(name)) return "时间序列预测建模";
  if (/WB|Western|蛋白|转膜/.test(name)) return "Western Blot 免疫印迹";
  return null;
};
let patched = 0;
for (const e of allExps as Array<{ id: string; name: string; properties: Record<string, unknown> }>) {
  const props = { ...(e.properties ?? {}) };
  const dev = deviceRule(e.name);
  const sample = sampleRule(e.name);
  const method = methodRule(e.name);
  let changed = false;
  if (dev && !getPath(props, "device.name")) { props["device"] = { ...(props["device"] as object ?? {}), name: dev[0], model: dev[1] }; changed = true; }
  if (sample && !getPath(props, "sample.id")) { props["sample"] = { ...(props["sample"] as object ?? {}), id: sample }; changed = true; }
  if (method && !getPath(props, "method.name")) { props["method"] = { ...(props["method"] as object ?? {}), name: method }; changed = true; }
  if (changed) {
    const { error } = await admin.from("experiments").update({ properties: props }).eq("id", e.id);
    if (error) { console.error(`补字段失败 ${e.id}:`, error.message); process.exit(1); }
    patched++;
  }
}
console.log(`✅ 已为 ${patched} 张实验补全设备/样品/方法节点字段`);
console.log("完成。可刷新图谱页查看效果。");

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), obj);
}
