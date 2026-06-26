/**
 * LabNote Agent - 全局实验数据 store
 * 使用 React Context + useState 提供前端模拟数据存储
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Param = { name: string; value: string; unit: string };

export type Experiment = {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD HH:mm
  operator: string;
  purpose: string;
  background: string;
  device: { name: string; model: string; vendor: string };
  sample: { id: string; batch: string; source: string };
  params: Param[];
  environment: { temperature: string; humidity: string; other: string };
  steps: string[];
  results: string;
  notes: string;
  source: string;
  discipline: string;
};

const newId = () => "exp_" + Math.random().toString(36).slice(2, 9);

// 预置示例实验
const seed: Experiment[] = [
  {
    id: newId(),
    name: "Fe-2309 管式炉退火工艺优化",
    date: "2026-05-28 14:30",
    operator: "张子萱",
    purpose: "探索退火温度对铁基样品晶粒尺寸的影响",
    background: "前期 XRD 结果显示晶粒尺寸偏小，需优化热处理工艺。",
    device: { name: "管式炉", model: "OTF-1200X", vendor: "合肥科晶" },
    sample: { id: "Fe-2309", batch: "B-20260520", source: "课题组自制" },
    params: [
      { name: "退火温度", value: "550", unit: "℃" },
      { name: "保温时间", value: "60", unit: "min" },
      { name: "升温速率", value: "5", unit: "℃/min" },
      { name: "气氛", value: "Ar", unit: "" },
    ],
    environment: { temperature: "24", humidity: "45", other: "标准实验室环境" },
    steps: [
      "称取 Fe-2309 样品 0.5g 放入瓷舟",
      "通入氩气置换炉腔空气 15 min",
      "以 5 ℃/min 升温至 550 ℃",
      "保温 60 min",
      "自然冷却至室温后取出",
    ],
    results: "样品颜色由灰黑色转为银灰色，待 XRD 表征。",
    notes: "升温过程中第 40 min 出现短暂温度波动 ±3 ℃。",
    source: "示例数据",
    discipline: "材料科学",
  },
  {
    id: newId(),
    name: "CuO 纳米片水热合成",
    date: "2026-05-25 09:10",
    operator: "李文博",
    purpose: "合成片状 CuO 用于电催化测试",
    background: "",
    device: { name: "水热反应釜", model: "100mL-PTFE", vendor: "" },
    sample: { id: "CuO-0525", batch: "", source: "" },
    params: [
      { name: "反应温度", value: "180", unit: "℃" },
      { name: "反应时间", value: "12", unit: "h" },
      { name: "前驱体浓度", value: "0.1", unit: "M" },
    ],
    environment: { temperature: "", humidity: "", other: "" },
    steps: ["配制 Cu(NO3)2 溶液", "加入 NaOH 调节 pH", "180℃ 水热反应 12h"],
    results: "得到蓝黑色沉淀，SEM 待测。",
    notes: "缺少前驱体批次与设备厂家信息。",
    source: "示例数据",
    discipline: "材料科学",
  },
  {
    id: newId(),
    name: "Pt/C 电极 CV 循环测试",
    date: "2026-05-20 16:45",
    operator: "王思琪",
    purpose: "评估 Pt/C 电极在酸性介质中的电化学稳定性",
    background: "对比商用 20% Pt/C 与自制催化剂的活性差异。",
    device: { name: "电化学工作站", model: "CHI760E", vendor: "上海辰华" },
    sample: { id: "PtC-Lab-03", batch: "B-20260518", source: "自制" },
    params: [
      { name: "扫描速率", value: "50", unit: "mV/s" },
      { name: "电位窗口", value: "0~1.2", unit: "V" },
      { name: "循环圈数", value: "1000", unit: "cycle" },
      { name: "电解液", value: "0.5 M H2SO4", unit: "" },
    ],
    environment: { temperature: "25", humidity: "50", other: "N2 饱和" },
    steps: [
      "组装三电极体系（工作/对/参比）",
      "N2 鼓泡 30 min 除氧",
      "0~1.2V 区间扫描 1000 圈",
      "记录前后 ECSA 变化",
    ],
    results: "1000 圈后 ECSA 衰减约 18%，第 320 圈观察到电流异常尖峰。",
    notes: "电流异常可能与气泡附着有关。",
    source: "示例数据",
    discipline: "化学",
  },
];

type Ctx = {
  experiments: Experiment[];
  addExperiment: (e: Experiment) => void;
  updateExperiment: (id: string, patch: Partial<Experiment>) => void;
  deleteExperiment: (id: string) => void;
  getById: (id: string) => Experiment | undefined;
  profile: { name: string; org: string; discipline: Experiment["discipline"] };
  setProfile: (p: Ctx["profile"]) => void;
};

const LabCtx = createContext<Ctx | null>(null);

export function LabProvider({ children }: { children: ReactNode }) {
  const [experiments, setExperiments] = useState<Experiment[]>(seed);
  const [profile, setProfile] = useState<Ctx["profile"]>({
    name: "研究员",
    org: "智能材料课题组",
    discipline: "材料科学",
  });

  const addExperiment = useCallback(
    (e: Experiment) => setExperiments((arr) => [e, ...arr]),
    [],
  );
  const updateExperiment = useCallback(
    (id: string, patch: Partial<Experiment>) =>
      setExperiments((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    [],
  );
  const deleteExperiment = useCallback(
    (id: string) => setExperiments((arr) => arr.filter((x) => x.id !== id)),
    [],
  );
  const getById = useCallback(
    (id: string) => experiments.find((x) => x.id === id),
    [experiments],
  );

  return (
    <LabCtx.Provider
      value={{
        experiments,
        addExperiment,
        updateExperiment,
        deleteExperiment,
        getById,
        profile,
        setProfile,
      }}
    >
      {children}
    </LabCtx.Provider>
  );
}

export function useLab() {
  const ctx = useContext(LabCtx);
  if (!ctx) throw new Error("useLab must be used within LabProvider");
  return ctx;
}

// 工具：基于文件名生成模拟卡片
export function mockCardFromFile(fileName: string): Experiment {
  const lower = fileName.toLowerCase();
  const base: Experiment = {
    id: newId(),
    name: `解析自 ${fileName}`,
    date: new Date().toISOString().slice(0, 16).replace("T", " "),
    operator: "未识别",
    purpose: "",
    background: "",
    device: { name: "", model: "", vendor: "" },
    sample: { id: "", batch: "", source: "" },
    params: [],
    environment: { temperature: "", humidity: "", other: "" },
    steps: [],
    results: "",
    notes: "通过多模态解析自动生成，建议人工复核。",
    source: "文件上传",
    discipline: "材料科学",
  };
  if (lower.includes("xrd")) {
    base.name = "XRD 表征记录（自动解析）";
    base.device = { name: "X 射线衍射仪", model: "D8 Advance", vendor: "Bruker" };
    base.params = [
      { name: "扫描角度", value: "10-80", unit: "°" },
      { name: "扫描速率", value: "5", unit: "°/min" },
      { name: "靶材", value: "Cu Kα", unit: "" },
    ];
    base.results = "出现 (110)、(200) 衍射峰，与铁基相吻合。";
  } else if (lower.includes("sem")) {
    base.name = "SEM 形貌观察（自动解析）";
    base.device = { name: "扫描电镜", model: "SU8010", vendor: "Hitachi" };
    base.params = [
      { name: "加速电压", value: "5", unit: "kV" },
      { name: "工作距离", value: "8", unit: "mm" },
    ];
  } else if (lower.includes("cv") || lower.includes("电化学")) {
    base.name = "电化学 CV 测试（自动解析）";
    base.device = { name: "电化学工作站", model: "CHI760E", vendor: "上海辰华" };
    base.params = [
      { name: "扫描速率", value: "50", unit: "mV/s" },
      { name: "电位窗口", value: "0~1.2", unit: "V" },
    ];
  } else if (lower.endsWith(".xlsx") || lower.endsWith(".csv")) {
    base.name = "表格数据导入（自动解析）";
    base.results = "已识别 3 个数据列，请在结果区粘贴关键数据。";
  } else if (lower.endsWith(".pdf") || lower.endsWith(".docx")) {
    base.name = "文献/报告解析";
    base.purpose = "从文档中抽取实验方法学信息";
    base.params = [
      { name: "反应温度", value: "180", unit: "℃" },
      { name: "反应时间", value: "12", unit: "h" },
    ];
  }
  return base;
}

// 工具：从语音文本生成卡片
export function mockCardFromVoice(text: string): Experiment {
  const tempMatch = text.match(/(\d+(?:\.\d+)?)\s*[℃度]/);
  const timeMatch = text.match(/(\d+)\s*(分钟|min|小时|h)/);
  const sampleMatch = text.match(/([A-Z][a-z]?-\d+)/);
  return {
    id: newId(),
    name: text.length > 24 ? text.slice(0, 24) + "..." : text,
    date: new Date().toISOString().slice(0, 16).replace("T", " "),
    operator: "语音记录",
    purpose: "",
    background: "",
    device: text.includes("管式炉")
      ? { name: "管式炉", model: "OTF-1200X", vendor: "合肥科晶" }
      : { name: "", model: "", vendor: "" },
    sample: sampleMatch
      ? { id: sampleMatch[1], batch: "", source: "" }
      : { id: "", batch: "", source: "" },
    params: [
      ...(tempMatch ? [{ name: "温度", value: tempMatch[1], unit: "℃" }] : []),
      ...(timeMatch
        ? [{ name: "时间", value: timeMatch[1], unit: timeMatch[2] }]
        : []),
      ...(text.includes("氩气") ? [{ name: "气氛", value: "Ar", unit: "" }] : []),
    ],
    environment: { temperature: "", humidity: "", other: "" },
    steps: [text],
    results: "",
    notes: "由语音 ASR 模拟生成，建议补充设备型号与样品批次。",
    source: "语音录入模拟",
    discipline: "材料科学",
  };
}

// 完整性检查：返回缺失字段列表
export function checkCompleteness(e: Experiment): string[] {
  const miss: string[] = [];
  if (!e.operator || e.operator === "未识别") miss.push("实验人员");
  if (!e.purpose) miss.push("实验目的");
  if (!e.device.model) miss.push("设备型号");
  if (!e.device.vendor) miss.push("设备厂家");
  if (!e.sample.id) miss.push("样品编号");
  if (!e.sample.batch) miss.push("样品批次");
  if (!e.environment.temperature) miss.push("环境温度");
  if (e.steps.length < 2) miss.push("详细实验步骤（至少 2 步）");
  if (!e.results) miss.push("结果数据描述");
  e.params.forEach((p) => {
    if (p.value && !p.unit && !["气氛", "电解液"].includes(p.name))
      miss.push(`参数「${p.name}」缺少单位`);
  });
  if (e.params.length === 0) miss.push("关键实验参数");
  return miss;
}

// 生成 Methods 段落
export function generateMethods(e: Experiment): string {
  const paramStr = e.params
    .map((p) => `${p.name} ${p.value}${p.unit ? " " + p.unit : ""}`)
    .join("，");
  return `实验于 ${e.date} 由 ${e.operator || "操作人员"} 完成。采用 ${
    e.device.vendor || "（厂家）"
  } ${e.device.name || "（设备）"}（型号 ${e.device.model || "N/A"}）对样品 ${
    e.sample.id || "（样品编号）"
  }（批次 ${e.sample.batch || "N/A"}）进行处理。主要实验参数为：${
    paramStr || "（待补充）"
  }。实验流程如下：${
    e.steps.length ? e.steps.map((s, i) => `(${i + 1}) ${s}`).join("；") : "（待补充）"
  }。环境条件：温度 ${e.environment.temperature || "N/A"} ℃，湿度 ${
    e.environment.humidity || "N/A"
  } %。${e.results ? "结果：" + e.results : ""}`;
}

// RAG 问答模拟
export function ragAnswer(question: string, experiments: Experiment[]): string {
  const q = question.toLowerCase();
  // 样品检索
  const sampleMatch = question.match(/([A-Z][a-z]?-\d+)/);
  if (sampleMatch) {
    const hits = experiments.filter((e) => e.sample.id === sampleMatch[1]);
    if (hits.length) {
      const e = hits[0];
      const temp = e.params.find((p) => p.name.includes("温度"));
      return `命中 ${hits.length} 条记录。样品 ${sampleMatch[1]} 最近一次实验（${e.date}）${
        temp ? `相关温度为 ${temp.value}${temp.unit}` : "未直接记录温度参数"
      }。详见实验「${e.name}」。`;
    }
    return `知识库中暂无样品 ${sampleMatch[1]} 的相关记录。`;
  }
  if (q.includes("异常") || q.includes("故障") || q.includes("问题")) {
    const hits = experiments.filter(
      (e) => /异常|故障|波动|尖峰|失败/.test(e.notes + e.results),
    );
    return hits.length
      ? `检索到 ${hits.length} 条含异常记录：` +
          hits.map((e) => `「${e.name}」(${e.date})`).join("、")
      : "未发现异常记录。";
  }
  if (q.includes("退火") || q.includes("温度")) {
    const hits = experiments.filter((e) =>
      e.params.some((p) => p.name.includes("温度")),
    );
    return `共 ${hits.length} 条实验包含温度参数。例如：${hits
      .slice(0, 3)
      .map((e) => {
        const t = e.params.find((p) => p.name.includes("温度"));
        return `「${e.name}」温度 ${t?.value}${t?.unit}`;
      })
      .join("；")}。`;
  }
  if (q.includes("结论") || q.includes("支持") || q.includes("论文")) {
    return "基于现有 " + experiments.length + " 条实验记录，参数趋势与结论方向一致；建议补充重复性实验（建议 ≥3 次）以提升统计显著性。";
  }
  if (q.includes("设备") || q.includes("仪器")) {
    const devices = Array.from(
      new Set(experiments.map((e) => e.device.name).filter(Boolean)),
    );
    return `知识库涉及设备：${devices.join("、") || "暂无"}。`;
  }
  return `已在 ${experiments.length} 条实验记录中检索。建议尝试：① 输入样品编号（如 Fe-2309）② 询问"异常实验" ③ 询问"退火温度" ④ 询问"使用了哪些设备" ⑤ 询问结论支撑情况。`;
}
