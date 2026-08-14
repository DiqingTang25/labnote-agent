/**
 * ProductShowcase - 核心功能展示
 *
 * Bento Grid 产品演示：每格 = 真实页面 1:1 复刻 + 虚拟光标自动演示真实交互全流程
 * - 数据全部来自真实页面数据结构（pipeline 阶段 / 模板字段组 / 预设论文 / 节点配色 / 测试账号实验）
 * - 玻璃拟态 + 顶部内高光 + 噪点纹理
 */

import { motion, useMotionValue, useSpring, animate, type MotionValue } from "motion/react";
import { useState, useEffect, useRef, useMemo } from "react";
import { BlurFade } from "./magicui/blur-fade";
import { BorderBeam } from "./magicui/border-beam";
import {
  Brain, ScanLine, Network, Package, PenLine,
  CheckCircle2, AlertTriangle, FileText,
  ArrowRight, Download, FileJson, Sparkles,
  Upload, ChevronRight, Search, Save, Printer, Trash2,
} from "lucide-react";

// ═══════════════════════════════════════════════════
// 玻璃拟态 + 噪点纹理
// ═══════════════════════════════════════════════════

const GLASS_CARD =
  "relative overflow-hidden rounded-xl border border-border/50 bg-card/70 backdrop-blur-sm " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_20px_-8px_oklch(0.5_0.1_250/0.1)] " +
  "transition-all hover:border-primary/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_30px_-8px_oklch(0.5_0.1_250/0.15)]";

function NoiseTexture() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 opacity-[0.02] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════
// 虚拟光标 — 科技感自动演示（常显光晕 + 点击波纹 + 镜头跟随）
// ═══════════════════════════════════════════════════

type CursorStep = { x: number; y: number; dur: number; click?: boolean; grab?: boolean; drop?: boolean };

