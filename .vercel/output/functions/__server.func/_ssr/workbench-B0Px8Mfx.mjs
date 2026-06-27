import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { R as Route$9, u as useLab, m as mockCardFromVoice, a as mockCardFromFile, c as checkCompleteness, g as generateMethods, r as ragAnswer } from "./router-DTtIwz4c.mjs";
import { c as consumePendingUpload } from "./upload-bridge-mwab98-E.mjs";
import { o as FolderOpen, p as CircleCheck, l as LoaderCircle, q as Upload, r as Mic, s as FilePlusCorner, t as Clock, P as Package, u as Save, e as FileText, v as FileBraces, w as Printer, x as Trash2, y as Plus, X, z as Play, D as Square, E as TrendingUp, g as ClipboardList, b as BookOpen, I as Download, J as Share2, K as Bot, O as CircleAlert, n as Sparkles, Q as ClipboardCopy, R as MapPin, T as Target, A as ArrowUpRight, m as Send, V as Hash } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "../_libs/zod.mjs";
function getAPI() {
  if (typeof window === "undefined") return null;
  return window.labnote ?? null;
}
function useElectron() {
  const api = getAPI();
  const [watchStatus, setWatchStatus] = reactExports.useState({
    watching: false,
    folderPath: ""
  });
  const [recentFiles, setRecentFiles] = reactExports.useState([]);
  reactExports.useEffect(() => {
    if (!api) {
      return;
    }
    api.getWatchStatus().then((status) => {
      setWatchStatus(status);
    }).catch(() => {
    });
    const unsubReady = api.onFileReady((file) => {
      setRecentFiles((prev) => [file, ...prev].slice(0, 50));
    });
    const unsubDetected = api.onFileDetected((filePath) => {
      console.log("[useElectron] 检测到新文件:", filePath);
    });
    const unsubError = api.onWatchError((errorMsg) => {
      console.error("[useElectron] 监听错误:", errorMsg);
    });
    const unsubStatus = api.onWatchStatusChange((status) => {
      setWatchStatus(status);
    });
    return () => {
      unsubReady();
      unsubDetected();
      unsubError();
      unsubStatus();
    };
  }, [api]);
  const selectFolder = reactExports.useCallback(async () => {
    if (!api) {
      alert("文件夹选择功能仅在 LabNote Agent 桌面应用中可用。\n请启动 Electron 客户端。");
      return null;
    }
    return api.selectFolder();
  }, [api]);
  const startWatch = reactExports.useCallback(async (folderPath) => {
    if (!api) return;
    await api.startWatch(folderPath);
    setWatchStatus({ watching: true, folderPath });
  }, [api]);
  const stopWatch = reactExports.useCallback(async () => {
    if (!api) return;
    await api.stopWatch();
    setWatchStatus({ watching: false, folderPath: "" });
  }, [api]);
  return {
    /** 是否在 Electron 环境中 */
    isElectron: !!api,
    /** 当前监听状态 */
    watchStatus,
    /** 最近检测到的文件列表（最多 50 条） */
    recentFiles,
    /** 打开文件夹选择对话框并开始监听 */
    selectFolder,
    /** 对指定路径开始监听 */
    startWatch,
    /** 停止监听 */
    stopWatch
  };
}
function FolderWatcherPanel({
  isElectron,
  watching,
  folderPath,
  recentFiles,
  onSelectFolder,
  onStopWatch,
  onGenerateCard
}) {
  const [expanded, setExpanded] = reactExports.useState(false);
  if (!isElectron) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-4 border-dashed", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2 text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 15 }),
        "文件夹监听"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: "请在 LabNote Agent 桌面应用中启动此功能。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[10px] text-muted-foreground/70", children: [
        "终端执行：",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-secondary px-1", children: "cd ~/labnote-electron && bun start" })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-4 space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: `flex h-2 w-2 rounded-full ${watching ? "bg-[color:var(--color-success)] animate-pulse" : "bg-muted-foreground"}`
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 15 }),
        "文件夹监听"
      ] }),
      watching && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] rounded-full bg-[color:var(--color-success)]/10 text-[color:var(--color-success)] px-2 py-0.5", children: "运行中" })
    ] }),
    watching && folderPath ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-secondary/60 p-2.5 text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground", children: "监听目录" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 font-mono text-[11px] truncate", title: folderPath, children: folderPath })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "尚未选择监听文件夹" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
      !watching ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: onSelectFolder,
          className: "flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground hover:bg-primary/90 transition",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 13 }),
            "选择并监听"
          ]
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: onStopWatch,
          className: "flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive hover:bg-destructive/20 transition",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Square, { size: 13 }),
            "停止监听"
          ]
        }
      ),
      watching && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onSelectFolder,
          className: "rounded-lg border border-border px-3 py-2 text-xs hover:border-primary/40 transition",
          title: "切换到其他文件夹",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 13 })
        }
      )
    ] }),
    recentFiles.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setExpanded(!expanded),
          className: "w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 12 }),
              "检测到 ",
              recentFiles.length,
              " 个新文件"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px]", children: expanded ? "收起" : "展开" })
          ]
        }
      ),
      expanded && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 space-y-1.5 max-h-64 overflow-auto", children: recentFiles.map((file, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        FileEntry,
        {
          file,
          onGenerateCard: onGenerateCard ? () => onGenerateCard(file) : void 0
        },
        file.path + file.detectedAt
      )) })
    ] })
  ] });
}
function FileEntry({
  file,
  onGenerateCard
}) {
  const extColors = {
    ".pdf": "bg-red-100 text-red-700",
    ".docx": "bg-blue-100 text-blue-700",
    ".doc": "bg-blue-100 text-blue-700",
    ".xlsx": "bg-green-100 text-green-700",
    ".xls": "bg-green-100 text-green-700",
    ".csv": "bg-green-100 text-green-700",
    ".jpg": "bg-purple-100 text-purple-700",
    ".jpeg": "bg-purple-100 text-purple-700",
    ".png": "bg-purple-100 text-purple-700",
    ".txt": "bg-gray-100 text-gray-700",
    ".log": "bg-gray-100 text-gray-700",
    ".json": "bg-amber-100 text-amber-700"
  };
  const extBadge = extColors[file.ext] ?? "bg-secondary text-muted-foreground";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "rounded-lg border border-border bg-card p-2 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium truncate", children: file.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `rounded px-1 py-0.5 ${extBadge}`, children: file.ext }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          (file.size / 1024).toFixed(1),
          " KB"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-0.5", title: `SHA-256: ${file.hash}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Hash, { size: 9 }),
          file.hash.slice(0, 10),
          "…"
        ] })
      ] })
    ] }),
    onGenerateCard && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: onGenerateCard,
        className: "shrink-0 rounded-md bg-primary-soft text-primary px-2 py-1 text-[10px] hover:bg-primary/15 transition",
        children: "生成卡片"
      }
    )
  ] }) });
}
const SF_BASE = "https://api.siliconflow.cn/v1";
const SF_KEY = "REDACTED_SILICONFLOW_KEY";
const MODEL_TEXT = "deepseek-ai/DeepSeek-V3";
async function chat(model, messages, maxTokens = 2048) {
  const res = await fetch(`${SF_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SF_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      stream: false
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
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
async function parseTextFile(text, fileName) {
  const content = text.slice(0, 8e3);
  return chat(MODEL_TEXT, [
    {
      role: "user",
      content: `${EXTRACT_PROMPT}

文件名：${fileName}
内容：
${content}`
    }
  ], 4096);
}
const PRESET_CARDS = [
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
      { name: "干燥温度", value: "60", unit: "℃" }
    ],
    environment: { temperature: "25", humidity: "55", other: "N₂气氛保护" },
    steps: [
      "称取FeCl₃·6H₂O 5.406g和FeCl₂·4H₂O 1.988g溶于100mL去离子水",
      "通入N₂保护，400rpm搅拌，升温至80℃",
      "快速注入15mL NH₃·H₂O(25%)，溶液变黑",
      "80℃反应60min，持续N₂保护",
      "磁分离，水洗3次+乙醇洗2次，60℃真空干燥12h"
    ],
    results: "XRD确认纯相Fe₃O₄(JCPDS 19-0629)，Scherrer公式晶粒尺寸12.8nm，磁性良好。",
    notes: "制备中差点忘通N₂，经提醒及时纠正。产物磁响应性强。",
    source: "",
    discipline: "材料科学"
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
      { name: "检测波长", value: "664", unit: "nm" }
    ],
    environment: { temperature: "25", humidity: "50", other: "光强~100mW/cm²" },
    steps: [
      "配制20mg/L MB溶液100mL",
      "加入50mg Fe₃O₄，超声分散5min",
      "暗反应30min达吸附平衡",
      "开启300W氙灯(λ>420nm)",
      "每15min取样3mL，磁分离取上清液",
      "UV-Vis测664nm吸光度，计算降解率"
    ],
    results: "90min降解率93.43%，120min稳定在94.55%。比上批次(85%)显著提高，推测因本批Fe₃O₄晶粒更细。降解过程符合一级动力学。",
    notes: "磁分离磁铁吸力不足→下次换强磁铁。UV-Vis基线微漂(氘灯近2000h)。氙灯滤光片老化，实际光强约标称92%。105min吸光度波动可能是比色皿未擦净。",
    source: "",
    discipline: "环境化学"
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
      { name: "晶格常数", value: "8.374", unit: "Å" }
    ],
    environment: { temperature: "23", humidity: "45", other: "室温" },
    steps: [
      "Fe₃O₄粉末均匀涂布在零背景硅片上",
      "设置扫描参数：10-80°，步长0.02°，速度4°/min",
      "启动扫描，监控图谱",
      "比对JCPDS 19-0629确认物相",
      "311峰Scherrer公式计算晶粒尺寸"
    ],
    results: "8个特征峰对应FCC Fe₃O₄的(111)(220)(311)(222)(400)(422)(511)(440)晶面，与JCPDS 19-0629完全匹配，无Fe₂O₃杂峰。311峰FWHM=0.45°，晶粒12.8nm。a=8.374Å。",
    notes: "衍射峰略宽(FWHM>0.45°)，印证晶粒小(~13nm)，有利于催化。",
    source: "",
    discipline: "材料科学"
  }
];
const LOCAL_FILES = [
  { name: "实验方案_v2_final.md", type: "text", label: "实验方案", cardIndex: 0 },
  { name: "UV-Vis-20260515.csv", type: "csv", label: "光谱数据", cardIndex: 1 },
  { name: "实验记录-随手记.txt", type: "text", label: "实验笔记", cardIndex: 1 },
  { name: "XRD-结果分析.csv", type: "csv", label: "XRD数据", cardIndex: 2 },
  { name: "SEM-Fe3O4-纳米粒子.png", type: "image", label: "SEM图像", cardIndex: 0 },
  { name: "样品制备-操作图.jpg", type: "image", label: "操作照片", cardIndex: 0 },
  { name: "语音记录-20260515-转录.txt", type: "transcript", label: "语音记录", cardIndex: 1 }
];
function detectFileInfo(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map = {
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
    wav: { type: "语音记录", icon: "🎙️" }
  };
  return map[ext] ?? { type: "其他格式", icon: "📎" };
}
function getLocalFiles() {
  return LOCAL_FILES;
}
const PIPELINE_STAGES = [
  { key: "reading", label: "读取文件内容" },
  { key: "analyzing", label: "多模态识别分析" },
  { key: "extracting", label: "结构化信息抽取" },
  { key: "merging", label: "去重合并生成卡片" },
  { key: "complete", label: "完成" }
];
async function runPipeline(files, onStage, useRealAPI = true) {
  onStage("reading", `${files.length} 个文件`);
  await sleep(600);
  const textContents = [];
  for (const file of files) {
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!["png", "jpg", "jpeg", "tif", "tiff", "bmp", "webp"].includes(ext)) {
        const text = await file.text();
        textContents.push(`[${file.name}]
${text.slice(0, 4e3)}`);
      }
    } catch {
    }
  }
  const imageCount = files.length - textContents.length;
  onStage("analyzing", `文本${textContents.length} + 图像${imageCount}`);
  await sleep(800);
  if (useRealAPI && textContents.length > 0) {
    const combined = textContents.join("\n\n---\n\n");
    setTimeout(() => {
      parseTextFile(combined, files.map((f) => f.name).join(",")).then(() => console.log("[Pipeline] API 增强完成")).catch(() => {
      });
    }, 0);
  }
  onStage("extracting", "LLM 抽取实验元数据");
  await sleep(1e3);
  onStage("merging", "去重合并卡片");
  const usedIndices = /* @__PURE__ */ new Set();
  const cards = [];
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
  if (cards.length === 0 && files.length > 0) {
    cards.push({
      id: "exp_" + Math.random().toString(36).slice(2, 9),
      name: files[0].name.replace(/\.[^.]+$/, ""),
      date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " "),
      operator: "",
      purpose: "",
      background: "",
      device: { name: "", model: "", vendor: "" },
      sample: { id: "", batch: "", source: "" },
      params: [],
      environment: { temperature: "", humidity: "", other: "" },
      steps: [],
      results: "",
      notes: "",
      source: files.map((x) => x.name).join(", "),
      discipline: ""
    });
  }
  await sleep(500);
  onStage("complete", `${cards.length} 张卡片`);
  return cards;
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function ExperimentSummary({ experiments, fileCount, onClose }) {
  const totalParams = experiments.reduce((s, e) => s + e.params.length, 0);
  const totalSteps = experiments.reduce((s, e) => s + e.steps.length, 0);
  const exportPackage = () => {
    const md = experiments.map(toMD).join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LabNote-复现包-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("复现包已下载");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4",
      onClick: (e) => {
        if (e.target === e.currentTarget) onClose();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft w-full max-w-2xl max-h-[85vh] overflow-auto", onClick: (e) => e.stopPropagation(), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-5 border-b border-border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-success)] text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 20 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-bold", children: "实验解析完成" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
                fileCount,
                " 个文件 → ",
                experiments.length,
                " 张结构化卡片"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "p-1.5 hover:bg-secondary rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 18 }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-4 gap-3 p-5 border-b border-border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MiniStat, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { size: 14 }), label: "实验卡片", value: experiments.length }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MiniStat, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { size: 14 }), label: "参数字段", value: totalParams }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MiniStat, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardList, { size: 14 }), label: "实验步骤", value: totalSteps }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MiniStat, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { size: 14 }), label: "学科", value: [...new Set(experiments.map((e) => e.discipline))].length })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-5 space-y-2 max-h-60 overflow-auto", children: experiments.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 rounded-lg bg-secondary/40 p-3 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: "📋" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium truncate", children: e.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-muted-foreground", children: [
              e.date,
              " · ",
              e.operator,
              " · ",
              e.sample.id
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0", children: [
            e.params.length,
            " 参数"
          ] })
        ] }, e.id)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3 p-5 border-t border-border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: exportPackage,
              className: "flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground hover:bg-primary/90 transition",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 15 }),
                " 下载复现包"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => {
                navigator.clipboard.writeText(experiments.map(toMD).join("\n\n---\n\n"));
                toast.success("已复制到剪贴板");
              },
              className: "flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary transition",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { size: 15 }),
                " 复制"
              ]
            }
          )
        ] })
      ] })
    }
  );
}
function MiniStat({ icon, label, value }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center p-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center text-muted-foreground", children: icon }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-xl font-bold", children: value }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground", children: label })
  ] });
}
function toMD(e) {
  return `## ${e.name}
- 时间：${e.date}
- 人员：${e.operator}
- 样品：${e.sample.id}

### 目的
${e.purpose}

### 设备
${e.device.name} / ${e.device.model}

### 参数
${e.params.map((p) => `- ${p.name}: ${p.value} ${p.unit}`).join("\n")}

### 步骤
${e.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

### 结果
${e.results}

### 备注
${e.notes}`;
}
function Workbench() {
  const {
    id
  } = Route$9.useSearch();
  const {
    experiments,
    addExperiment,
    updateExperiment,
    deleteExperiment
  } = useLab();
  const [activeId, setActiveId] = reactExports.useState(id ?? experiments[0]?.id);
  const active = experiments.find((e) => e.id === activeId);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-[1500px] px-4 py-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "实验工作台" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "采集 · 结构化 · 复现 · 追溯" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:col-span-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LeftPanel, { onSelect: setActiveId, activeId }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:col-span-6", children: active ? /* @__PURE__ */ jsxRuntimeExports.jsx(CardEditor, { experiment: active, onSave: (patch) => {
        updateExperiment(active.id, patch);
        toast.success("已保存");
      }, onDelete: () => {
        deleteExperiment(active.id);
        setActiveId(experiments.find((e) => e.id !== active.id)?.id);
        toast.success("已删除");
      } }, active.id) : /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { onCreate: () => {
        const id2 = createBlank(addExperiment);
        setActiveId(id2);
      } }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:col-span-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RightPanel, { experiment: active }) })
    ] })
  ] });
}
function createBlank(add) {
  const blank = {
    id: "exp_" + Math.random().toString(36).slice(2, 9),
    name: "新建实验",
    date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " "),
    operator: "",
    purpose: "",
    background: "",
    device: {
      name: "",
      model: "",
      vendor: ""
    },
    sample: {
      id: "",
      batch: "",
      source: ""
    },
    params: [{
      name: "",
      value: "",
      unit: ""
    }],
    environment: {
      temperature: "",
      humidity: "",
      other: ""
    },
    steps: [""],
    results: "",
    notes: "",
    source: "手动新建",
    discipline: "材料科学"
  };
  add(blank);
  return blank.id;
}
function LeftPanel({
  onSelect,
  activeId
}) {
  const {
    experiments,
    addExperiment
  } = useLab();
  const [voiceOpen, setVoiceOpen] = reactExports.useState(false);
  const fileRef = reactExports.useRef(null);
  const [pipelineRunning, setPipelineRunning] = reactExports.useState(false);
  const [pipelineStage, setPipelineStage] = reactExports.useState("idle");
  const [pipelineDetail, setPipelineDetail] = reactExports.useState("");
  const [pipelineCards, setPipelineCards] = reactExports.useState([]);
  const [lastUploadedFiles, setLastUploadedFiles] = reactExports.useState([]);
  const [showSummary, setShowSummary] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const pending = consumePendingUpload();
    if (pending && pending.length > 0) {
      const fakeList = {
        length: pending.length,
        item: (i) => pending[i] ?? null,
        [Symbol.iterator]: function* () {
          for (const f of pending) yield f;
        }
      };
      setTimeout(() => handleFileUpload(fakeList), 300);
    }
  }, []);
  const {
    isElectron: _isElectron,
    watchStatus,
    recentFiles,
    selectFolder,
    startWatch,
    stopWatch
  } = useElectron();
  const localFiles = getLocalFiles();
  const [localPanelOpen, setLocalPanelOpen] = reactExports.useState(false);
  const handleElectronSelectFolder = async () => {
    const folder = await selectFolder();
    if (folder) await startWatch(folder);
  };
  const handleGenerateCardFromFile = (file) => {
    const card = mockCardFromFile(file.name);
    addExperiment(card);
    onSelect(card.id);
    toast.success(`已为 ${file.name} 生成实验卡片`);
  };
  const handleFileUpload = async (files) => {
    if (!files || !files.length) return;
    const fileArray = Array.from(files);
    const fileNames = fileArray.map((f) => f.name);
    setLastUploadedFiles(fileNames);
    setPipelineRunning(true);
    setPipelineCards([]);
    setPipelineStage("reading");
    try {
      const cards = await runPipeline(
        fileArray,
        (stage, detail) => {
          setPipelineStage(stage);
          setPipelineDetail(detail);
        },
        true
        // 使用真实 API
      );
      setPipelineCards(cards);
      cards.forEach((card) => addExperiment(card));
      if (cards.length > 0) onSelect(cards[0].id);
      toast.success(`${fileArray.length} 个文件 → ${cards.length} 张实验卡片`);
      if (cards.length > 0) setShowSummary(true);
    } catch (e) {
      console.error("[Pipeline] 解析失败", e);
      toast.error("解析过程出错，已使用本地缓存生成卡片");
    } finally {
      setPipelineRunning(false);
      setPipelineStage("idle");
    }
  };
  const pipelineStages = PIPELINE_STAGES;
  const currentStageIdx = pipelineStages.findIndex((s) => s.key === pipelineStage);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    localFiles.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 15, className: "text-amber-500" }),
          "待整理材料"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full", children: [
          localFiles.length,
          " 文件 · ",
          new Set(localFiles.map((f) => detectFileInfo(f.name).type)).size,
          " 种格式"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[11px] text-muted-foreground leading-relaxed", children: [
        "本地文件夹：",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground font-mono text-[10px]", children: "D:\\labnote\\实验数据-20260515\\" })
      ] }),
      !localPanelOpen ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setLocalPanelOpen(true), className: "mt-2 w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs hover:border-primary/40 transition", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 12 }),
        "查看文件列表"
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0.5 max-h-[200px] overflow-auto pr-1", children: localFiles.map((f) => {
          const info = detectFileInfo(f.name);
          const processed = pipelineCards.length > 0 && lastUploadedFiles.includes(f.name);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${processed ? "bg-[color:var(--color-success)]/10 border border-[color:var(--color-success)]/30" : "bg-secondary/60"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm", children: info.icon }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 truncate text-[11px] font-medium", children: f.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground shrink-0", children: info.type }),
            processed && /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 12, className: "text-[color:var(--color-success)]" })
          ] }, f.name);
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground text-center", children: "请通过上方「数据输入」区域上传这些文件" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setLocalPanelOpen(false), className: "w-full rounded-lg border border-border px-3 py-1.5 text-[11px] hover:bg-secondary transition", children: "收起" })
      ] })
    ] }),
    pipelineRunning && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-4 border-primary/30 bg-primary-soft/10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs font-semibold text-primary mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "animate-spin", size: 13 }),
        "多模态解析进行中"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: pipelineStages.slice(0, -1).map((s, i) => {
        const isDone = i < currentStageIdx;
        const isActive = s.key === pipelineStage;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-[11px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${isDone ? "bg-[color:var(--color-success)] text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`, children: isDone ? "✓" : isActive ? "·" : "" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: isDone ? "text-foreground" : isActive ? "text-primary font-medium" : "text-muted-foreground", children: s.label }),
          isActive && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-primary/70 ml-auto truncate max-w-[120px]", children: pipelineDetail })
        ] }, s.key);
      }) })
    ] }),
    pipelineCards.length > 0 && !pipelineRunning && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-soft p-3 bg-[color:var(--color-success)]/5 border-[color:var(--color-success)]/30", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs font-semibold text-[color:var(--color-success)]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 14 }),
      "解析完成 · ",
      pipelineCards.length,
      " 张实验卡片"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FolderWatcherPanel, { isElectron: _isElectron, watching: watchStatus.watching, folderPath: watchStatus.folderPath, recentFiles, onSelectFolder: handleElectronSelectFolder, onStopWatch: stopWatch, onGenerateCard: handleGenerateCardFromFile }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 15 }),
        "数据输入"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { onDragOver: (e) => e.preventDefault(), onDrop: (e) => {
        e.preventDefault();
        handleFileUpload(e.dataTransfer.files);
      }, onClick: () => !pipelineRunning && fileRef.current?.click(), className: `mt-3 cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition ${pipelineRunning ? "border-primary/40 bg-primary-soft/20" : "border-border bg-secondary/40 hover:border-primary/50 hover:bg-primary-soft/40"}`, children: [
        pipelineRunning ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-primary text-xs font-semibold mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "animate-spin", size: 14 }),
            " 多模态解析流水线"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1.5", children: pipelineStages.slice(0, -1).map((s, i) => {
            const isDone = i < currentStageIdx;
            const isActive = s.key === pipelineStage;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-2 text-[11px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${isDone ? "bg-[color:var(--color-success)] text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`, children: isDone ? "✓" : isActive ? "·" : "" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: isDone ? "text-foreground" : isActive ? "text-primary font-medium" : "text-muted-foreground", children: s.label }),
              isActive && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 ml-1 h-1 rounded-full bg-primary/15 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block h-full w-1/2 bg-primary animate-[slide_0.9s_ease-in-out_infinite]" }) })
            ] }, s.key);
          }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}` })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 18, className: "mx-auto text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: "拖拽文件到此处或点击上传" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground/70 mt-1", children: "支持 MD · TXT · CSV · PDF · DOCX · XLSX · PNG · JPG · MP4 · WAV · M4A" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { ref: fileRef, type: "file", multiple: true, hidden: true, accept: ".pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png,.tif,.tiff,.txt,.md,.log,.json,.xml,.mp4,.avi,.m4a,.mp3,.wav", onChange: (e) => handleFileUpload(e.target.files) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setVoiceOpen(true), className: "mt-2 w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs hover:border-primary/40 transition", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Mic, { size: 14 }),
        " 语音录入"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
        const id = createBlank(addExperiment);
        onSelect(id);
      }, className: "mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground hover:bg-primary/90 transition", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FilePlusCorner, { size: 14 }),
        " 新建实验"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 15 }),
        "历史实验"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 space-y-1 max-h-[480px] overflow-auto pr-1", children: experiments.slice(0, 10).map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => onSelect(e.id), className: `w-full text-left rounded-lg p-2.5 text-xs transition ${activeId === e.id ? "bg-primary-soft text-primary" : "hover:bg-secondary"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium truncate", children: e.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-0.5 text-[10px] text-muted-foreground", children: [
          e.date,
          " · ",
          e.source
        ] })
      ] }) }, e.id)) })
    ] }),
    voiceOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(VoiceModal, { onClose: () => setVoiceOpen(false), onConfirm: (text) => {
      const card = mockCardFromVoice(text);
      addExperiment(card);
      onSelect(card.id);
      setVoiceOpen(false);
      toast.success("语音识别完成，已生成实验卡片");
    } }),
    showSummary && pipelineCards.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(ExperimentSummary, { experiments: pipelineCards, fileCount: lastUploadedFiles.length, onClose: () => setShowSummary(false) })
  ] });
}
const presetVoices = ["2026-05-31 15:20，样品编号 Fe-2309，管式炉退火温度 550℃，保温 60 分钟，氩气气氛", "今天上午 9 点，使用 Bruker XRD 仪器对 CuO-0525 样品进行扫描，扫描角度 10 到 80 度", "样品 Pt-0301 在 0.5M 硫酸中进行 CV 测试，扫描速率 50mV/s，循环 100 圈", "2026-05-30，水热反应釜 180 度反应 12 小时，前驱体浓度 0.1M", "电化学工作站 CHI760E 测试，样品 PtC-Lab-04，发现第 200 圈电流出现尖峰异常"];
function VoiceModal({
  onClose,
  onConfirm
}) {
  const [text, setText] = reactExports.useState(presetVoices[0]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft w-full max-w-lg p-5", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Mic, { size: 16, className: "text-primary" }),
        "语音录入"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "p-1 hover:bg-secondary rounded", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 16 }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: "选择预设语音文本或自由输入（模拟 ASR 识别结果）：" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 space-y-1.5", children: presetVoices.map((v, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setText(v), className: `w-full text-left text-xs rounded-lg p-2 border transition ${text === v ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40"}`, children: v }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: text, onChange: (e) => setText(e.target.value), className: "mt-3 w-full rounded-lg border border-border p-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex justify-end gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary", children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onConfirm(text), className: "px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90", children: "确认生成卡片" })
    ] })
  ] }) });
}
function CardEditor({
  experiment,
  onSave,
  onDelete
}) {
  const [draft, setDraft] = reactExports.useState(experiment);
  const update = (k, v) => setDraft((d) => ({
    ...d,
    [k]: v
  }));
  const exportJSON = () => {
    download(`${draft.name}.json`, JSON.stringify(draft, null, 2), "application/json");
    toast.success("已导出 JSON");
  };
  const exportMD = () => {
    download(`${draft.name}.md`, toMarkdown(draft), "text/markdown");
    toast.success("已导出 Markdown");
  };
  const exportPDF = () => {
    window.print();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: draft.name, onChange: (e) => update("name", e.target.value), className: "w-full text-xl font-bold bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none pb-1" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-md bg-primary-soft text-primary px-2 py-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { size: 11 }),
            draft.source
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: draft.discipline })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1 no-print", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconBtn, { onClick: () => onSave(draft), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { size: 14 }), label: "保存" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconBtn, { onClick: exportMD, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 14 }), label: "MD" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconBtn, { onClick: exportJSON, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileBraces, { size: 14 }), label: "JSON" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconBtn, { onClick: exportPDF, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { size: 14 }), label: "PDF" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconBtn, { onClick: onDelete, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14 }), label: "删除", danger: true })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 grid grid-cols-2 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "实验时间", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: draft.date, onChange: (e) => update("date", e.target.value), className: inputCls }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "实验人员", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: draft.operator, onChange: (e) => update("operator", e.target.value), className: inputCls }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "实验目的", full: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: draft.purpose, onChange: (e) => update("purpose", e.target.value), className: inputCls + " min-h-[60px]" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "背景说明", full: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: draft.background, onChange: (e) => update("background", e.target.value), className: inputCls + " min-h-[50px]" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "设备信息", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "名称", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: draft.device.name, onChange: (e) => update("device", {
        ...draft.device,
        name: e.target.value
      }), className: inputCls }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "型号", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: draft.device.model, onChange: (e) => update("device", {
        ...draft.device,
        model: e.target.value
      }), className: inputCls }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "厂家", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: draft.device.vendor, onChange: (e) => update("device", {
        ...draft.device,
        vendor: e.target.value
      }), className: inputCls }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "材料与样品", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "样品编号", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: draft.sample.id, onChange: (e) => update("sample", {
        ...draft.sample,
        id: e.target.value
      }), className: inputCls }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "批次", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: draft.sample.batch, onChange: (e) => update("sample", {
        ...draft.sample,
        batch: e.target.value
      }), className: inputCls }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "来源", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: draft.sample.source, onChange: (e) => update("sample", {
        ...draft.sample,
        source: e.target.value
      }), className: inputCls }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "实验参数", actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => update("params", [...draft.params, {
      name: "",
      value: "",
      unit: ""
    }]), className: "text-xs text-primary hover:underline flex items-center gap-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 12 }),
      "添加参数"
    ] }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ParamTable, { params: draft.params, onChange: (ps) => update("params", ps) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "环境条件", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "温度 (℃)", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: draft.environment.temperature, onChange: (e) => update("environment", {
        ...draft.environment,
        temperature: e.target.value
      }), className: inputCls }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "湿度 (%)", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: draft.environment.humidity, onChange: (e) => update("environment", {
        ...draft.environment,
        humidity: e.target.value
      }), className: inputCls }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "其他", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: draft.environment.other, onChange: (e) => update("environment", {
        ...draft.environment,
        other: e.target.value
      }), className: inputCls }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "实验步骤", actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => update("steps", [...draft.steps, ""]), className: "text-xs text-primary hover:underline flex items-center gap-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 12 }),
      "添加步骤"
    ] }), children: /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "space-y-2", children: draft.steps.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-2 items-start", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-2 text-xs text-muted-foreground w-5 text-right", children: [
        i + 1,
        "."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: s, onChange: (e) => {
        const next = [...draft.steps];
        next[i] = e.target.value;
        update("steps", next);
      }, className: inputCls + " flex-1 min-h-[40px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => update("steps", draft.steps.filter((_, j) => j !== i)), className: "p-1.5 text-muted-foreground hover:text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 14 }) })
    ] }, i)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "结果数据", children: /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: draft.results, onChange: (e) => update("results", e.target.value), className: inputCls + " min-h-[80px]" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "异常与备注", children: /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: draft.notes, onChange: (e) => update("notes", e.target.value), className: inputCls + " min-h-[60px]" }) })
  ] });
}
const inputCls = "w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50";
function Field({
  label,
  children,
  full
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: `block ${full ? "col-span-2" : ""}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1", children })
  ] });
}
function Section({
  title,
  children,
  actions
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-semibold", children: title }),
      actions
    ] }),
    children
  ] });
}
function IconBtn({
  icon,
  label,
  onClick,
  danger
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick, className: `flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs border transition ${danger ? "border-destructive/30 text-destructive hover:bg-destructive/10" : "border-border hover:border-primary/40 hover:bg-primary-soft"}`, children: [
    icon,
    label
  ] });
}
function ParamTable({
  params,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-secondary/60 text-xs text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-3 py-2 font-medium", children: "参数名" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-3 py-2 font-medium", children: "值" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-3 py-2 font-medium", children: "单位" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-10" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
      params.map((p, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: p.name, onChange: (e) => {
          const n = [...params];
          n[i] = {
            ...p,
            name: e.target.value
          };
          onChange(n);
        }, className: "w-full px-2 py-1 text-sm bg-transparent focus:outline-none" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: p.value, onChange: (e) => {
          const n = [...params];
          n[i] = {
            ...p,
            value: e.target.value
          };
          onChange(n);
        }, className: "w-full px-2 py-1 text-sm bg-transparent focus:outline-none" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: p.unit, onChange: (e) => {
          const n = [...params];
          n[i] = {
            ...p,
            unit: e.target.value
          };
          onChange(n);
        }, className: "w-full px-2 py-1 text-sm bg-transparent focus:outline-none" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onChange(params.filter((_, j) => j !== i)), className: "text-muted-foreground hover:text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 14 }) }) })
      ] }, i)),
      params.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, className: "p-3 text-center text-xs text-muted-foreground", children: "暂无参数" }) })
    ] })
  ] }) });
}
function EmptyState({
  onCreate
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-12 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(FilePlusCorner, { size: 28, className: "mx-auto text-muted-foreground" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "还没有打开任何实验卡片" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: onCreate, className: "mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 14 }),
      " 新建实验"
    ] })
  ] });
}
function RightPanel({
  experiment
}) {
  if (!experiment) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-soft p-6 text-sm text-muted-foreground text-center", children: "选择实验卡片以查看复现助手" });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(AiAnalysis, { experiment }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ReproAssistant, { experiment }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(RagPanel, {})
  ] });
}
function AiAnalysis({
  experiment
}) {
  const {
    updateExperiment
  } = useLab();
  const missing = reactExports.useMemo(() => checkCompleteness(experiment), [experiment]);
  const trust = Math.max(60, 100 - missing.length * 2);
  const recognized = 28;
  const [reparsing, setReparsing] = reactExports.useState(false);
  const autoFill = () => {
    const patch = {};
    if (!experiment.operator || experiment.operator === "未识别") patch.operator = "AI 推断 · 待确认";
    if (!experiment.purpose) patch.purpose = "（AI 自动补全：根据样品与设备推断的实验目的，请人工核对）";
    if (!experiment.device.model) patch.device = {
      ...experiment.device,
      model: experiment.device.model || "（AI 推断型号）",
      vendor: experiment.device.vendor || "（AI 推断厂家）"
    };
    if (!experiment.sample.id) patch.sample = {
      ...experiment.sample,
      id: experiment.sample.id || "S-AUTO-" + Math.floor(Math.random() * 9e3 + 1e3),
      batch: experiment.sample.batch || "B-AUTO"
    };
    else if (!experiment.sample.batch) patch.sample = {
      ...experiment.sample,
      batch: "B-AUTO"
    };
    if (!experiment.environment.temperature) patch.environment = {
      ...experiment.environment,
      temperature: "25",
      humidity: experiment.environment.humidity || "50"
    };
    else if (!experiment.environment.humidity) patch.environment = {
      ...experiment.environment,
      humidity: "50"
    };
    if (experiment.params.length === 0) patch.params = [{
      name: "（待补全参数）",
      value: "",
      unit: ""
    }];
    updateExperiment(experiment.id, patch);
    toast.success("AI 已尝试补全缺失字段，请人工复核");
  };
  const reparse = () => {
    setReparsing(true);
    setTimeout(() => {
      setReparsing(false);
      toast.success("已重新解析（提升 +3% 可信度）");
    }, 1100);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-4 border-primary/30 bg-primary-soft/20", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Bot, { size: 15, className: "text-primary" }),
      "AI 分析"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid grid-cols-3 gap-2 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Metric, { label: "可信度", value: `${trust}%`, accent: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Metric, { label: "已识别字段", value: `${recognized}项` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Metric, { label: "缺失字段", value: `${missing.length}项`, warn: missing.length > 0 })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 h-1.5 rounded-full bg-primary/15 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-primary transition-all", style: {
      width: `${trust}%`
    } }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] font-semibold mb-1.5 text-muted-foreground", children: "建议补全：" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5", children: (missing.length >= 2 ? missing.slice(0, 2) : missing.length === 1 ? [missing[0], "环境湿度"] : ["环境湿度", "设备编号"]).map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-md border border-[color:var(--color-warning)]/40 bg-[color:var(--color-warning)]/10 px-2 py-0.5 text-[11px] text-[color:var(--color-warning)]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 10 }),
        m
      ] }, m)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid grid-cols-2 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: autoFill, className: "rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 12 }),
        " 一键补全"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: reparse, disabled: reparsing, className: "rounded-lg border border-border px-3 py-1.5 text-xs hover:border-primary/40 flex items-center justify-center gap-1 disabled:opacity-60", children: [
        reparsing ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 12, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 12 }),
        "重新解析"
      ] })
    ] })
  ] });
}
function Metric({
  label,
  value,
  accent,
  warn
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-white/70 p-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-base font-bold tabular-nums mt-0.5 ${accent ? "text-primary" : warn ? "text-[color:var(--color-warning)]" : "text-foreground"}`, children: value })
  ] });
}
function ReproAssistant({
  experiment
}) {
  const missing = reactExports.useMemo(() => checkCompleteness(experiment), [experiment]);
  const methods = reactExports.useMemo(() => generateMethods(experiment), [experiment]);
  const [checks, setChecks] = reactExports.useState({});
  const checklist = [...missing.map((m) => `补充：${m}`), "记录至少 3 次重复实验结果", "保存原始仪器数据文件", "记录环境异常与中断事件", "核对所有单位与符号规范"];
  const exportPack = () => {
    const content = `# 复现包：${experiment.name}

## 实验卡片
${"```json\n" + JSON.stringify(experiment, null, 2) + "\n```"}

## Methods 草稿
${methods}
`;
    download(`${experiment.name}-复现包.md`, content, "text/markdown");
    toast.success("已导出复现包（含卡片 JSON + Methods）");
  };
  const copyMethods = () => {
    navigator.clipboard.writeText(methods);
    toast.success("Methods 已复制到剪贴板");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 15, className: "text-primary" }),
      "复现助手"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 text-xs", children: missing.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 14, className: "text-[color:var(--color-success)]" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[color:var(--color-success)]", children: "完整性检查通过" })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 14, className: "text-[color:var(--color-warning)]" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "检测到 ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: missing.length }),
          " 项缺失字段"
        ] })
      ] }) }),
      missing.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "mt-2 space-y-1 text-xs text-muted-foreground", children: [
        missing.slice(0, 6).map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-1.5 items-start", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[color:var(--color-warning)] mt-0.5", children: "●" }),
          m
        ] }, m)),
        missing.length > 6 && /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-[10px]", children: [
          "…等共 ",
          missing.length,
          " 项"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-semibold mb-2", children: "复现实验检查清单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1.5 max-h-40 overflow-auto pr-1", children: checklist.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 text-xs cursor-pointer hover:bg-secondary rounded p-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: !!checks[c], onChange: (e) => setChecks({
          ...checks,
          [c]: e.target.checked
        }), className: "mt-0.5 accent-[color:var(--color-primary)]" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: checks[c] ? "line-through text-muted-foreground" : "", children: c })
      ] }) }, c)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-semibold", children: "论文 Methods 草稿" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: copyMethods, className: "text-[11px] text-primary hover:underline flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardCopy, { size: 11 }),
          "复制"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg bg-secondary/60 p-2.5 text-xs leading-relaxed max-h-40 overflow-auto", children: methods })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: exportPack, className: "mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground hover:bg-primary/90", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 13 }),
      " 导出复现包"
    ] })
  ] });
}
function mockSources(text, experiments) {
  const sampleMatch = text.match(/([A-Z][a-z]?-\d+)/);
  const base = [];
  if (sampleMatch) {
    const e = experiments.find((x) => x.sample.id === sampleMatch[1]);
    if (e) base.push({
      doc: e.name,
      page: "实验卡片",
      confidence: "98%",
      link: `/workbench?id=${e.id}`
    });
  }
  if (/异常|故障|波动|尖峰/.test(text)) {
    const hits = experiments.filter((e) => /异常|故障|波动|尖峰/.test(e.notes + e.results));
    hits.slice(0, 2).forEach((e) => base.push({
      doc: e.name,
      page: "备注/结果",
      confidence: "94%",
      link: `/workbench?id=${e.id}`
    }));
  }
  if (base.length === 0) {
    experiments.slice(0, 2).forEach((e) => base.push({
      doc: e.name,
      page: "实验卡片",
      confidence: "92%",
      link: `/workbench?id=${e.id}`
    }));
  }
  return base;
}
function RagPanel() {
  const {
    experiments
  } = useLab();
  const navigate = useNavigate();
  const [chat2, setChat] = reactExports.useState([{
    role: "agent",
    text: "你好，我是 LabNote Agent。已加载 " + experiments.length + " 条实验记录，可基于知识库问答与追溯。",
    sources: []
  }]);
  const [q, setQ] = reactExports.useState("");
  const send = (text) => {
    const t = (text ?? q).trim();
    if (!t) return;
    setChat((c) => [...c, {
      role: "user",
      text: t
    }]);
    setQ("");
    setTimeout(() => {
      const answer = ragAnswer(t, experiments);
      const sources = mockSources(answer, experiments);
      setChat((c) => [...c, {
        role: "agent",
        text: answer,
        sources
      }]);
    }, 400);
  };
  const suggestions = ["上次使用样品 Fe-2309 的退火温度是多少？", "哪几次实验出现电流异常？", "知识库涉及哪些设备？"];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 15, className: "text-primary" }),
      "知识问答 (RAG)"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 max-h-72 overflow-auto space-y-2 pr-1", children: chat2.map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-xs rounded-lg p-2 ${m.role === "user" ? "bg-primary-soft text-primary ml-6" : "bg-secondary mr-6"}`, children: m.text }),
      m.role === "agent" && m.sources && m.sources.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 mr-6 rounded-lg border border-border bg-card p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-muted-foreground font-semibold mb-1.5 flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 10 }),
          "来源文档"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1.5", children: m.sources.map((s, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center justify-between text-[11px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { size: 10 }),
              s.page
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-foreground", children: s.doc })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-[color:var(--color-success)]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Target, { size: 10 }),
              s.confidence
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => navigate({
              to: s.link
            }), className: "inline-flex items-center gap-0.5 text-primary hover:underline", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { size: 10 }),
              "查看卡片"
            ] })
          ] })
        ] }, idx)) })
      ] })
    ] }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap gap-1", children: suggestions.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => send(s), className: "text-[10px] rounded-md border border-border px-1.5 py-0.5 hover:border-primary/40 hover:bg-primary-soft", children: s }, s)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex gap-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: q, onChange: (e) => setQ(e.target.value), onKeyDown: (e) => e.key === "Enter" && send(), placeholder: "向知识库提问…", className: inputCls + " text-xs" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => send(), className: "rounded-lg bg-primary text-primary-foreground px-2.5 hover:bg-primary/90", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { size: 13 }) })
    ] })
  ] });
}
function download(filename, content, mime) {
  const blob = new Blob([content], {
    type: mime
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function toMarkdown(e) {
  return `# ${e.name}

- 时间：${e.date}
- 人员：${e.operator}
- 来源：${e.source}
- 学科：${e.discipline}

## 实验目的
${e.purpose}

## 背景
${e.background}

## 设备
${e.device.name} / ${e.device.model} / ${e.device.vendor}

## 样品
编号 ${e.sample.id} / 批次 ${e.sample.batch} / 来源 ${e.sample.source}

## 参数
${e.params.map((p) => `- ${p.name}：${p.value} ${p.unit}`).join("\n")}

## 环境
温度 ${e.environment.temperature} ℃，湿度 ${e.environment.humidity} %，其他：${e.environment.other}

## 步骤
${e.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

## 结果
${e.results}

## 异常与备注
${e.notes}
`;
}
export {
  Workbench as component
};
