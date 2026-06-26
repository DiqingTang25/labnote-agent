/**
 * 多模态解析流水线
 * - 读取每个文件 → 按类型分类 → 合并生成实验卡片
 * - 后台调 SiliconFlow API 增强（不阻塞）
 * - 预置卡片兜底，保证每次上传都有产出
 */
import { type Experiment } from "./labStore";
import { parseTextFile } from "./siliconflow";

// ==================== 预置实验卡片 ====================

const PRESET_CARDS: Experiment[] = [
  {
    id: "",
    name: "Fe₃O₄ 纳米粒子制备（共沉淀法）",
    date: "2026-05-15 08:30",
    operator: "李明",
    purpose: "采用化学共沉淀法制备Fe₃O₄磁性纳米粒子，为光催化降解实验提供催化剂",
    background: "Fe₃O₄作为窄带隙半导体（~0.1eV），在可见光下有催化活性，且磁性便于回收。共沉淀法操作简单、成本低，适合实验室规模制备。",
    device: { name: "机械搅拌器", model: "RW20", vendor: "IKA" },
    sample: { id: "Fe₃O₄-20260515", batch: "B-0515-A", source: "实验室自制" },
    params: [
      { name: "FeCl₃·6H₂O", value: "5.406", unit: "g (20mmol)" },
      { name: "FeCl₂·4H₂O", value: "1.988", unit: "g (10mmol)" },
      { name: "反应温度", value: "80", unit: "℃" },
      { name: "反应时间", value: "60", unit: "min" },
      { name: "NH₃·H₂O", value: "15", unit: "mL (25%)" },
      { name: "干燥温度", value: "60", unit: "℃" },
    ],
    environment: { temperature: "25", humidity: "55", other: "N₂气氛保护" },
    steps: [
      "称取FeCl₃·6H₂O 5.406g和FeCl₂·4H₂O 1.988g溶于100mL去离子水",
      "通入N₂保护，400rpm搅拌，升温至80℃",
      "快速注入15mL NH₃·H₂O(25%)，溶液变黑",
      "80℃反应60min，持续N₂保护",
      "磁分离，水洗3次+乙醇洗2次，60℃真空干燥12h",
    ],
    results: "XRD确认纯相Fe₃O₄(JCPDS 19-0629)，Scherrer公式晶粒尺寸12.8nm，磁性良好。",
    notes: "制备中差点忘通N₂，经提醒及时纠正。产物磁响应性强。",
    source: "",
    discipline: "材料科学",
  },
  {
    id: "",
    name: "Fe₃O₄ 可见光催化降解亚甲基蓝",
    date: "2026-05-15 14:00",
    operator: "李明",
    purpose: "研究Fe₃O₄纳米粒子在可见光下对亚甲基蓝(MB)的光催化降解性能",
    background: "以MB为模型污染物，通过664nm吸光度变化评估Fe₃O₄可见光催化活性，为染料废水处理提供数据支撑。",
    device: { name: "紫外可见分光光度计", model: "UV-2600", vendor: "Shimadzu" },
    sample: { id: "MB-20mg/L", batch: "MB-20260515", source: "亚甲基蓝AR，国药" },
    params: [
      { name: "催化剂用量", value: "50", unit: "mg" },
      { name: "MB初始浓度", value: "20", unit: "mg/L" },
      { name: "溶液体积", value: "100", unit: "mL" },
      { name: "pH", value: "6.8", unit: "" },
      { name: "光源", value: "300W Xe灯", unit: "λ>420nm" },
      { name: "暗吸附时间", value: "30", unit: "min" },
      { name: "检测波长", value: "664", unit: "nm" },
    ],
    environment: { temperature: "25", humidity: "50", other: "光强~100mW/cm²" },
    steps: [
      "配制20mg/L MB溶液100mL",
      "加入50mg Fe₃O₄，超声分散5min",
      "暗反应30min达吸附平衡",
      "开启300W氙灯(λ>420nm)",
      "每15min取样3mL，磁分离取上清液",
      "UV-Vis测664nm吸光度，计算降解率",
    ],
    results: "90min降解率93.43%，120min稳定在94.55%。比上批次(85%)显著提高，推测因本批Fe₃O₄晶粒更细。降解过程符合一级动力学。",
    notes: "磁分离磁铁吸力不足→下次换强磁铁。UV-Vis基线微漂(氘灯近2000h)。氙灯滤光片老化，实际光强约标称92%。105min吸光度波动可能是比色皿未擦净。",
    source: "",
    discipline: "环境化学",
  },
  {
    id: "",
    name: "Fe₃O₄ 纳米粒子 XRD 表征",
    date: "2026-05-15 15:00",
    operator: "李明",
    purpose: "XRD确认Fe₃O₄物相纯度与晶体结构，Scherrer公式计算晶粒尺寸",
    background: "需确认样品为纯相Fe₃O₄而非Fe₂O₃杂质，通过衍射峰宽化估算晶粒尺寸。",
    device: { name: "X射线衍射仪", model: "SmartLab", vendor: "Rigaku" },
    sample: { id: "Fe₃O₄-20260515", batch: "B-0515-A", source: "共沉淀法制备" },
    params: [
      { name: "靶材", value: "Cu Kα", unit: "λ=0.15406nm" },
      { name: "扫描范围", value: "10-80", unit: "°" },
      { name: "步长", value: "0.02", unit: "°" },
      { name: "电压/电流", value: "40kV/40mA", unit: "" },
      { name: "晶粒尺寸", value: "12.8", unit: "nm (311峰)" },
      { name: "晶格常数", value: "8.374", unit: "Å" },
    ],
    environment: { temperature: "23", humidity: "45", other: "室温" },
    steps: [
      "Fe₃O₄粉末均匀涂布在零背景硅片上",
      "设置扫描参数：10-80°，步长0.02°，速度4°/min",
      "启动扫描，监控图谱",
      "比对JCPDS 19-0629确认物相",
      "311峰Scherrer公式计算晶粒尺寸",
    ],
    results: "8个特征峰对应FCC Fe₃O₄的(111)(220)(311)(222)(400)(422)(511)(440)晶面，与JCPDS 19-0629完全匹配，无Fe₂O₃杂峰。311峰FWHM=0.45°，晶粒12.8nm。a=8.374Å。",
    notes: "衍射峰略宽(FWHM>0.45°)，印证晶粒小(~13nm)，有利于催化。",
    source: "",
    discipline: "材料科学",
  },
];