function VirtualCursor({
  steps,
  camera,
  dragLabel,
  cycleSeconds,
  onTick,
}: {
  steps: CursorStep[];
  camera?: { x: MotionValue<number>; y: MotionValue<number> };
  dragLabel?: string;
  /** 循环总时长（秒）— 与 UI 时间轴共用同一时钟，保证绝对同步 */
  cycleSeconds: number;
  /** 每 ~100ms 回调当前周期内时间 t（0 → cycleSeconds，循环） */
  onTick?: (t: number) => void;
}) {
  const xPct = useMotionValue(steps[0]?.x ?? 50);
  const yPct = useMotionValue(steps[0]?.y ?? 50);
  const clickScale = useMotionValue(0);
  const dragOpacity = useMotionValue(0);

  useEffect(() => {
    const total = cycleSeconds;
    const xK: number[] = [steps[0].x];
    const yK: number[] = [steps[0].y];
    const times: number[] = [0];
    let t = 0;
    steps.forEach((s) => {
      xK.push(s.x, s.x);
      yK.push(s.y, s.y);
      t += s.dur;
      times.push(t / total, t / total);
    });
    // 点击波纹
    const rTimes: number[] = [];
    const rVals: number[] = [];
    let rt = 0;
    steps.forEach((s) => {
      rt += s.dur;
      if (s.click || s.drop) {
        rTimes.push(rt / total, Math.min(1, rt / total + 0.12));
        rVals.push(1, 0);
      }
    });
    // 拖拽中的文件包（grab 起 → drop 止）
    const dTimes: number[] = [];
    const dVals: number[] = [];
    let dt = 0;
    let dragging = false;
    steps.forEach((s) => {
      dt += s.dur;
      if (s.grab && !dragging) {
        dragging = true;
        dTimes.push(Math.max(0, dt / total - 0.01), dt / total);
        dVals.push(0, 1);
      }
      if (s.drop && dragging) {
        dragging = false;
        dTimes.push(dt / total, dt / total + 0.08);
        dVals.push(1, 0);
      }
    });
    let lastEmit = 0;
    const startTime = performance.now();
    const c1 = animate(xPct, xK, {
      duration: total,
      times,
      repeat: Infinity,
      ease: "easeInOut",
      onUpdate: () => {
        // 统一时钟：用墙钟计算周期内时间 t（0 → total 循环），不依赖动画进度值语义
        const now = performance.now();
        if (now - lastEmit >= 100) {
          lastEmit = now;
          onTick?.(((now - startTime) / 1000) % total);
        }
      },
    });
    const c2 = animate(yPct, yK, { duration: total, times, repeat: Infinity, ease: "easeInOut" });
    const c3 = rTimes.length
      ? animate(clickScale, rVals, { duration: total, times: rTimes, repeat: Infinity, ease: "easeOut" })
      : null;
    const c6 = dTimes.length
      ? animate(dragOpacity, dVals, { duration: total, times: dTimes, repeat: Infinity, ease: "easeInOut" })
      : null;
    // 镜头跟随（视点偏移，带平移 + 缩放）
    let c4: ReturnType<typeof animate> | null = null;
    let c5: ReturnType<typeof animate> | null = null;
    if (camera) {
      c4 = animate(camera.x, xK.map((v) => (v - 50) * -0.1), { duration: total, times, repeat: Infinity, ease: "easeInOut" });
      c5 = animate(camera.y, yK.map((v) => (v - 50) * -0.08), { duration: total, times, repeat: Infinity, ease: "easeInOut" });
    }
    return () => {
      c1.stop();
      c2.stop();
      c3?.stop();
      c4?.stop();
      c5?.stop();
      c6?.stop();
    };
  }, [steps, xPct, yPct, clickScale, dragOpacity, camera]);

  const xPx = useTransformString(xPct, -10);
  const yPx = useTransformString(yPct, -7);
  const rippleScale = useSpring(clickScale, { stiffness: 260, damping: 18 });
  const haloX = useSpring(xPx, { stiffness: 120, damping: 16 });
  const haloY = useSpring(yPx, { stiffness: 120, damping: 16 });
  const dragOpacitySpring = useSpring(dragOpacity, { stiffness: 200, damping: 24 });

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {/* 常显光晕（跟随光标，缓慢呼吸） */}
      <motion.div style={{ left: haloX, top: haloY }} className="absolute -translate-x-1/2 -translate-y-1/2">
        <motion.div
          animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="h-12 w-12 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.28) 0%, rgba(59,130,246,0.08) 45%, transparent 70%)",
            filter: "blur(2px)",
          }}
        />
      </motion.div>

      {/* 点击波纹（发光扩散，无实线边框） */}
      <motion.div style={{ left: xPx, top: yPx, scale: rippleScale }} className="absolute -translate-x-1/2 -translate-y-1/2">
        <div
          className="h-16 w-16 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(96,165,250,0.12) 40%, transparent 70%)",
            filter: "blur(3px)",
            boxShadow: "0 0 24px 4px rgba(59,130,246,0.25)",
          }}
        />
      </motion.div>

      {/* 拖拽中的文件包（跟随光标） */}
      <motion.div
        style={{ left: xPx, top: yPx, opacity: dragOpacitySpring }}
        className="absolute translate-x-2 translate-y-1"
      >
        <div className="flex items-center gap-1.5 rounded-md border border-blue-300/70 bg-white/95 px-2 py-1 shadow-lg shadow-blue-500/20 backdrop-blur">
          <FileText size={11} className="text-blue-500" />
          <span className="text-[9px] font-medium text-slate-700">{dragLabel}</span>
          <span className="rounded-full bg-blue-500 px-1 py-px text-[7px] font-bold text-white">+2</span>
        </div>
      </motion.div>

      {/* 光标箭头（精致描边 + 蓝晕） */}
      <motion.div style={{ left: xPx, top: yPx }} className="absolute">
        <svg width="17" height="17" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="cursorFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#dbeafe" />
            </linearGradient>
          </defs>
          <path
            d="M5 3l14 7.5-6.2 1.8L9 18.5 5 3z"
            fill="url(#cursorFill)"
            stroke="#3b82f6"
            strokeWidth="1"
            style={{ filter: "drop-shadow(0 0 5px rgba(59,130,246,0.7)) drop-shadow(0 2px 3px rgba(0,0,0,0.35))" }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

/** MotionValue<number> → 百分比字符串（带像素偏移） */
function useTransformString(v: MotionValue<number>, offset: number): MotionValue<string> {
  const out = useMotionValue(`${offset}px`);
  useEffect(() => {
    const unsub = v.on("change", (val) => {
      out.set(`calc(${val}% + ${offset}px)`);
    });
    return unsub;
  }, [v, out, offset]);
  return out;
}

// ═══════════════════════════════════════════════════
// Cell Header
// ═══════════════════════════════════════════════════

function CellHeader({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="relative z-10 flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

/** 稳定的镜头 MotionValue 对（对象引用跨渲染不变，避免动画被重渲染打断） */
function useCamera() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  return useMemo(() => ({ x, y }), [x, y]);
}

/** 派生 MotionValue：source 变化 → map 映射 */
function useDerivedMotionValue(source: MotionValue<number>, map: (v: number) => number): MotionValue<number> {
  const out = useMotionValue(map(source.get()));
  useEffect(() => {
    const unsub = source.on("change", (val) => out.set(map(val)));
    return unsub;
  }, [source, out, map]);
  return out;
}

/** 单元格镜头容器：随虚拟光标视点平移 + 缩放，背景反向视差形成景深 */
function CameraLayer({
  children,
  camera,
  bg,
}: {
  children: React.ReactNode;
  camera: { x: MotionValue<number>; y: MotionValue<number> };
  bg?: React.ReactNode;
}) {
  const sx = useSpring(camera.x, { stiffness: 60, damping: 16 });
  const sy = useSpring(camera.y, { stiffness: 60, damping: 16 });
  const scaleRaw = useDerivedMotionValue(camera.x, (v) => 1.015 + Math.abs(v) * 0.014);
  const scale = useSpring(scaleRaw, { stiffness: 60, damping: 16 });
  // 背景反向视差（更大位移 → 景深）
  const bgXRaw = useDerivedMotionValue(camera.x, (v) => v * -2.4);
  const bgYRaw = useDerivedMotionValue(camera.y, (v) => v * -2.0);
  const bgX = useSpring(bgXRaw, { stiffness: 40, damping: 16 });
  const bgY = useSpring(bgYRaw, { stiffness: 40, damping: 16 });

  return (
    <div className="relative z-10 flex h-full flex-col overflow-hidden">
      {bg && (
        <motion.div style={{ x: bgX, y: bgY }} className="pointer-events-none absolute -inset-4">
          {bg}
        </motion.div>
      )}
      <motion.div style={{ x: sx, y: sy, scale }} className="relative flex h-full flex-col">
        {children}
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// 真实数据
// ═══════════════════════════════════════════════════

// 工作台：真实流水线阶段（multimodal-parser PIPELINE_STAGES）
const pipelineStages = [
  { key: "reading", label: "读取文件内容" },
  { key: "analyzing", label: "AI 文本识别" },
  { key: "merging", label: "去重合并生成卡片" },
  { key: "complete", label: "完成" },
];

// 工作台：真实动态卡片（水热合成模板字段组，铺满卡片）
const cardCoreFields = [
  { label: "实验时间", value: "2026-08-10" },
  { label: "实验人员", value: "刘雨桐" },
  { label: "实验类型", value: "synthesis" },
];
const cardGroups = [
  {
    label: "基本信息",
    fields: [
      { label: "实验目的", value: "制备粒径均一的 Fe3O4 磁性纳米颗粒，考察 Fe3+/Fe2+ 摩尔比对磁性能与粒径的影响" },
      { label: "实验结论", value: "产物磁响应 < 10 s，产率 91.6%，XRD 主峰 35.45° 对应 (311) 晶面，无杂相" },
    ],
  },
  {
    label: "仪器与设备",
    fields: [
      { label: "设备名称", value: "高温高压反应釜" },
      { label: "型号", value: "100mL · 聚四氟内衬" },
      { label: "辅助设备", value: "IKA 磁力搅拌器 · 真空干燥箱" },
    ],
  },
  {
    label: "试剂与材料",
    fields: [
      { label: "前驱体", value: "FeCl3·6H2O · FeCl2·4H2O" },
      { label: "沉淀剂", value: "NaOH" },
      { label: "模板剂", value: "PEG-4000" },
    ],
  },
  {
    label: "实验参数",
    fields: [
      { label: "反应温度", value: "200°C" },
      { label: "反应时间", value: "8 h" },
      { label: "体系 pH", value: "10.5" },
      { label: "退火条件", value: "N2 · 400°C · 2 h" },
    ],
  },
  {
    label: "结果与备注",
    fields: [
      { label: "产率", value: "91.6%" },
      { label: "磁响应时间", value: "< 10 s" },
      { label: "异常备注", value: "第 2 批滴加 NaOH 时搅拌停转 2 min，产物偏棕，已标记失败" },
    ],
  },
];
// 图集：真实文件（public/sample-data），带标注
const cardGallery = [
  { src: "/sample-data/SEM-Fe3O4-纳米粒子.png", caption: "SEM · Fe3O4 球形颗粒 · 标尺 100 nm" },
  { src: "/sample-data/样品制备-操作图.jpg", caption: "样品制备 · 磁分离操作" },
];
const uploadFiles = [
  { name: "XRD-结果分析.csv", detail: "提取 11 行数据 · 物相: Fe3O4" },
  { name: "实验笔记.md", detail: "温度 200°C · 时间 8h" },
  { name: "SEM-形貌图.png", detail: "视觉识别: 球形颗粒 · 100nm" },
];

// 实验复现：真实预设论文 SrTiO₃（paper-test-data SRTIO3_PRESET_AUDIT）
const presetPaper = "SrTiO₃/rGO/g-C₃N₄ (Sci Rep 2024)";
const presetDoi = "10.1038/s41598-024-66844-x";
const reproSteps = [
  "连接 AI 引擎",
  "AI 拆解论文 Methods",
  "静态领域知识库匹配",
  "Materials Project 查询",
  "NIST Chemistry WebBook 查询",
  "生成复现审计报告",
];
const reproParams = [
  { name: "水热反应温度", value: "200°C", certainty: "论文明确", cls: "bg-green-50 text-green-600 border-green-200" },
  { name: "水热反应时间", value: "4 h", certainty: "论文明确", cls: "bg-green-50 text-green-600 border-green-200" },
  { name: "TTIP 用量", value: "1.77 g", certainty: "论文明确", cls: "bg-green-50 text-green-600 border-green-200" },
  { name: "干燥温度", value: "80°C", certainty: "论文隐含", cls: "bg-blue-50 text-blue-600 border-blue-200" },
  { name: "搅拌转速", value: "500 rpm", certainty: "AI 推断", cls: "bg-amber-50 text-amber-600 border-amber-200" },
  { name: "KOH 浓度", value: "—", certainty: "未知", cls: "bg-red-50 text-red-600 border-red-200" },
];

// 关系图谱：真实节点配色（useForceSimulation NODE_COLORS）+ 仿真团队数据
const nodeColors: Record<string, string> = {
  experiment: "#6366f1",
  sample: "#f59e0b",
  device: "#10b981",
  operator: "#06b6d4",
  reagent: "#ec4899",
  method: "#8b5cf6",
  project: "#0ea5e9",
};
const nodeTypeLabels: Record<string, string> = {
  experiment: "实验",
  sample: "样品",
  device: "设备",
  operator: "操作人",
  reagent: "试剂/原料",
  method: "方法/协议",
  project: "项目/课题",
};
const graphSimNodes = [
  { id: "e1", label: "水热合成 Fe3O4", type: "experiment", x: 34, y: 34 },
  { id: "e2", label: "XRD 物相表征", type: "experiment", x: 58, y: 24 },
  { id: "e3", label: "VSM 磁性能测试", type: "experiment", x: 74, y: 50 },
  { id: "e4", label: "TEM 形貌观察", type: "experiment", x: 56, y: 74 },
  { id: "e5", label: "柠檬酸修饰 Fe3O4", type: "experiment", x: 22, y: 68 },
  { id: "s1", label: "Fe3O4-SYN-20260810-A", type: "sample", x: 46, y: 50 },
  { id: "s2", label: "Fe3O4@CA-20260812", type: "sample", x: 16, y: 48 },
  { id: "d1", label: "Rigaku SmartLab SE", type: "device", x: 64, y: 12 },
  { id: "d2", label: "VSM-8600", type: "device", x: 88, y: 36 },
  { id: "m1", label: "水热法", type: "method", x: 14, y: 26 },
  { id: "r1", label: "FeCl3·6H2O", type: "reagent", x: 26, y: 12 },
  { id: "p1", label: "磁性纳米材料专项", type: "project", x: 82, y: 78 },
];
const graphSimEdges = [
  ["e1", "s1"], ["e1", "m1"], ["e1", "r1"], ["e1", "d1"],
  ["e2", "s1"], ["e2", "d1"], ["e3", "s1"], ["e3", "d2"],
  ["e4", "s1"], ["e5", "s1"], ["e5", "s2"], ["e1", "p1"], ["e5", "p1"],
];

// 实验交接：测试账号真实上传的 6 个实验包
const assetPackages = [
  { name: "Si 能带结构与弹性性质第一性原理计算", meta: "DFT · Materials Project", files: 4, color: "#6366f1" },
  { name: "SST-2 情感分析（BERT 微调）", meta: "NLP · GLUE 基准", files: 3, color: "#8b5cf6" },
  { name: "MNIST 手写数字图像分类实验", meta: "图像分类 · 2000 样本", files: 3, color: "#f59e0b" },
  { name: "癌症生存分析", meta: "生存分析 · 1241 例", files: 3, color: "#10b981" },
  { name: "分子性质预测（图神经网络）", meta: "GNN · MoleculeNet", files: 3, color: "#ec4899" },
  { name: "时间序列预测实验", meta: "时序 · UCI ENB2012", files: 2, color: "#0ea5e9" },
];

// 论文辅助：真实 Methods 输出格式（generateMethods 中文拼接）
const methodsText = `1. 样品制备：将 2.703 g FeCl3·6H2O 与 1.136 g FeCl2·4H2O 溶于 60 mL 去离子水，搅拌 30 min，缓慢滴加 NaOH 溶液至变黑，加入 0.5 g PEG-4000。

2. 水热反应：混合液转移至 100 mL 反应釜，200°C 反应 8 h。

3. 产物处理：磁分离收集，洗涤后 60°C 真空干燥 12 h，N2 气氛 400°C 退火 2 h。`;

// ═══════════════════════════════════════════════════
// ❶ 工作台 — 真实三栏布局 + 四阶段流水线
// ═══════════════════════════════════════════════════

const workbenchCursorSteps: CursorStep[] = [
  { x: 12, y: 22, dur: 1.6 }, // 移向桌面文件托盘
  { x: 12, y: 22, dur: 0.4, grab: true }, // 抓起文件包
  { x: 14, y: 40, dur: 1.4 }, // 拖拽到上传区
  { x: 14, y: 40, dur: 0.4, drop: true }, // 松手 → 开始解析
  { x: 16, y: 44, dur: 1.4 }, // 停住等待解析
  { x: 16, y: 46, dur: 1.2 },
  { x: 30, y: 66, dur: 1.2 }, // 看一眼流水线进度
  { x: 52, y: 46, dur: 1.2 }, // 看向卡片铺满
  { x: 54, y: 74, dur: 1.2 }, // 看向图集
  { x: 78, y: 14, dur: 1.2 }, // 移向保存
  { x: 78, y: 14, dur: 0.4, click: true }, // 点击保存
  { x: 84, y: 14, dur: 1.0 }, // 移向导出复现包
  { x: 84, y: 14, dur: 0.4, click: true }, // 点击导出 → 弹窗
  { x: 50, y: 54, dur: 1.0 }, // 移入弹窗
  { x: 50, y: 62, dur: 0.4, click: true }, // 点击弹窗内「导出」
  { x: 50, y: 40, dur: 1.6 }, // 回到中央
];

function WorkbenchCell() {
  // 统一 17.4s 时间轴（与光标 steps 对齐）
  const CYCLE = 17.4;
  const [t, setT] = useState(0);
  const camera = useCamera();

  useEffect(() => {
    // 时间轴由 VirtualCursor 统一时钟驱动（onTick），保证光标与动画绝对同步
  }, []);

  // 阶段推导（与光标拖拽/点击时间对齐）
  const dropActive = t >= 3.6 && t < 4.4; // 松手瞬间上传区高亮
  const stage = t < 3.9 ? 0 : t < 4.8 ? 1 : t < 5.9 ? 2 : t < 7.5 ? 2 : 3;
  const fileCount = t < 4.3 ? 0 : t < 5.3 ? 1 : t < 6.5 ? 2 : 3;
  const coreCount = t < 8.2 ? 0 : Math.min(cardCoreFields.length, Math.floor((t - 8.2) / 0.5) + 1);
  const groupCount = t < 9.0 ? 0 : t < 9.6 ? 1 : t < 10.2 ? 2 : t < 10.8 ? 3 : t < 11.4 ? 4 : 5;
  const galleryCount = t < 12.0 ? 0 : t < 12.6 ? 1 : 2;
  const saved = t >= 12.1 && t < 14.4;
  const dialogOpen = t >= 13.5 && t < 16.4; // 点击导出复现包 → 弹窗
  const dialogExported = t >= 15.0 && t < 16.4; // 弹窗内点击导出 → 成功态
  const showCard = t >= 8.2;

  const totalFields = cardCoreFields.length + cardGroups.reduce((sum, g) => sum + g.fields.length, 0);

  return (
    <div className={`${GLASS_CARD} flex h-full flex-col p-4`}>
      <NoiseTexture />
      <CellHeader icon={Brain} title="工作台" desc="拖入多格式文件 → AI 解析 → 动态实验卡片" />
      <CameraLayer
        camera={camera}
        bg={
          <div
            className="h-full w-full opacity-[0.5]"
            style={{
              backgroundImage: "radial-gradient(circle, oklch(0.55 0.15 250 / 0.07) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
        }
      >
        <div className="mt-2.5 grid flex-1 grid-cols-[34%_66%] gap-2 overflow-hidden rounded-lg border border-border/60 bg-background/40 p-2">
          {/* 左：文件托盘 + 上传区 + 文件 + 流水线 */}
          <div className="flex flex-col gap-1.5">
            {/* 桌面文件托盘（拖拽源） */}
            <div className="rounded-md border border-border/60 bg-card/60 px-1.5 py-1">
              <div className="mb-0.5 text-[7px] font-medium text-muted-foreground">本地文件夹 · 仪器导出</div>
              <div className={`flex items-center gap-1.5 rounded border border-slate-300 bg-white px-1.5 py-0.5 transition-all duration-300 ${t >= 2.0 && t < 3.8 ? "opacity-40 ring-1 ring-primary/40" : ""}`}>
                <FileText size={9} className="text-blue-500" />
                <span className="text-[8px] font-medium text-slate-700">Fe3O4-实验数据.zip</span>
                <span className="rounded-full bg-blue-500 px-1 py-px text-[6px] font-bold text-white">3</span>
              </div>
            </div>
            {/* 上传区 */}
            <div
              className={`rounded-md border border-dashed p-1.5 text-center transition-colors duration-300 ${
                dropActive ? "border-primary bg-primary-soft/40 ring-2 ring-primary/30" : "border-primary/40 bg-primary-soft/20"
              }`}
            >
              <Upload size={11} className="mx-auto text-primary" />
              <div className="text-[9px] font-medium">拖拽文件到此处或点击上传</div>
              <div className="text-[7px] text-muted-foreground">MD · CSV · PNG · JSON · LOG…</div>
            </div>
            {/* 文件列表 */}
            <div className="space-y-1">
              {uploadFiles.slice(0, fileCount).map((f, i) => (
                <motion.div
                  key={f.name}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded border border-border/60 bg-card/60 px-1.5 py-1"
                >
                  <div className="flex items-center gap-1">
                    <FileText size={9} className="shrink-0 text-primary" />
                    <span className="truncate text-[8px] font-medium">{f.name}</span>
                    {t >= 6.0 && <CheckCircle2 size={9} className="ml-auto shrink-0 text-green-500" />}
                  </div>
                  {i === fileCount - 1 && t >= 4.0 && (
                    <div className="text-[7px] text-muted-foreground">{f.detail}</div>
                  )}
                </motion.div>
              ))}
            </div>
            {/* 真实四阶段流水线 */}
            <div className="mt-auto space-y-0.5">
              {pipelineStages.map((s, i) => (
                <div
                  key={s.key}
                  className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[8px] ${
                    i < stage
                      ? "text-green-600"
                      : i === stage
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground/60"
                  }`}
                >
                  {i < stage ? (
                    <CheckCircle2 size={9} />
                  ) : i === stage ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <Sparkles size={9} />
                    </motion.div>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                  )}
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* 右：动态实验卡片（真实 DynamicCardEditor 结构，铺满） */}
          <div className="flex flex-col overflow-hidden rounded-md border border-border/60 bg-card/70 p-1.5">
            <div className="flex items-center justify-between border-b border-border/50 pb-1">
              <div>
                <div className="text-[10px] font-bold">水热合成 Fe3O4 磁性纳米颗粒</div>
                <div className="mt-0.5 flex gap-1">
                  <span className="rounded bg-primary-soft px-1 py-px text-[7px] text-primary">LabNote</span>
                  <span className="rounded-full bg-primary-soft px-1 py-px text-[7px] text-primary">水热合成</span>
                </div>
              </div>
              <div className="flex gap-0.5">
                {/* 保存按钮（点击反馈） */}
                <span
                  className={`flex items-center gap-0.5 rounded border px-1 py-0.5 transition-colors duration-300 ${
                    saved ? "border-green-400 bg-green-50 text-green-600" : "border-border/60 text-muted-foreground/60"
                  }`}
                >
                  {saved ? <CheckCircle2 size={8} /> : <Save size={8} />}
                  <span className="text-[7px]">{saved ? "已保存" : "保存"}</span>
                </span>
                {/* 导出按钮（点击弹出弹窗） */}
                <span
                  className={`flex items-center gap-0.5 rounded border px-1 py-0.5 transition-colors duration-300 ${
                    dialogOpen ? "border-blue-400 bg-blue-50 text-blue-600" : "border-border/60 text-muted-foreground/60"
                  }`}
                >
                  <FileText size={8} />
                  <span className="text-[7px]">导出</span>
                </span>
                <span className="flex items-center gap-0.5 rounded border border-border/60 px-1 py-0.5 text-muted-foreground/40">
                  <FileJson size={8} />
                </span>
                <span className="flex items-center gap-0.5 rounded border border-border/60 px-1 py-0.5 text-muted-foreground/40">
                  <Printer size={8} />
                </span>
                <span className="flex items-center gap-0.5 rounded border border-border/60 px-1 py-0.5 text-muted-foreground/40">
                  <Trash2 size={8} />
                </span>
              </div>
            </div>

            {/* 导出复现包弹窗（真实交互：先弹窗再点导出） */}
            {dialogOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px]"
              >
                <div className="w-52 rounded-lg border border-border bg-card p-3 shadow-xl">
                  <div className="flex items-center gap-1.5 border-b border-border/50 pb-1.5">
                    <Package size={12} className="text-primary" />
                    <span className="text-[10px] font-semibold">导出实验复现包</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {[
                      ["实验卡片（结构化字段）", true],
                      ["原始文件（3 个附件）", true],
                      ["复现协议（含安全防护）", true],
                    ].map(([label, checked]) => (
                      <div key={label as string} className="flex items-center gap-1.5 text-[8px] text-muted-foreground">
                        <span className={`flex h-3 w-3 items-center justify-center rounded border text-[7px] ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                          {checked ? "✓" : ""}
                        </span>
                        {label}
                      </div>
                    ))}
                    <div className="mt-1.5 flex gap-1">
                      {["JSON", "Markdown"].map((fmt) => (
                        <span key={fmt} className={`rounded px-1.5 py-0.5 text-[7px] ${fmt === "JSON" ? "bg-primary text-primary-foreground" : "border border-border/60 text-muted-foreground"}`}>
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2.5 flex justify-end gap-1.5">
                    <span className="rounded border border-border/60 px-2 py-0.5 text-[8px] text-muted-foreground">取消</span>
                    <span
                      className={`flex items-center gap-0.5 rounded px-2 py-0.5 text-[8px] font-medium transition-colors duration-300 ${
                        dialogExported ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {dialogExported ? <CheckCircle2 size={8} /> : <Download size={8} />}
                      {dialogExported ? "导出成功" : "导出"}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="mt-1 flex-1 overflow-hidden">
              {!showCard ? (
                <div className="flex h-full items-center justify-center text-[9px] text-muted-foreground/50">
                  {t < 3.9 ? "等待拖拽上传…" : "AI 解析中…"}
                </div>
              ) : (
                <>
                  {/* 核心字段 */}
                  <div className="grid grid-cols-3 gap-1">
                    {cardCoreFields.slice(0, coreCount).map((f) => (
                      <motion.div key={f.label} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className="rounded border border-border/50 px-1 py-0.5">
                        <div className="text-[7px] text-muted-foreground">{f.label}</div>
                        <div className="text-[8px] font-medium">{f.value}</div>
                      </motion.div>
                    ))}
                  </div>
                  {/* 字段组（逐组铺满） */}
                  {cardGroups.slice(0, groupCount).map((g) => (
                    <motion.div key={g.label} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5">
                      <div className="mb-0.5 text-[8px] font-semibold text-muted-foreground/80">{g.label}</div>
                      <div className="grid grid-cols-2 gap-1">
                        {g.fields.map((f) => (
                          <div key={f.label} className={`rounded border border-border/50 px-1 py-0.5 ${f.value.length > 14 ? "col-span-2" : ""}`}>
                            <div className="text-[7px] text-muted-foreground">{f.label}</div>
                            <div className="text-[7.5px] font-medium leading-snug">{f.value}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                  {/* 图集（真实图片 + 标注） */}
                  {galleryCount > 0 && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5">
                      <div className="mb-0.5 text-[8px] font-semibold text-muted-foreground/80">原始文件图集</div>
                      <div className="grid grid-cols-2 gap-1">
                        {cardGallery.slice(0, galleryCount).map((img) => (
                          <div key={img.src} className="overflow-hidden rounded border border-border/50">
                            <div className="relative h-14 w-full overflow-hidden bg-slate-100">
                              <img src={img.src} alt={img.caption} className="h-full w-full object-cover" loading="lazy" />
                            </div>
                            <div className="bg-card/80 px-1 py-0.5 text-[6.5px] leading-tight text-muted-foreground">{img.caption}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </div>
            {/* 字段计数徽标 */}
            {showCard && (
              <div className="mt-1 flex items-center justify-between border-t border-border/50 pt-1">
                <span className="rounded bg-primary-soft px-1 py-px text-[7px] text-primary">
                  {Math.min(totalFields, coreCount + cardGroups.slice(0, groupCount).reduce((s, g) => s + g.fields.length, 0))}/{totalFields} 字段
                </span>
                <span className="text-[7px] text-muted-foreground/60">AI 解析 · 置信度已校准</span>
              </div>
            )}
          </div>
        </div>
      </CameraLayer>
      <VirtualCursor steps={workbenchCursorSteps} camera={camera} dragLabel="Fe3O4-实验数据.zip" cycleSeconds={CYCLE} onTick={setT} />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ❷ 实验复现 — 真实 Checklist 流程（六步管道 + 缺口 + 评分环）
// ═══════════════════════════════════════════════════

const reproCursorSteps: CursorStep[] = [
  { x: 19, y: 20, dur: 1.6 }, // 移向库内资料包第一个芯片
  { x: 19, y: 20, dur: 0.4, click: true }, // 点选 SrTiO₃
  { x: 91, y: 14, dur: 1.2 }, // 移向 AI 拆解按钮（实测位置）
  { x: 91, y: 14, dur: 0.4, click: true }, // 开始拆解
  { x: 50, y: 30, dur: 7.2 }, // 停住：参数列表自行下拉
  { x: 15, y: 30, dur: 1.0 }, // 移向缺口 Tab（实测位置）
  { x: 15, y: 30, dur: 0.4, click: true }, // 切到缺口
  { x: 48, y: 44, dur: 1.4 }, // 移向第一个缺口输入框
  { x: 48, y: 44, dur: 0.4, click: true }, // 聚焦输入
  { x: 48, y: 44, dur: 1.8 }, // 停住：手动键入数值
  { x: 25, y: 30, dur: 1.0 }, // 移向协议 Tab（实测位置）
  { x: 25, y: 30, dur: 0.4, click: true }, // 切到协议
  { x: 50, y: 60, dur: 5.0 }, // 停住：协议自行下拉
  { x: 50, y: 60, dur: 1.0 }, // 停留最下端 1 秒
  { x: 50, y: 40, dur: 1.4 }, // 回到中央
];

// 参数列表 — 真实 SRTIO3_PRESET_AUDIT 解析数据（名称/数值/引用原文/确定性）
const reproParamList = [
  { name: "钛源 (TTIP)", value: "1.77 g", certainty: "论文明确", cls: "bg-green-50 text-green-600 border-green-200", quote: "“1.77 g of titanium(IV) isopropoxide”" },
  { name: "锶源 (SrCl₂)", value: "1.47 g", certainty: "论文明确", cls: "bg-green-50 text-green-600 border-green-200", quote: "“1.47 g of strontium chloride”" },
  { name: "三聚氰胺用量", value: "5.0 g", certainty: "论文明确", cls: "bg-green-50 text-green-600 border-green-200", quote: "“5.0 g of melamine powder”" },
  { name: "SrTiO₃ 水热温度", value: "200°C", certainty: "论文明确", cls: "bg-green-50 text-green-600 border-green-200", quote: "“heated at 200°C for 4 hours”" },
  { name: "SrTiO₃ 水热时间", value: "4 h", certainty: "论文明确", cls: "bg-green-50 text-green-600 border-green-200", quote: "“heated at 200°C for 4 hours”" },
  { name: "GO 超声时间", value: "2 h", certainty: "论文明确", cls: "bg-green-50 text-green-600 border-green-200", quote: "“ultrasonicated for 2 hours”" },
  { name: "HCl 处理浓度", value: "15 wt%", certainty: "论文明确", cls: "bg-green-50 text-green-600 border-green-200", quote: "“HCl (15 wt% in 50 mL DI water)”" },
  { name: "g-C₃N₄ 洗涤次数", value: "5 次", certainty: "论文明确", cls: "bg-green-50 text-green-600 border-green-200", quote: "“washed with DI water five times”" },
  { name: "SrTiO₃ 干燥时间", value: "~12 h", certainty: "论文隐含", cls: "bg-blue-50 text-blue-600 border-blue-200", quote: "“dried at 80°C overnight” → 过夜≈12-16h" },
  { name: "浓硫酸操作防护", value: "通风橱+耐酸手套", certainty: "论文隐含", cls: "bg-blue-50 text-blue-600 border-blue-200", quote: "“Concentrated H₂SO₄ … under ice bath”" },
  { name: "KOH 用量", value: "未明确", certainty: "未知", cls: "bg-red-50 text-red-600 border-red-200", quote: "“required amount of KOH” → 推测 1-3 g" },
  { name: "搅拌速度", value: "未明确", certainty: "未知", cls: "bg-red-50 text-red-600 border-red-200", quote: "论文未提及 → 需自行设定" },
];

// 缺口列表 — 真实 5 项缺口（重要性评述 + AI 建议均为真实解析内容）
const reproGapList = [
  {
    name: "KOH 精确用量未知",
    impact: "关键",
    input: true,
    suggest: "基于 TTIP(6.2mmol)/SrCl₂(9.3mmol)，推测 1-3 g 维持 pH>12；建议梯度实验 (1g, 2g, 3g)",
  },
  {
    name: "水热釜填充度和规格未知",
    impact: "关键",
    input: false,
    suggest: "反应液约 30-40 mL，推测 50 mL 釜、填充度 ~70%（常用 60-80%）",
  },
  {
    name: "GO 合成具体参数缺失",
    impact: "重要",
    input: false,
    suggest: "改进 Hummers 法标准：1g 石墨 + 0.5g NaNO₃ + 23mL H₂SO₄ + 3g KMnO₄，<20°C 2h",
  },
  {
    name: "光催化反应温度控制",
    impact: "重要",
    input: false,
    suggest: "论文未说明控温；建议循环水维持 25°C（卤素灯照射升温 5-15°C）",
  },
  {
    name: "搅拌速度未明确",
    impact: "一般",
    input: false,
    suggest: "推测 300-600 rpm；前驱体混合阶段建议 ≥500 rpm 保证均匀性",
  },
];

function ReproductionCell() {
  // 统一 26.0s 时间轴（光标只在点击/切页时移动）
  const CYCLE = 26.0;
  const [t, setT] = useState(0);
  const camera = useCamera();
  const paramRef = useRef<HTMLDivElement>(null);
  const protoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 时间轴由 VirtualCursor 统一时钟驱动（onTick），保证光标与动画绝对同步
  }, []);

  // 参数列表自行下拉（7.8s → 11.6s 中速，光标不动）
  useEffect(() => {
    const el = paramRef.current;
    if (!el || t < 7.8 || t > 11.6) return;
    const progress = Math.min(1, (t - 7.8) / 3.8);
    el.scrollTop = progress * (el.scrollHeight - el.clientHeight);
  }, [t]);

  // 协议自行下拉（17.4s → 22.2s），停留 1 秒
  useEffect(() => {
    const el = protoRef.current;
    if (!el || t < 17.4 || t > 22.2) return;
    const progress = Math.min(1, (t - 17.4) / 4.8);
    el.scrollTop = progress * (el.scrollHeight - el.clientHeight);
  }, [t]);

  // 阶段推导
  const presetSelected = t >= 2.0;
  const decompStart = t >= 3.6;
  const stepsDone = decompStart ? Math.min(6, Math.floor((t - 3.6) / 0.7) + 1) : 0;
  const paramsTab = t >= 7.8 && t < 12.2;
  const gapsTab = t >= 12.2 && t < 17.2;
  const protoTab = t >= 17.2;
  const gapTyped = Math.min(3, Math.max(0, Math.floor((t - 14.2) / 0.5)));
  const gapFilled = t >= 15.6;

  return (
    <div className={`${GLASS_CARD} relative h-full p-4`}>
      <NoiseTexture />
      <BorderBeam size={100} duration={8} colorFrom="oklch(0.52 0.18 250)" colorTo="oklch(0.62 0.18 220)" />
      <CellHeader icon={ScanLine} title="实验复现" desc="选择论文 → AI 拆解 → 参数 / 缺口 / 协议" />
      <CameraLayer camera={camera}>
        <div className="mt-2.5 flex flex-1 flex-col gap-1.5 overflow-hidden">
          {/* 论文输入：库内资料包 + 小号 AI 拆解按钮 */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 rounded-md border border-border/60 bg-card/60 px-2 py-1.5">
              <div className="mb-1 text-[7px] font-medium text-muted-foreground">论文输入 · 库内资料包</div>
              <div className="flex flex-wrap gap-1">
                {["SrTiO₃/rGO/g-C₃N₄", "Co₃O₄-rGO", "植物电生理", "空间转录组"].map((n, i) => (
                  <span
                    key={n}
                    className={`rounded border px-1.5 py-0.5 text-[7.5px] ${
                      i === 0 && presetSelected
                        ? "border-primary bg-primary-soft/50 font-medium text-primary"
                        : i === 0
                          ? "border-primary/50 text-primary"
                          : "border-border/60 text-muted-foreground/70"
                    }`}
                  >
                    {i === 0 && presetSelected ? "✓ " : ""}{n}
                  </span>
                ))}
              </div>
              <div className="mt-1 text-[7px] text-muted-foreground/70">
                DOI: <span className="text-primary/80">10.1038/s41598-024-66844-x</span>
                <span className="ml-2">或 手动导入论文 Methods…</span>
              </div>
            </div>
            <div
              className={`flex shrink-0 items-center gap-0.5 rounded border px-1.5 py-1 text-[7.5px] font-medium transition-colors duration-300 ${
                decompStart ? "border-primary/30 bg-primary/10 text-primary/70" : "border-primary/40 bg-primary/10 text-primary"
              }`}
            >
              <Sparkles size={8} />
              AI 拆解
            </div>
          </div>

          {/* 六步管道 */}
          {decompStart && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-md border border-border/60 bg-card/60 px-1.5 py-1">
              <div className="grid grid-cols-6 gap-0.5">
                {reproSteps.map((s, i) => (
                  <div key={s} className="flex flex-col items-center gap-0.5 text-center">
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] ${
                        i < stepsDone ? "bg-green-500 text-white" : i === stepsDone ? "bg-primary text-white" : "bg-secondary text-muted-foreground/60"
                      }`}
                    >
                      {i < stepsDone ? "✓" : i + 1}
                    </span>
                    <span className={`text-[6.5px] leading-tight ${i <= stepsDone ? "text-foreground/80" : "text-muted-foreground/50"}`}>{s}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 三个子界面：参数 / 缺口 / 协议 */}
          <div className="flex-1 overflow-hidden rounded-md border border-border/60 bg-card/60">
            {/* Tab 栏 */}
            <div className="flex border-b border-border/50 text-[8px]">
              {[
                ["params", "参数"],
                ["gaps", "缺口"],
                ["protocol", "协议"],
              ].map(([key, label]) => {
                const active = (key === "params" && paramsTab) || (key === "gaps" && gapsTab) || (key === "protocol" && protoTab);
                return (
                  <div
                    key={key}
                    className={`px-2.5 py-1 font-medium ${
                      active ? "border-b-2 border-primary text-primary" : "text-muted-foreground/60"
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>

            {/* 参数 Tab：真实解析参数完整下拉（带原文引用） */}
            {paramsTab && (
              <div ref={paramRef} className="h-full overflow-y-auto p-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/30">
                {reproParamList.map((p) => (
                  <div key={p.name} className="mb-0.5 rounded border border-border/50 bg-card/60 px-1.5 py-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-24 truncate text-[8px] text-muted-foreground">{p.name}</span>
                      <span className={`text-[8px] font-medium ${p.certainty === "未知" ? "text-destructive" : ""}`}>{p.value}</span>
                      <span className={`ml-auto rounded-full border px-1 py-px text-[7px] ${p.cls}`}>{p.certainty}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[6.5px] text-muted-foreground/60">{p.quote}</div>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="flex items-center gap-1 text-[8px]">
                    <CheckCircle2 size={9} className="text-green-500" />
                    <span className="text-muted-foreground">23 项已验证</span>
                  </div>
                  <div className="flex items-center gap-1 text-[8px]">
                    <AlertTriangle size={9} className="text-destructive" />
                    <span className="font-medium text-destructive">5 项缺口</span>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <div className="relative h-7 w-7">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" strokeDasharray="264" strokeDashoffset={264 - 264 * 0.75} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold">75</span>
                    </div>
                    <span className="text-[7px] text-muted-foreground">可行性评分</span>
                  </div>
                </div>
              </div>
            )}

            {/* 缺口 Tab：真实缺口 + 手动输入填补（光标停在输入条上） */}
            {gapsTab && (
              <div className="h-full space-y-0.5 overflow-y-auto p-1.5">
                {reproGapList.map((g, i) => (
                  <div key={g.name} className="rounded border border-border/50 bg-card/60 px-1.5 py-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-28 truncate text-[8px] font-medium">{g.name}</span>
                      <span
                        className={`rounded-full border px-1 py-px text-[6.5px] ${
                          g.impact === "关键" ? "border-red-200 bg-red-50 text-red-600" : g.impact === "重要" ? "border-amber-200 bg-amber-50 text-amber-600" : "border-blue-200 bg-blue-50 text-blue-600"
                        }`}
                      >
                        {g.impact}
                      </span>
                      {i === 0 && gapFilled && (
                        <span className="ml-auto flex items-center gap-0.5 rounded-full bg-green-50 px-1 py-px text-[6.5px] text-green-600">
                          <CheckCircle2 size={7} /> 已补充
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[6.5px] leading-snug text-muted-foreground/70">{g.suggest}</div>
                    {i === 0 && (
                      <div
                        className={`mt-1 flex items-center gap-1 rounded border px-1.5 py-0.5 text-[8px] transition-colors duration-300 ${
                          t >= 14.0 && t < 15.6 ? "border-primary ring-1 ring-primary/40" : "border-border/60"
                        }`}
                      >
                        <span className="text-muted-foreground/60">手动输入：</span>
                        <span className="font-medium text-slate-700">
                          {gapFilled ? "2 g" : "2 g".slice(0, gapTyped)}
                          {t >= 14.0 && t < 15.6 && <span className="ml-px inline-block h-2 w-px animate-pulse bg-primary align-middle" />}
                        </span>
                        <span className="ml-auto text-[6.5px] text-muted-foreground/50">单位 g · 梯度建议 1 / 2 / 3</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 协议 Tab：竞品级渲染界面（非 md），自行下拉 + 停留 1 秒 */}
            {protoTab && (
              <div ref={protoRef} className="h-full overflow-y-auto p-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/30">
                {/* 协议头部 */}
                <div className="mb-1.5 rounded-lg border border-primary/20 bg-gradient-to-r from-primary-soft/40 to-transparent px-2 py-1.5">
                  <div className="text-[8.5px] font-semibold">复现协议 · SrTiO₃/rGO/g-C₃N₄ 光催化剂</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[6.5px] text-muted-foreground">
                    <span className="rounded-full bg-green-100 px-1 py-px font-medium text-green-700">可行性 75</span>
                    <span>Sci Rep 14, 16259 (2024)</span>
                    <span>28 参数 · 5 缺口</span>
                  </div>
                </div>

                {/* 安全防护 */}
                <div className="mb-1.5 rounded-lg border border-red-200 bg-red-50/50 p-1.5">
                  <div className="mb-1 flex items-center gap-1 text-[7.5px] font-semibold text-red-600">
                    <AlertTriangle size={9} /> 安全防护（实验前必读）
                  </div>
                  {[
                    "浓硫酸：通风橱 + 耐酸手套 + 护目镜，冰浴下缓加 KMnO₄",
                    "KOH 强腐蚀：耐碱手套 + 面罩，配制放热需冷水浴",
                    "水热釜 200°C 高压：填充度 ≤80%，自然冷却至室温再开釜",
                    "纳米粉末：N95 + 通风橱操作，KMnO₄ 废液单独收集",
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-1 text-[6.5px] leading-snug text-red-700/80">
                      <span className="mt-px h-1 w-1 shrink-0 rounded-full bg-red-400" />
                      {s}
                    </div>
                  ))}
                </div>

                {/* 步骤卡 */}
                {[
                  {
                    title: "1. SrTiO₃ 合成（水热法）",
                    steps: [
                      "1.77 g TTIP 溶于无水乙醇，室温搅拌 1 h",
                      "1.47 g SrCl₂ + KOH 溶于 10 mL 去离子水",
                      "逐滴加入 TTIP 溶液，搅拌 30 min",
                      "水热釜 200°C · 4 h → 自然冷却",
                      "乙酸/去离子水洗涤 → 80°C 干燥过夜",
                    ],
                  },
                  {
                    title: "2. GO 合成（改进 Hummers 法）",
                    steps: [
                      "冰浴：石墨粉 + NaNO₃ + 浓 H₂SO₄",
                      "缓慢加入 KMnO₄（<20°C），搅拌 2 h",
                      "加 H₂O₂ 终止 → HCl/去离子水洗至中性",
                    ],
                  },
                  {
                    title: "3. g-C₃N₄ 制备",
                    steps: ["5.0 g 三聚氰胺，550°C 煅烧 4 h", "去离子水洗涤 5 次"],
                  },
                  {
                    title: "4. 复合与测试",
                    steps: [
                      "GO 超声分散 2 h → HCl 处理（15 wt%，50 mL）",
                      "催化剂 100 mg + 100 mL 染料液（MB/RhB 各 10 ppm）",
                    ],
                  },
                ].map((sec) => (
                  <div key={sec.title} className="mb-1 rounded-lg border border-border/60 bg-card/70 p-1.5">
                    <div className="mb-0.5 flex items-center gap-1 text-[7.5px] font-semibold text-primary">
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-primary/10 text-[7px] font-bold text-primary">
                        {sec.title.slice(0, 1)}
                      </span>
                      {sec.title}
                    </div>
                    {sec.steps.map((s, i) => (
                      <div key={i} className="flex items-start gap-1 text-[6.5px] leading-snug text-muted-foreground">
                        <span className="mt-0.5 shrink-0 text-primary/50">{i + 1}.</span>
                        {s}
                      </div>
                    ))}
                  </div>
                ))}

                {/* 表征 chips */}
                <div className="mb-1 rounded-lg border border-border/60 bg-card/70 p-1.5">
                  <div className="mb-0.5 text-[7.5px] font-semibold text-primary">5. 表征方案</div>
                  <div className="flex flex-wrap gap-1">
                    {["XRD", "SEM", "TEM", "UV-Vis DRS", "PL 光谱"].map((c) => (
                      <span key={c} className="rounded-full border border-primary/20 bg-primary-soft/30 px-1.5 py-0.5 text-[6.5px] text-primary">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 底部标记（停留 1 秒处） */}
                <div className="flex items-center justify-center gap-1 rounded bg-green-50 py-0.5 text-[7px] text-green-600">
                  <CheckCircle2 size={8} /> 已到协议末尾 · 含安全防护章节
                </div>
              </div>
            )}
          </div>
        </div>
      </CameraLayer>
      <VirtualCursor steps={reproCursorSteps} camera={camera} cycleSeconds={CYCLE} onTick={setT} />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ❸ 关系图谱 — 真实节点配色 + 标签化仿真团队数据
// ═══════════════════════════════════════════════════

const graphCursorSteps: CursorStep[] = [
  { x: 30, y: 14, dur: 1.3 },
  { x: 30, y: 14, dur: 0.4, click: true },
  { x: 46, y: 50, dur: 1.5 },
  { x: 46, y: 50, dur: 0.6 },
  { x: 74, y: 50, dur: 1.5 },
  { x: 22, y: 68, dur: 1.5 },
  { x: 34, y: 34, dur: 1.3 },
  { x: 34, y: 34, dur: 0.4, click: true },
];

function GraphCell() {
  const camera = useCamera();

  return (
    <div className={`${GLASS_CARD} relative h-full p-4`}>
      <NoiseTexture />
      <CellHeader icon={Network} title="关系图谱" desc="溯源链建模：样品 · 设备 · 试剂 · 方法 · 项目" />
      <CameraLayer camera={camera}>
        <div className="mt-2 flex-1 overflow-hidden rounded-lg border border-border/60 bg-background/40">
          {/* 页头（真实页面） */}
          <div className="flex items-center gap-1.5 border-b border-border/50 px-2 py-1">
            <span className="text-[9px] font-bold">实验关系图谱</span>
            <span className="text-[7px] text-muted-foreground">12 个节点 · 13 条关联</span>
            <span className="ml-auto flex items-center gap-1 rounded border border-border/60 bg-card/60 px-1.5 py-0.5 text-[7px] text-muted-foreground">
              <Search size={8} /> 搜索样品编号…
            </span>
          </div>
          {/* 图谱 */}
          <div className="relative h-[calc(100%-24px)]">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {graphSimEdges.map(([a, b], i) => {
                const na = graphSimNodes.find((n) => n.id === a)!;
                const nb = graphSimNodes.find((n) => n.id === b)!;
                return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="#cbd5e1" strokeWidth="0.4" opacity="0.7" />;
              })}
            </svg>
            {graphSimNodes.map((n) => (
              <div
                key={n.id}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1"
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: nodeColors[n.type] }} />
                <span
                  className={`whitespace-nowrap rounded border border-border/60 bg-card/90 px-1 py-px text-[7px] shadow-sm ${
                    n.type === "experiment" ? "font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {n.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* 图例（真实 7 类节点） */}
        <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
          {Object.entries(nodeTypeLabels).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1 text-[7.5px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: nodeColors[type] }} />
              {label}
            </div>
          ))}
        </div>
      </CameraLayer>
      <VirtualCursor steps={graphCursorSteps} camera={camera} cycleSeconds={9.9} />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ❹ 实验交接 — 6 个真实实验包 Bento（bento-grid 悬停浮起）
// ═══════════════════════════════════════════════════

const assetsCursorSteps: CursorStep[] = [
  { x: 18, y: 40, dur: 1.1 },
  { x: 50, y: 40, dur: 1.1 },
  { x: 82, y: 40, dur: 1.1 },
  { x: 18, y: 74, dur: 1.1 },
  { x: 50, y: 74, dur: 1.1 },
  { x: 82, y: 74, dur: 1.1 },
  { x: 72, y: 90, dur: 1.2 }, // 移向底部 JSON 导出按钮
  { x: 72, y: 90, dur: 0.4, click: true },
  { x: 50, y: 50, dur: 1.4 },
];

function AssetsCell() {
  const camera = useCamera();

  return (
    <div className={`${GLASS_CARD} flex h-full flex-col p-4`}>
      <NoiseTexture />
      <CellHeader icon={Package} title="实验资产" desc="6 个结构化实验包，可追溯、可导出" />
      <CameraLayer camera={camera}>
        <div className="mt-2.5 grid flex-1 grid-cols-2 gap-1.5 overflow-hidden">
          {assetPackages.map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 120, damping: 16 }}
              className="group relative overflow-hidden rounded-lg border border-border/60 bg-card/60 p-1.5 transition-shadow hover:shadow-md"
            >
              {/* 顶部学科色条 */}
              <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: a.color }} />
              {/* 标题：bento-grid 悬停浮起 */}
              <motion.div
                initial={{ y: 0 }}
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="text-[9px] font-semibold leading-snug"
              >
                {a.name}
              </motion.div>
              <div className="mt-1 flex items-center gap-1 text-[7.5px] text-muted-foreground">
                <Package size={8} />
                {a.meta}
              </div>
              <div className="mt-1 flex items-center justify-between text-[7px] text-muted-foreground/60">
                <span>{a.files} 个文件</span>
                <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 text-primary">
                  导出 <ArrowRight size={7} />
                </span>
              </div>
              {/* 悬停底部渐变（bento 风格） */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-primary-soft/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>
        {/* 导出操作（真实页面按钮） */}
        <div className="mt-1.5 flex gap-1.5">
          <span className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border/60 bg-card/60 px-2 py-1 text-[8px] font-medium">
            <FileText size={9} /> Markdown
          </span>
          <span className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-[8px] font-medium text-primary-foreground shadow-sm shadow-primary/20">
            <FileJson size={9} /> JSON
          </span>
        </div>
      </CameraLayer>
      <VirtualCursor steps={assetsCursorSteps} camera={camera} cycleSeconds={9.6} />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ❺ 论文智能起草 — 真实 Methods 生成流程
// ═══════════════════════════════════════════════════

const paperCursorSteps: CursorStep[] = [
  { x: 19, y: 28, dur: 1.6 }, // 移向左栏第一个实验包（实测位置）
  { x: 19, y: 28, dur: 0.4, click: true }, // 精准选中
  { x: 50, y: 40, dur: 1.2 }, // 移到预览区上方等待
  { x: 50, y: 40, dur: 2.0 }, // 停住：AI 生成（全文流式输出）
  { x: 50, y: 40, dur: 10.0 }, // 停住看全文输出
  { x: 82, y: 25, dur: 0.8 }, // 移到 LaTeX 切换（实测位置）
  { x: 82, y: 25, dur: 0.4, click: true }, // 切到 LaTeX
  { x: 82, y: 25, dur: 3.0 }, // 查看 LaTeX 代码
  { x: 92, y: 25, dur: 1.0 }, // 移到下载按钮（实测位置）
  { x: 92, y: 25, dur: 0.4, click: true }, // 打开格式菜单
  { x: 92, y: 34, dur: 0.8 }, // 选择 .tex
  { x: 92, y: 34, dur: 0.4, click: true }, // 确认下载
  { x: 50, y: 40, dur: 1.6 }, // 回到中央
];

// 真实大模型输出（XJTLU 网关 DeepSeek V4 Pro 生成，Nature Communications 风格，2026-08-14）
const methodsFullText = `Materials

Iron(III) chloride hexahydrate (FeCl₃·6H₂O, ≥99%, Sigma-Aldrich), iron(II) chloride tetrahydrate (FeCl₂·4H₂O, ≥99%, Sigma-Aldrich), sodium hydroxide (NaOH, ≥98%, pellets, Sigma-Aldrich), poly(ethylene glycol) 4000 (PEG-4000, Alfa Aesar), and absolute ethanol (≥99.8%, VWR) were used as received without further purification. Deionized water (18.2 MΩ·cm) was obtained from a Milli-Q Integral 3 system (Merck Millipore) and used throughout all experiments.

Synthesis of Fe₃O₄ magnetic nanoparticles

Fe₃O₄ magnetic nanoparticles were synthesised via a PEG-assisted hydrothermal method. In a typical synthesis, FeCl₃·6H₂O (2.703 g, 10 mmol) and FeCl₂·4H₂O (1.136 g, 5.7 mmol) were dissolved in deionized water (60 mL) under magnetic stirring at room temperature, yielding a clear orange solution with a Fe³⁺/Fe²⁺ molar ratio of approximately 1.75:1. PEG-4000 (0.5 g) was subsequently added to the solution and stirred for 30 min. Sodium hydroxide (4.0 g) was dissolved separately in deionized water (10 mL) and added dropwise under vigorous stirring. The mixture immediately turned black. The mixture was stirred for an additional 30 min.

The resulting suspension was transferred into a 100 mL Teflon-lined stainless-steel autoclave, sealed, and maintained at 200 °C for 8 h. After natural cooling to room temperature, the black precipitate was collected using a permanent NdFeB magnet (1.2 T surface field). The nanoparticles were washed by three cycles with deionized water and two cycles with absolute ethanol. The washed product was dried under vacuum at 60 °C for 12 h and subsequently annealed under flowing nitrogen (99.999%, 100 sccm) at 400 °C for 2 h, with a heating rate of 5 °C·min⁻¹.

Characterization

Powder X-ray diffraction patterns were recorded on a Rigaku SmartLab SE diffractometer (Cu Kα, λ = 1.5406 Å, 40 kV, 40 mA) over 10°–80° 2θ with a step size of 0.02°. Crystallite size was estimated from the (311) reflection using the Scherrer equation. Optical absorption spectra were acquired on a Shimadzu UV-2600 spectrophotometer (0.1 mg·mL⁻¹ aqueous dispersions, 200–800 nm, 1 cm quartz cuvette). Magnetic properties were measured at room temperature with a vibrating sample magnetometer (PPMS-DynaCool) over −30 kOe to +30 kOe; saturation magnetization, remanence, and coercivity were extracted from the hysteresis loops.`;

// LaTeX 版本（同一真实内容的 LaTeX 渲染）
const methodsLatex = `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=2.5cm]{geometry}
\\usepackage{amsmath,siunitx,booktabs}

\\begin{document}

\\section*{Materials}
Iron(III) chloride hexahydrate (FeCl$_3$\\cdot6H$_2$O, $\\geq$99\\%, Sigma-Aldrich),
iron(II) chloride tetrahydrate (FeCl$_2$\\cdot4H$_2$O, $\\geq$99\\%, Sigma-Aldrich),
sodium hydroxide (NaOH, $\\geq$98\\%), PEG-4000 (Alfa Aesar), and absolute ethanol
($\\geq$99.8\\%, VWR) were used as received. Deionized water (18.2 M$\\Omega$\\cdot cm)
was obtained from a Milli-Q Integral 3 system (Merck Millipore).

\\section*{Synthesis of Fe$_3$O$_4$ magnetic nanoparticles}
Fe$_3$O$_4$ nanoparticles were synthesised via a PEG-assisted hydrothermal method.
FeCl$_3$\\cdot6H$_2$O (2.703 g, 10 mmol) and FeCl$_2$\\cdot4H$_2$O (1.136 g, 5.7 mmol)
were dissolved in 60 mL deionized water under magnetic stirring
(Fe$^{3+}$/Fe$^{2+}$ = 1.75:1). PEG-4000 (0.5 g) was added and stirred for 30 min.
NaOH (4.0 g, in 10 mL water) was added dropwise under vigorous stirring.
The suspension was transferred into a 100 mL Teflon-lined autoclave and
maintained at \\SI{200}{\\celsius} for 8 h. After natural cooling, the precipitate
was collected with a NdFeB magnet (1.2 T), washed three times with water and
twice with ethanol, vacuum-dried at \\SI{60}{\\celsius} for 12 h, and annealed
under flowing N$_2$ (100 sccm) at \\SI{400}{\\celsius} for 2 h (\\SI{5}{\\celsius\\per\\minute}).

\\section*{Characterization}
XRD patterns were recorded on a Rigaku SmartLab SE (Cu K$\\alpha$, 10–80$^\\circ$ 2$\\theta$,
step 0.02$^\\circ$); crystallite size was estimated from the (311) reflection via the
Scherrer equation. UV–Vis spectra were acquired on a Shimadzu UV-2600
(0.1 mg\\,mL$^{-1}$ dispersion, 200–800 nm). Magnetic hysteresis loops were measured
at room temperature on a VSM (PPMS-DynaCool, $\\pm$30 kOe); $M_s$, $M_r$ and $H_c$
were extracted from the loops.

\\end{document}`;

function PaperCell() {
  // 统一 23.4s 时间轴
  const CYCLE = 23.4;
  const [t, setT] = useState(0);
  const camera = useCamera();

  useEffect(() => {
    // 时间轴由 VirtualCursor 统一时钟驱动（onTick），保证光标与动画绝对同步
  }, []);

  // 阶段推导（与光标点击时刻精确对齐：选包 2.0 / LaTeX 16.4 / 下载 20.8 / .tex 22.0）
  const selected = t >= 2.0;
  const generating = t >= 2.0 && t < 5.0; // 选中后先显示生成态，防止 PDF 空壳提前闪现
  const streamChars = t < 5.0 ? 0 : Math.min(methodsFullText.length, Math.floor((t - 5.0) * 380)); // 全文流式输出 ~15s
  const viewLatex = t >= 16.4;
  const menuOpen = t >= 20.8 && t < 22.8;
  const downloaded = t >= 22.4 && t < 23.4;

  return (
    <div className={`${GLASS_CARD} flex h-full flex-col p-4`}>
      <NoiseTexture />
      <CellHeader icon={PenLine} title="论文智能起草" desc="选中实验包 → AI 生成全文 → PDF / LaTeX 切换 → 多格式下载" />
      <CameraLayer camera={camera}>
        <div className="mt-2 flex-1 overflow-hidden">
          <div className="grid h-full grid-cols-[34%_66%] gap-1.5">
            {/* 左：实验包列表（真实 assets 数据） */}
            <div className="space-y-0.5 overflow-y-auto">
              <div className="text-[7px] font-medium text-muted-foreground">选择实验卡片（2-4 张）</div>
              {[
                { name: "水热合成 Fe3O4 磁性纳米颗粒", date: "2026-08-10", checked: selected },
                { name: "XRD 物相表征", date: "2026-08-11", checked: false },
                { name: "VSM 磁性能测试", date: "2026-08-11", checked: false },
                { name: "柠檬酸修饰 Fe3O4", date: "2026-08-12", checked: false },
              ].map((c, i) => (
                <div
                  key={c.name}
                  className={`flex items-center gap-1.5 rounded-md border px-1.5 py-1 transition-colors duration-300 ${
                    c.checked ? "border-primary bg-primary-soft/40" : "border-border/60 bg-card/60"
                  }`}
                >
                  <span className={`flex h-3 w-3 shrink-0 items-center justify-center rounded border text-[7px] ${c.checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                    {c.checked ? "✓" : ""}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[8px] font-medium leading-tight">{c.name}</div>
                    <div className="text-[6.5px] text-muted-foreground">{c.date}</div>
                  </div>
                  {i === 0 && selected && <Sparkles size={8} className="ml-auto shrink-0 text-primary" />}
                </div>
              ))}
            </div>

            {/* 右：Overleaf 风格预览（顶部 PDF/LaTeX 切换 + 下载） */}
            <div className="flex flex-col overflow-hidden rounded-md border border-border/60 bg-card/60">
              {/* 顶部工具栏 */}
              <div className="flex items-center gap-1 border-b border-border/50 px-1.5 py-1">
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-400/70" />
                  <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                  <span className="h-2 w-2 rounded-full bg-green-400/70" />
                </span>
                <span className="ml-1 rounded bg-primary-soft px-1.5 py-0.5 text-[7px] font-medium text-primary">
                  论文 Methods 草稿
                </span>
                {/* PDF / LaTeX 切换（Overleaf 效果） */}
                <span className="ml-auto flex rounded border border-border/60 text-[7px]">
                  <span className={`rounded-l px-1.5 py-0.5 transition-colors ${!viewLatex ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    PDF
                  </span>
                  <span className={`rounded-r px-1.5 py-0.5 transition-colors ${viewLatex ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    LaTeX
                  </span>
                </span>
                {/* 下载按钮（多格式菜单） */}
                <span className="relative">
                  <span className={`flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[7px] transition-colors ${downloaded ? "border-green-400 bg-green-50 text-green-600" : "border-border/60 text-muted-foreground"}`}>
                    <Download size={8} />
                    {downloaded ? "已下载" : "下载"}
                  </span>
                  {menuOpen && (
                    <span className="absolute right-0 top-full z-10 mt-0.5 w-20 rounded-md border border-border bg-card p-0.5 shadow-lg">
                      {[".md", ".pdf", ".tex"].map((f) => (
                        <span key={f} className={`block rounded px-1.5 py-0.5 text-[7px] ${f === ".tex" ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground"}`}>
                          {f === ".tex" ? "✓ " : ""}{f}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </div>

              {/* 内容区：PDF 渲染 / LaTeX 代码 */}
              <div className="flex-1 overflow-y-auto p-2">
                {!selected ? (
                  <div className="flex h-full items-center justify-center text-[8px] text-muted-foreground/50">
                    从左侧选择实验卡片…
                  </div>
                ) : generating ? (
                  <div className="flex h-full flex-col items-center justify-center gap-1.5">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <Sparkles size={14} className="text-primary" />
                    </motion.div>
                    <span className="text-[8px] text-muted-foreground">AI 正在组织学术语言…</span>
                  </div>
                ) : !viewLatex ? (
                  /* PDF 学术排版视图 */
                  <div className="rounded border border-border/40 bg-white p-2 shadow-sm">
                    <div className="border-b border-slate-200 pb-1 text-center">
                      <div className="font-serif text-[10px] font-bold leading-tight">Materials and Methods</div>
                      <div className="mt-0.5 font-serif text-[7px] italic text-slate-500">Fe₃O₄ Magnetic Nanoparticles</div>
                    </div>
                    <pre className="mt-1 whitespace-pre-wrap font-serif text-[7.5px] leading-relaxed text-slate-800">
                      {methodsFullText.slice(0, streamChars)}
                      {streamChars < methodsFullText.length && (
                        <span className="ml-px inline-block h-2 w-0.5 animate-pulse bg-blue-600 align-middle" />
                      )}
                    </pre>
                  </div>
                ) : (
                  /* LaTeX 代码视图（浅色编辑器，与整体风格协调） */
                  <div className="rounded border border-border/40 bg-white p-2 shadow-sm">
                    <div className="mb-1 flex items-center gap-1 text-[6.5px] text-slate-500">
                      <span className="rounded bg-primary-soft px-1 py-px font-medium text-primary">methods.tex</span>
                      <span>Overleaf · 已编译</span>
                      <span className="ml-auto font-medium text-green-600">✓ 无编译错误</span>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-[6.5px] leading-relaxed text-slate-600">
                      {methodsLatex}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CameraLayer>
      <VirtualCursor steps={paperCursorSteps} camera={camera} cycleSeconds={CYCLE} onTick={setT} />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════

export function ProductShowcase() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <BlurFade inView inViewMargin="-50px">
        <h2 className="mb-8 text-2xl font-bold md:text-3xl">核心功能展示</h2>
      </BlurFade>

      {/*
        Bento Grid（Z 型阅读顺序）：
        Row 1-2: [❶工作台 col-span-2] [❷实验复现]
        Row 3:   [❺论文起草] [❹实验资产] [❸关系图谱]
      */}
      <div className="grid grid-cols-1 gap-4 auto-rows-[18rem] md:grid-cols-3">
        {/* ❶ 工作台 — 最大格 */}
        <BlurFade className="md:col-span-2 md:row-span-2" delay={0} inView inViewMargin="-30px">
          <WorkbenchCell />
        </BlurFade>

        {/* ❷ 实验复现 */}
        <BlurFade className="md:row-span-2" delay={0.05} inView inViewMargin="-30px">
          <ReproductionCell />
        </BlurFade>

        {/* ❸ 关系图谱 — 左下 */}
        <BlurFade className="md:col-start-1 md:row-start-3" delay={0.1} inView inViewMargin="-30px">
          <GraphCell />
        </BlurFade>

        {/* ❺ 论文智能起草 — 中下 */}
        <BlurFade className="md:col-start-2 md:row-start-3" delay={0.15} inView inViewMargin="-30px">
          <PaperCell />
        </BlurFade>

        {/* ❹ 实验资产 — 右下 */}
        <BlurFade className="md:col-start-3 md:row-start-3" delay={0.2} inView inViewMargin="-30px">
          <AssetsCell />
        </BlurFade>
      </div>
    </section>
  );
}