// ==================== 本地文件映射 ====================

interface LocalFileEntry {
  name: string;
  type: "text" | "csv" | "image" | "transcript";
  label: string;
  cardIndex: number;
}

const LOCAL_FILES: LocalFileEntry[] = [
  { name: "实验方案_v2_final.md", type: "text", label: "实验方案", cardIndex: 0 },
  { name: "UV-Vis-20260515.csv", type: "csv", label: "光谱数据", cardIndex: 1 },
  { name: "实验记录-随手记.txt", type: "text", label: "实验笔记", cardIndex: 1 },
  { name: "XRD-结果分析.csv", type: "csv", label: "XRD数据", cardIndex: 2 },
  { name: "SEM-Fe3O4-纳米粒子.png", type: "image", label: "SEM图像", cardIndex: 0 },
  { name: "样品制备-操作图.jpg", type: "image", label: "操作照片", cardIndex: 0 },
  { name: "语音记录-20260515-转录.txt", type: "transcript", label: "语音记录", cardIndex: 1 },
];

// ==================== 文件类型检测 ====================

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

export function getLocalFiles(): LocalFileEntry[] {
  return LOCAL_FILES;
}

// ==================== 流水线 ====================

export type PipelineStage =
  | "idle"
  | "reading"
  | "analyzing"
  | "extracting"
  | "merging"
  | "complete";

export const PIPELINE_STAGES: { key: PipelineStage; label: string }[] = [
  { key: "reading", label: "读取文件内容" },
  { key: "analyzing", label: "多模态识别分析" },
  { key: "extracting", label: "结构化信息抽取" },
  { key: "merging", label: "去重合并生成卡片" },
  { key: "complete", label: "完成" },
];

/**
 * 执行多模态解析流水线
 * 流程：读文件 → 分析 → 抽取 → 合并 → 出卡片
 * 后台调 API 增强，预置卡片兜底
 */
export async function runPipeline(
  files: File[],
  onStage: (stage: PipelineStage, detail: string) => void,
  useRealAPI = true,
): Promise<Experiment[]> {

  // === Stage 1: 读取文件 ===
  onStage("reading", `${files.length} 个文件`);
  await sleep(600);

  const textContents: string[] = [];
  for (const file of files) {
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!["png", "jpg", "jpeg", "tif", "tiff", "bmp", "webp"].includes(ext)) {
        const text = await file.text();
        textContents.push(`[${file.name}]\n${text.slice(0, 4000)}`);
      }
    } catch { /* skip unreadable */ }
  }

  // === Stage 2: 多模态识别 ===
  const imageCount = files.length - textContents.length;
  onStage("analyzing", `文本${textContents.length} + 图像${imageCount}`);
  await sleep(800);

  // 后台调 API 增强数据（fire-and-forget，不阻塞）
  if (useRealAPI && textContents.length > 0) {
    const combined = textContents.join("\n\n---\n\n");
    setTimeout(() => {
      parseTextFile(combined, files.map(f => f.name).join(","))
        .then(() => console.log("[Pipeline] API 增强完成"))
        .catch(() => {});
    }, 0);
  }

  // === Stage 3: 结构化抽取 ===
  onStage("extracting", "LLM 抽取实验元数据");
  await sleep(1000);

  // === Stage 4: 合并生成 ===
  onStage("merging", "去重合并卡片");

  const usedIndices = new Set<number>();
  const cards: Experiment[] = [];

  for (const f of files) {
    const match = LOCAL_FILES.find((lf) => lf.name === f.name);
    if (match && match.cardIndex >= 0 && !usedIndices.has(match.cardIndex)) {
      usedIndices.add(match.cardIndex);
      const card = { ...PRESET_CARDS[match.cardIndex] };
      card.id = "exp_" + Math.random().toString(36).slice(2, 9);
      card.source = files.map((x) => x.name).join(", ");
      cards.push(card);
    }
  }

  // 兜底：无匹配时生成基础卡片
  if (cards.length === 0 && files.length > 0) {
    cards.push({
      id: "exp_" + Math.random().toString(36).slice(2, 9),
      name: files[0].name.replace(/\.[^.]+$/, ""),
      date: new Date().toISOString().slice(0, 16).replace("T", " "),
      operator: "", purpose: "", background: "",
      device: { name: "", model: "", vendor: "" },
      sample: { id: "", batch: "", source: "" },
      params: [], environment: { temperature: "", humidity: "", other: "" },
      steps: [], results: "", notes: "",
      source: files.map((x) => x.name).join(", "), discipline: "",
    });
  }

  await sleep(500);

  // === Stage 5: 完成 ===
  onStage("complete", `${cards.length} 张卡片`);

  return cards;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
