/**
 * HeroShowcase — Sticky Scroll 产品真实交互演示
 *
 * 架构：
 * - 500vh 容器 + 100vh sticky 视口，useScroll 映射滚动进度到 5 个场景
 * - 每个场景 = 真实页面 1:1 复刻（浅色原页面装在浏览器窗框内）+ 虚拟光标自动演示真实操作流程
 * - 仅使用 transform/opacity（GPU 加速）
 * - 玻璃拟态 + 顶部内高光 + 噪点纹理（生产级质感）
 */

import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useMotionTemplate,
  animate,
  type MotionValue,
} from "motion/react";
import { useRef, useState, useEffect } from "react";
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Package,
  ArrowRight,
  Sparkles,
  Search,
  Loader2,
  Save,
  FileJson,
  Printer,
  Trash2,
  ChevronRight,
} from "lucide-react";

// ═══════════════════════════════════════════════════
// 场景定义（5 张核心功能卡）
// ═══════════════════════════════════════════════════

const sceneLabels = [
  { title: "多源数据采集", sub: "Multi-modal Data Capture" },
  { title: "复现审计", sub: "Reproduction Audit" },
  { title: "关系图谱", sub: "Relation Graph" },
  { title: "论文辅助", sub: "Paper Assistant" },
  { title: "实验资产", sub: "Research Assets" },
];

// ═══════════════════════════════════════════════════
// 共享组件：浏览器窗框（真实页面容器）
// ═══════════════════════════════════════════════════

function BrowserWindow({
  url,
  children,
  className = "",
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_60px_rgba(59,130,246,0.12)] backdrop-blur-xl ${className}`}
    >
      {/* 浏览器顶栏 */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-[10px] text-slate-500 shadow-sm ring-1 ring-slate-200">
          <span className="text-green-500">🔒</span>
          {url}
        </div>
        <div className="w-10" />
      </div>
      {/* 真实页面内容 */}
      <div className="relative bg-white text-left">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// 共享组件：虚拟光标（自动演示真实操作流）
// ═══════════════════════════════════════════════════

type CursorStep = { x: number; y: number; dur: number; click?: boolean };

/**
 * 在指定区域内循环播放光标移动 + 点击动效
 * 坐标使用百分比（0-100）
 */
function VirtualCursor({
  steps,
  active,
  regionRef,
}: {
  steps: CursorStep[];
  active: boolean;
  regionRef: React.RefObject<HTMLDivElement | null>;
}) {
  const xPct = useMotionValue(steps[0]?.x ?? 50);
  const yPct = useMotionValue(steps[0]?.y ?? 50);
  const clickScale = useMotionValue(0);

  useEffect(() => {
    if (!active) return;
    // 组装关键帧序列：光标位置 + 点击涟漪
    const total = steps.reduce((sum, s) => sum + s.dur, 0) + 1.2; // 结尾停顿
    const xKeyframes: number[] = [steps[0].x];
    const yKeyframes: number[] = [steps[0].y];
    const times: number[] = [0];
    let t = 0;
    steps.forEach((s) => {
      xKeyframes.push(s.x, s.x);
      yKeyframes.push(s.y, s.y);
      t += s.dur;
      times.push(t / total, t / total);
    });
    // 涟漪关键帧：在 click 步骤时出现
    const rippleTimes: number[] = [];
    const rippleVals: number[] = [];
    let rt = 0;
    steps.forEach((s) => {
      rt += s.dur;
      if (s.click) {
        rippleTimes.push(rt / total, Math.min(1, rt / total + 0.25 / total * 25));
        rippleVals.push(1, 0);
      }
    });
    const controls = animate(xPct, xKeyframes, { duration: total, times, repeat: Infinity, ease: "easeInOut" });
    const controlsY = animate(yPct, yKeyframes, { duration: total, times, repeat: Infinity, ease: "easeInOut" });
    const controlsR = rippleTimes.length
      ? animate(clickScale, rippleVals, { duration: total, times: rippleTimes, repeat: Infinity, ease: "easeOut" })
      : null;
    return () => {
      controls.stop();
      controlsY.stop();
      controlsR?.stop();
    };
  }, [active, steps, xPct, yPct, clickScale]);

  const xPx = useTransform(xPct, (v) => `calc(${v}% - 10px)`);
  const yPx = useTransform(yPct, (v) => `calc(${v}% - 6px)`);
  const rippleScale = useSpring(clickScale, { stiffness: 300, damping: 20 });

  return (
    <div ref={regionRef} className="pointer-events-none absolute inset-0 z-30">
      {/* 点击涟漪 */}
      <motion.div
        style={{ left: xPx, top: yPx, scale: rippleScale }}
        className="absolute -ml-3 -mt-3 h-8 w-8 rounded-full border-2 border-blue-500/70 bg-blue-500/20"
      />
      {/* 光标箭头 */}
      <motion.div style={{ left: xPx, top: yPx }} className="absolute">
        <svg width="20" height="20" viewBox="0 0 24 24" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
          <path d="M5 3l14 7.5-6.2 1.8L9 18.5 5 3z" fill="#fff" stroke="#334155" strokeWidth="1.2" />
        </svg>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// 场景进度指示器
// ═══════════════════════════════════════════════════

function SceneIndicator({ progress }: { progress: MotionValue<number> }) {
  const [active, setActive] = useState(0);
  useMotionValueEvent(progress, "change", (v) => {
    setActive(Math.min(4, Math.floor(v * 5)));
  });

  return (
    <div className="absolute right-6 top-1/2 z-50 hidden -translate-y-1/2 flex-col gap-4 md:flex">
      {sceneLabels.map((scene, i) => (
        <div key={i} className="flex items-center justify-end gap-2">
          <span
            className={`text-xs transition-all duration-300 ${
              active === i ? "translate-x-0 text-blue-400 opacity-100" : "translate-x-2 text-white/40 opacity-0"
            }`}
          >
            {scene.title}
          </span>
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              active === i ? "w-6 bg-blue-400" : "w-1.5 bg-white/20"
            }`}
          />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Scene 1: 多源数据采集 — 工作台真实界面
// 流程：拖入 3 个文件 → 4 阶段解析 → 动态实验卡片生成
// ═══════════════════════════════════════════════════

const SCENE1_STEPS: CursorStep[] = [
  { x: 22, y: 52, dur: 1.6 }, // 移到上传区
  { x: 22, y: 52, dur: 0.5, click: true }, // 点击上传
  { x: 30, y: 62, dur: 1.2 }, // 观察进度
  { x: 50, y: 40, dur: 1.2 }, // 移到中栏卡片
  { x: 50, y: 55, dur: 1.2 }, // 移到字段
  { x: 78, y: 35, dur: 1.4 }, // 移到右栏置信度
  { x: 78, y: 35, dur: 0.4, click: true },
  { x: 50, y: 50, dur: 1.2 }, // 回到中央
];

const scene1Files = [
  { name: "XRD-结果分析.csv", ext: "csv", status: "complete", detail: "提取 11 行数据 · 物相: Fe3O4" },
  { name: "实验笔记.md", ext: "md", status: "complete", detail: "温度 200°C · 时间 8h · 操作人" },
  { name: "SEM-形貌图.png", ext: "png", status: "complete", detail: "视觉识别: 球形颗粒 · 标尺 100nm" },
];

const scene1Stages = ["读取文件内容", "AI 文本识别", "去重合并生成卡片", "完成"];

function Scene1({ progress, active }: { progress: MotionValue<number>; active: boolean }) {
  const opacity = useTransform(progress, [0, 0.03, 0.17, 0.2], [0, 1, 1, 0]);
  const scale = useTransform(progress, [0, 0.2], [0.97, 1]);
  const winRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div style={{ opacity, scale }} className="absolute inset-0 flex items-center justify-center px-4">
      <BrowserWindow url="labnote.tech/workbench" className="h-[78vh] w-full max-w-5xl">
        <div className="grid h-[calc(78vh-38px)] grid-cols-[26%_46%_28%] text-[11px] text-slate-600">
          {/* 左栏：数据输入 + 历史实验 */}
          <div className="border-r border-slate-200 p-3">
            <div className="mb-1 font-semibold text-slate-800">数据输入</div>
            <div className="rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 p-3 text-center">
              <Upload className="mx-auto mb-1 h-4 w-4 text-blue-500" />
              <div className="text-[10px] font-medium text-slate-700">拖拽文件到此处或点击上传</div>
              <div className="mt-1 text-[9px] leading-relaxed text-slate-400">
                支持 MD · TXT · CSV · PDF · DOCX · XLSX · PNG · JPG · JSON · LOG
              </div>
            </div>
            {/* 解析中文件列表 */}
            <div className="mt-3 space-y-1.5">
              {scene1Files.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={active ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.4 + i * 0.35 }}
                  className="rounded-md border border-slate-200 bg-white p-1.5 shadow-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3 shrink-0 text-blue-500" />
                    <span className="truncate text-[10px] font-medium text-slate-700">{f.name}</span>
                    <CheckCircle2 className="ml-auto h-3 w-3 shrink-0 text-green-500" />
                  </div>
                  <div className="mt-0.5 text-[9px] text-slate-400">{f.detail}</div>
                </motion.div>
              ))}
            </div>
            <div className="mt-3 font-semibold text-slate-800">历史实验</div>
            <div className="mt-1.5 space-y-1">
              {["水热合成 Fe3O4 磁性纳米颗粒", "XRD 物相表征分析"].map((n, i) => (
                <div key={i} className={`rounded-md px-2 py-1.5 text-[10px] ${i === 0 ? "bg-blue-50 font-medium text-blue-700 ring-1 ring-blue-200" : "text-slate-500 hover:bg-slate-50"}`}>
                  {n}
                </div>
              ))}
            </div>
          </div>

          {/* 中栏：动态实验卡片（复刻真实 DynamicCardEditor） */}
          <div className="overflow-hidden border-r border-slate-200 bg-slate-50/60 p-3">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={active ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.2, type: "spring", stiffness: 90, damping: 16 }}
              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">水热合成 Fe3O4 磁性纳米颗粒</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-600">
                      LabNote
                    </span>
                    <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-600">水热合成</span>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[Save, FileText, FileJson, Printer, Trash2].map((Icon, i) => (
                    <span key={i} className="rounded border border-slate-200 p-0.5 text-slate-400">
                      <Icon className="h-2.5 w-2.5" />
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                {[
                  ["实验时间", "2026-08-10"],
                  ["实验人员", "刘雨桐"],
                  ["实验类型", "synthesis"],
                ].map(([l, v]) => (
                  <div key={l} className="rounded border border-slate-200 px-1.5 py-1">
                    <div className="text-[9px] text-slate-400">{l}</div>
                    <div className="text-[10px] font-medium text-slate-700">{v}</div>
                  </div>
                ))}
              </div>
              {/* 字段组 */}
              {[
                { label: "实验条件", fields: [["温度", "200°C"], ["时间", "8 h"], ["pH", "10.5"]] },
                { label: "试剂与材料", fields: [["前驱体", "FeCl3·6H2O"], ["模板剂", "PEG-4000"]] },
              ].map((g) => (
                <div key={g.label} className="mt-2.5">
                  <div className="mb-1 text-[10px] font-semibold text-slate-700">{g.label}</div>
                  <div className="grid grid-cols-3 gap-1">
                    {g.fields.map(([l, v]) => (
                      <div key={l} className="rounded border border-slate-200 px-1.5 py-1">
                        <div className="text-[9px] text-slate-400">{l}</div>
                        <div className="text-[10px] font-medium text-slate-700">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* 右栏：AI 置信度评估 + 复现助手 */}
          <div className="space-y-2.5 p-3">
            <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-blue-500" />
                <span className="text-[10px] font-semibold text-slate-800">AI 置信度评估</span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="w-[62%] bg-green-500" />
                <div className="w-[30%] bg-yellow-400" />
                <div className="w-[8%] bg-red-400" />
              </div>
              <div className="mt-1.5 space-y-1">
                {([
                  ["反应温度", 0.95],
                  ["反应时间", 0.9],
                  ["搅拌速度", 0.68],
                ] as Array<[string, number]>).map(([label, conf]) => (
                  <div key={label} className="flex items-center justify-between text-[9px]">
                    <span className="text-slate-500">{label}</span>
                    <span className={conf > 0.85 ? "text-green-600" : conf > 0.7 ? "text-yellow-600" : "text-orange-500"}>
                      {Math.round(conf * 100)}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex gap-1">
                <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-medium text-white">一键补全</span>
                <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[9px] text-slate-500">重新解析</span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="mb-1 text-[10px] font-semibold text-slate-800">复现助手</div>
              <div className="text-[9px] leading-relaxed text-slate-500">
                检测到 <span className="font-medium text-red-500">1 项缺失字段</span>
                <div className="mt-1 flex items-center gap-1">● 实验人员</div>
              </div>
            </div>
          </div>
        </div>
        {/* 底部：四阶段进度条 */}
        <div className="absolute bottom-2 left-[26%] right-[28%] mx-auto w-[46%]">
          <div className="flex items-center justify-between">
            {scene1Stages.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] ${i < 3 ? "bg-blue-600 text-white" : i === 3 ? "bg-green-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                  {i < 2 ? i + 1 : i === 2 ? "✓" : "✓"}
                </span>
                <span className={`text-[9px] ${i <= 2 ? "text-slate-600" : "text-green-600"}`}>{s}</span>
                {i < 3 && <div className="h-px w-6 bg-slate-300" />}
              </div>
            ))}
          </div>
        </div>
        <VirtualCursor steps={SCENE1_STEPS} active={active} regionRef={winRef} />
      </BrowserWindow>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════
// Scene 2: 复现审计 — Checklist 真实界面
// 流程：选择预设论文 → AI 拆解 6 步 → 参数/缺口/评分
// ═══════════════════════════════════════════════════

const SCENE2_STEPS: CursorStep[] = [
  { x: 18, y: 40, dur: 1.4 }, // 移到论文输入
  { x: 18, y: 40, dur: 0.4, click: true }, // 点选 SrTiO3 预设
  { x: 50, y: 82, dur: 1.4 }, // 移到拆解按钮
  { x: 50, y: 82, dur: 0.4, click: true }, // 点击 AI 拆解
  { x: 50, y: 30, dur: 1.6 }, // 观察管道进度
  { x: 78, y: 35, dur: 1.4 }, // 移到评分环
  { x: 42, y: 60, dur: 1.4 }, // 移到参数列表
  { x: 42, y: 60, dur: 0.4, click: true }, // 展开参数
];

const scene2Steps = [
  "连接 AI 引擎",
  "AI 拆解论文 Methods",
  "静态领域知识库匹配",
  "Materials Project 查询",
  "NIST Chemistry WebBook 查询",
  "生成复现审计报告",
];

const scene2Params = [
  { name: "水热反应温度", value: "200°C", certainty: "论文明确", color: "text-green-600 bg-green-50 border-green-200" },
  { name: "水热反应时间", value: "4 h", certainty: "论文明确", color: "text-green-600 bg-green-50 border-green-200" },
  { name: "TTIP 用量", value: "1.77 g", certainty: "论文明确", color: "text-green-600 bg-green-50 border-green-200" },
  { name: "干燥温度", value: "80°C", certainty: "论文隐含", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { name: "搅拌转速", value: "500 rpm", certainty: "AI 推断", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { name: "KOH 浓度", value: "—", certainty: "未知", color: "text-red-600 bg-red-50 border-red-200" },
];

function Scene2({ progress, active }: { progress: MotionValue<number>; active: boolean }) {
  const opacity = useTransform(progress, [0.18, 0.22, 0.37, 0.4], [0, 1, 1, 0]);
  const scale = useTransform(progress, [0.18, 0.22], [0.97, 1]);
  const winRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div style={{ opacity, scale }} className="absolute inset-0 flex items-center justify-center px-4">
      <BrowserWindow url="labnote.tech/checklist" className="h-[78vh] w-full max-w-5xl">
        <div className="grid h-[calc(78vh-38px)] grid-cols-[30%_70%]">
          {/* 左：论文输入 */}
          <div className="space-y-2 border-r border-slate-200 p-3">
            <div className="font-semibold text-slate-800">论文输入</div>
            <div className="space-y-1">
              {["SrTiO₃", "Co₃O₄-rGO", "植物电生理", "空间转录组"].map((n, i) => (
                <div
                  key={n}
                  className={`rounded-md border px-2 py-1.5 text-[10px] ${
                    i === 0 ? "border-blue-300 bg-blue-50 font-medium text-blue-700" : "border-slate-200 text-slate-500"
                  }`}
                >
                  {i === 0 ? "✓ " : ""}{n}
                </div>
              ))}
            </div>
            <div className="rounded-md bg-slate-50 p-2 text-[9px] leading-relaxed text-slate-500">
              DOI: <span className="text-blue-600">10.1038/s41598-024-66844-x</span>
              <div className="mt-1 text-slate-400">Methods 段落已预加载（真实论文内容）</div>
            </div>
            {/* 拆解按钮 */}
            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-medium text-white">
              <Sparkles className="h-3 w-3" /> AI 拆解论文 → 复现参数
            </div>
          </div>

          {/* 右：管道进度 + 参数 + 评分环 */}
          <div className="space-y-2 overflow-hidden bg-slate-50/60 p-3">
            {/* 六步管道 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={active ? { opacity: 1 } : {}}
              transition={{ delay: 1.0 }}
              className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"
            >
              <div className="mb-1.5 text-[10px] font-semibold text-slate-800">AI 拆解管道</div>
              <div className="grid grid-cols-6 gap-1">
                {scene2Steps.map((s, i) => (
                  <div key={s} className="flex flex-col items-center gap-0.5 text-center">
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] ${i < 5 ? "bg-blue-600 text-white" : "bg-green-500 text-white"}`}>
                      {i < 5 ? i + 1 : "✓"}
                    </span>
                    <span className={`text-[8px] leading-tight ${i < 5 ? "text-slate-500" : "text-green-600"}`}>{s}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="grid flex-1 grid-cols-[1fr_130px] gap-2">
              {/* 参数列表（确定性徽标 = 真实 UI） */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={active ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 2.0 }}
                className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-800">参数列表（28 项）</span>
                  <span className="text-[9px] text-slate-400">Tab: 参数 | 缺口 | 协议</span>
                </div>
                {scene2Params.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 rounded-md border border-slate-100 px-2 py-1">
                    <span className="w-24 text-[10px] text-slate-600">{p.name}</span>
                    <span className="text-[10px] font-medium text-slate-800">{p.value}</span>
                    <span className={`ml-auto rounded-full border px-1.5 py-0.5 text-[8px] ${p.color}`}>{p.certainty}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50/60 px-2 py-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span className="text-[9px] text-red-600">5 个复现缺口 · 关键缺口: KOH 浓度未提及</span>
                </div>
              </motion.div>

              {/* 评分环 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={active ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 2.4 }}
                className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"
              >
                <div className="relative h-20 w-20">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="7" />
                    <circle
                      cx="50" cy="50" r="42" fill="none" stroke="#2563eb" strokeWidth="7" strokeLinecap="round"
                      strokeDasharray="264" strokeDashoffset={264 - 264 * 0.82}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-slate-900">82</span>
                  </div>
                </div>
                <div className="mt-1 text-[9px] text-slate-400">复现可行性评分</div>
                <div className="mt-1.5 space-y-0.5 text-[8px]">
                  <div className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-2.5 w-2.5" /> 23 项已验证</div>
                  <div className="flex items-center gap-1 text-red-500"><AlertTriangle className="h-2.5 w-2.5" /> 5 项缺失</div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
        <VirtualCursor steps={SCENE2_STEPS} active={active} regionRef={winRef} />
      </BrowserWindow>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════
// Scene 3: 关系图谱 — 真实页面 + 真实风格仿真数据
// （实体名均为真实科研命名风格，溯源链节点模型）
// ═══════════════════════════════════════════════════

const SCENE3_STEPS: CursorStep[] = [
  { x: 30, y: 16, dur: 1.4 }, // 移到搜索框
  { x: 30, y: 16, dur: 0.4, click: true }, // 聚焦搜索
  { x: 42, y: 52, dur: 1.6 }, // 移到样品节点
  { x: 42, y: 52, dur: 0.5 }, // 悬停高亮
  { x: 62, y: 68, dur: 1.6 }, // 移到方法节点
  { x: 50, y: 38, dur: 1.6 }, // 移到实验节点
  { x: 50, y: 38, dur: 0.4, click: true }, // 点开实验
  { x: 78, y: 30, dur: 1.2 }, // 移到 N-hop 控制
];

const NODE_COLORS_VIS = {
  experiment: "#6366f1",
  sample: "#f59e0b",
  device: "#10b981",
  operator: "#06b6d4",
  reagent: "#ec4899",
  method: "#8b5cf6",
  project: "#0ea5e9",
};

type GNode = { id: string; label: string; type: keyof typeof NODE_COLORS_VIS; x: number; y: number };
type GEdge = { a: string; b: string };

const scene3Nodes: GNode[] = [
  { id: "e1", label: "水热合成 Fe3O4 磁性纳米颗粒", type: "experiment", x: 34, y: 34 },
  { id: "e2", label: "XRD 物相表征", type: "experiment", x: 58, y: 26 },
  { id: "e3", label: "VSM 磁性能测试", type: "experiment", x: 72, y: 52 },
  { id: "e4", label: "TEM 形貌观察", type: "experiment", x: 56, y: 72 },
  { id: "e5", label: "柠檬酸修饰 Fe3O4", type: "experiment", x: 22, y: 66 },
  { id: "s1", label: "Fe3O4-SYN-20260810-A", type: "sample", x: 44, y: 50 },
  { id: "s2", label: "Fe3O4@CA-20260812", type: "sample", x: 18, y: 46 },
  { id: "d1", label: "Rigaku SmartLab SE", type: "device", x: 62, y: 14 },
  { id: "d2", label: "振动样品磁强计 VSM-8600", type: "device", x: 84, y: 38 },
  { id: "d3", label: "透射电镜 JEM-2100F", type: "device", x: 44, y: 84 },
  { id: "m1", label: "水热法", type: "method", x: 14, y: 28 },
  { id: "r1", label: "FeCl3·6H2O", type: "reagent", x: 26, y: 14 },
  { id: "r2", label: "柠檬酸", type: "reagent", x: 8, y: 58 },
  { id: "p1", label: "磁性纳米材料专项", type: "project", x: 78, y: 78 },
];

const scene3Edges: GEdge[] = [
  { a: "e1", b: "s1" }, { a: "e1", b: "m1" }, { a: "e1", b: "r1" }, { a: "e1", b: "d1" },
  { a: "e2", b: "s1" }, { a: "e2", b: "d1" },
  { a: "e3", b: "s1" }, { a: "e3", b: "d2" },
  { a: "e4", b: "s1" }, { a: "e4", b: "d3" },
  { a: "e5", b: "s1" }, { a: "e5", b: "s2" }, { a: "e5", b: "r2" },
  { a: "e1", b: "p1" }, { a: "e5", b: "p1" },
];

function Scene3({ progress, active }: { progress: MotionValue<number>; active: boolean }) {
  const opacity = useTransform(progress, [0.38, 0.42, 0.57, 0.6], [0, 1, 1, 0]);
  const scale = useTransform(progress, [0.38, 0.42], [0.97, 1]);
  const winRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div style={{ opacity, scale }} className="absolute inset-0 flex items-center justify-center px-4">
      <BrowserWindow url="labnote.tech/graph" className="h-[78vh] w-full max-w-5xl">
        <div className="relative h-[calc(78vh-38px)]">
          {/* 页头 */}
          <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
            <div className="rounded-lg bg-blue-600 p-1 text-white">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h2m6 0h2M7 19h2m6 0h2M5 7v2m0 6v2m14-10v2m0 6v2"/></svg>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">实验关系图谱</div>
              <div className="text-[9px] text-slate-400">15 个节点 · 15 条关联</div>
            </div>
            {/* 搜索框 */}
            <div className="ml-auto flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[9px] text-slate-400">
              <Search className="h-2.5 w-2.5" /> 搜索实验名称 / 样品编号…
            </div>
          </div>

          {/* SVG 图谱（真实节点配色） */}
          <div className="absolute inset-x-0 top-[38px] bottom-0">
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {scene3Edges.map((e, i) => {
                const a = scene3Nodes.find((n) => n.id === e.a)!;
                const b = scene3Nodes.find((n) => n.id === e.b)!;
                return (
                  <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#cbd5e1" strokeWidth="0.35" opacity="0.8" />
                );
              })}
            </svg>
            {scene3Nodes.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={active ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.5, type: "spring", stiffness: 90, damping: 14 }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: NODE_COLORS_VIS[n.type] }} />
                  <span className={`whitespace-nowrap rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] shadow-sm ${
                    n.type === "experiment" ? "font-medium text-slate-800" : "text-slate-600"
                  }`}>
                    {n.label}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 图例（真实页面底部） */}
          <div className="absolute bottom-2 right-3 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 shadow-sm">
            <div className="grid grid-cols-4 gap-x-3 gap-y-0.5 text-[8px] text-slate-500">
              {([
                ["experiment", "实验"], ["sample", "样品"], ["device", "设备"], ["operator", "操作人"],
                ["reagent", "试剂/原料"], ["method", "方法/协议"], ["project", "项目/课题"],
              ] as const).map(([t, label]) => (
                <span key={t} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: NODE_COLORS_VIS[t] }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <VirtualCursor steps={SCENE3_STEPS} active={active} regionRef={winRef} />
      </BrowserWindow>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════
// Scene 4: 论文辅助 — Paper 真实界面
// 流程：勾选实验卡片 → 生成 Methods → 导出 Word
// ═══════════════════════════════════════════════════

const SCENE4_STEPS: CursorStep[] = [
  { x: 26, y: 38, dur: 1.2, click: true }, // 勾选实验 1
  { x: 26, y: 56, dur: 1.0, click: true }, // 勾选实验 2
  { x: 50, y: 88, dur: 1.3, click: true }, // 点击生成
  { x: 72, y: 45, dur: 1.6 }, // 观察 Methods 输出
  { x: 72, y: 72, dur: 1.2 }, // 移到导出按钮
  { x: 72, y: 72, dur: 0.4, click: true }, // 导出 Word
];

const scene4Cards = [
  { name: "水热合成 Fe3O4 磁性纳米颗粒", date: "2026-08-10", checked: true },
  { name: "XRD 物相表征", date: "2026-08-11", checked: true },
  { name: "VSM 磁性能测试", date: "2026-08-11", checked: false },
  { name: "柠檬酸修饰 Fe3O4", date: "2026-08-12", checked: false },
];

const scene4Methods = `1. 样品制备：将 2.703 g FeCl3·6H2O 与 1.136 g FeCl2·4H2O 溶于 60 mL 去离子水，磁力搅拌 30 min，氮气鼓泡 15 min 除氧。缓慢滴加 4.0 g NaOH（溶于 20 mL 水）至溶液变黑，加入 0.5 g PEG-4000，继续搅拌 15 min。

2. 水热反应：将混合液转移至 100 mL 反应釜，密封后于 200°C 反应 8 h，自然冷却至室温。

3. 产物处理：磁分离收集，去离子水洗涤 3 次、无水乙醇洗涤 2 次，60°C 真空干燥 12 h，N2 气氛下 400°C 退火 2 h。`;

function Scene4({ progress, active }: { progress: MotionValue<number>; active: boolean }) {
  const opacity = useTransform(progress, [0.58, 0.62, 0.77, 0.8], [0, 1, 1, 0]);
  const scale = useTransform(progress, [0.58, 0.62], [0.97, 1]);
  const winRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) { setShown(0); return; }
    const iv = setInterval(() => setShown((s) => Math.min(s + 3, scene4Methods.length)), 90);
    return () => clearInterval(iv);
  }, [active]);

  return (
    <motion.div style={{ opacity, scale }} className="absolute inset-0 flex items-center justify-center px-4">
      <BrowserWindow url="labnote.tech/paper" className="h-[78vh] w-full max-w-5xl">
        <div className="grid h-[calc(78vh-38px)] grid-cols-[42%_58%]">
          {/* 左：实验卡片勾选 */}
          <div className="space-y-2 border-r border-slate-200 p-3">
            <div className="font-semibold text-slate-800">选择实验卡片</div>
            <div className="text-[9px] text-slate-400">勾选 2-4 张卡片，生成论文 Methods 段落</div>
            {scene4Cards.map((c) => (
              <div key={c.name} className={`flex items-center gap-2 rounded-lg border p-2.5 ${c.checked ? "border-blue-300 bg-blue-50/60" : "border-slate-200 bg-white"}`}>
                <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${c.checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>
                  {c.checked ? "✓" : ""}
                </span>
                <div className="flex-1">
                  <div className="text-[10px] font-medium text-slate-800">{c.name}</div>
                  <div className="text-[9px] text-slate-400">{c.date}</div>
                </div>
                <ChevronRight className="h-3 w-3 text-slate-300" />
              </div>
            ))}
            {/* 生成按钮 */}
            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-medium text-white">
              <Sparkles className="h-3 w-3" /> 生成 Methods 初稿
            </div>
          </div>

          {/* 右：Methods 预览 + 导出 */}
          <div className="flex flex-col bg-slate-50/60 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-800">Methods 草稿</span>
              <span className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[9px] text-slate-500">
                <FileText className="h-2.5 w-2.5" /> 导出 Word (.doc)
              </span>
            </div>
            <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white p-3 font-mono text-[10px] leading-relaxed text-slate-700 shadow-sm">
              {scene4Methods.slice(0, shown)}
              {active && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-blue-600 align-middle" />}
            </div>
            <div className="mt-2 flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[9px] text-amber-700">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
              科研规范提示：AI 仅辅助整理实验方法学描述，不替代科研结论。投稿前请核对内容与署名。
            </div>
          </div>
        </div>
        <VirtualCursor steps={SCENE4_STEPS} active={active} regionRef={winRef} />
      </BrowserWindow>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════
// Scene 5: 实验交接 — 资产包真实界面（6 个真实实验包 + bento 悬停）
// ═══════════════════════════════════════════════════

const SCENE5_STEPS: CursorStep[] = [
  { x: 28, y: 42, dur: 1.2 }, // 掠过第一张卡（悬停浮起）
  { x: 50, y: 42, dur: 1.2 },
  { x: 72, y: 42, dur: 1.2 },
  { x: 28, y: 72, dur: 1.2 },
  { x: 50, y: 72, dur: 1.2 },
  { x: 72, y: 72, dur: 1.2 },
  { x: 88, y: 12, dur: 1.3, click: true }, // 点击导出
];

const scene5Assets = [
  { name: "Si 能带结构与弹性性质第一性原理计算", meta: "DFT · Materials Project", files: 4, size: "6.4KB" },
  { name: "SST-2 情感分析（BERT 微调）", meta: "NLP · GLUE 基准", files: 3, size: "48KB" },
  { name: "MNIST 手写数字图像分类实验", meta: "图像分类 · 2000 样本", files: 3, size: "3.6MB" },
  { name: "癌症生存分析", meta: "生存分析 · 1241 例", files: 3, size: "128KB" },
  { name: "分子性质预测（图神经网络）", meta: "GNN · MoleculeNet", files: 3, size: "519KB" },
  { name: "时间序列预测实验", meta: "时序 · UCI ENB2012", files: 2, size: "76KB" },
];

function Scene5({ progress, active }: { progress: MotionValue<number>; active: boolean }) {
  const opacity = useTransform(progress, [0.78, 0.82, 1.0], [0, 1, 1]);
  const scale = useTransform(progress, [0.78, 0.82], [0.97, 1]);
  const winRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div style={{ opacity, scale }} className="absolute inset-0 flex items-center justify-center px-4">
      <BrowserWindow url="labnote.tech/assets" className="h-[78vh] w-full max-w-5xl">
        <div className="flex h-[calc(78vh-38px)] flex-col p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900">实验资产</div>
              <div className="text-[9px] text-slate-400">结构化实验数据资产，可追溯、可导出、可直接用于论文</div>
            </div>
            <div className="flex gap-1.5">
              <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] text-slate-500">
                <FileJson className="h-2.5 w-2.5" /> 导出 JSON
              </span>
              <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] text-slate-500">
                <FileText className="h-2.5 w-2.5" /> 导出 Markdown
              </span>
            </div>
          </div>

          {/* Bento 网格：6 个真实实验包 */}
          <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-2.5">
            {scene5Assets.map((a, i) => (
              <motion.div
                key={a.name}
                initial={{ opacity: 0, y: 14 }}
                animate={active ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.12, type: "spring", stiffness: 90, damping: 15 }}
                whileHover={{ y: -4 }}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm transition-shadow duration-300 hover:shadow-lg"
              >
                {/* 顶部装饰条（按学科着色） */}
                <div
                  className="h-1 w-full"
                  style={{ background: ["#6366f1", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899", "#0ea5e9"][i] }}
                />
                <div className="p-3">
                  {/* 标题（bento 悬停浮起动画） */}
                  <motion.div
                    initial={{ y: 0 }}
                    whileHover={{ y: -3 }}
                    transition={{ type: "spring", stiffness: 200, damping: 18 }}
                    className="text-[11px] font-semibold leading-snug text-slate-800"
                  >
                    {a.name}
                  </motion.div>
                  <div className="mt-1.5 flex items-center gap-1 text-[9px] text-slate-400">
                    <Package className="h-2.5 w-2.5" />
                    {a.meta}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[8px] text-slate-300">
                    <span>{a.files} 个文件</span>
                    <span>{a.size}</span>
                  </div>
                </div>
                {/* 悬停底部渐变（bento 风格） */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-blue-50/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </motion.div>
            ))}
          </div>

          {/* 底栏统计 */}
          <div className="mt-2.5 flex items-center gap-4 border-t border-slate-100 pt-2 text-[9px] text-slate-400">
            <span className="flex items-center gap-1"><Package className="h-2.5 w-2.5" /> 6 个实验包</span>
            <span className="flex items-center gap-1"><FileText className="h-2.5 w-2.5" /> 18 个原始文件</span>
            <span className="ml-auto flex items-center gap-1 text-blue-600">JSON · Markdown 一键导出 <ArrowRight className="h-2.5 w-2.5" /></span>
          </div>
        </div>
        <VirtualCursor steps={SCENE5_STEPS} active={active} regionRef={winRef} />
      </BrowserWindow>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════
// 场景标题
// ═══════════════════════════════════════════════════

function SceneTitle({ progress }: { progress: MotionValue<number> }) {
  const [active, setActive] = useState(0);
  useMotionValueEvent(progress, "change", (v) => {
    setActive(Math.min(4, Math.floor(v * 5)));
  });

  return (
    <div className="absolute left-1/2 top-[4%] z-40 -translate-x-1/2 text-center">
      <motion.div
        key={active}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
      >
        <div className="text-[10px] uppercase tracking-[0.2em] text-blue-400/70">{sceneLabels[active].sub}</div>
        <h2 className="mt-1 text-xl font-bold text-white md:text-2xl">{sceneLabels[active].title}</h2>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════

export function HeroShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // 各场景激活范围（供虚拟光标自动播放）
  const [activeScene, setActiveScene] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActiveScene(Math.min(4, Math.floor(v * 5)));
  });

  // 噪点纹理 SVG data URI
  const noiseTexture = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

  // 鼠标跟随环境光
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const glowX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const glowY = useSpring(mouseY, { stiffness: 60, damping: 20 });
  const glowBg = useMotionTemplate`radial-gradient(circle at ${useTransform(glowX, (v) => `${v * 100}%`)} ${useTransform(glowY, (v) => `${v * 100}%`)}, rgba(59,130,246,0.10), transparent 55%)`;

  return (
    <>
      {/* 顶部渐变过渡：亮色 → 深色 */}
      <div className="h-24 bg-gradient-to-b from-background to-slate-950" />

      {/* Sticky Scroll 主体 */}
      <div ref={containerRef} className="relative" style={{ height: "500vh" }}>
        <div
          className="sticky top-0 h-screen overflow-hidden"
          style={{
            background: "#020617",
            backgroundImage: noiseTexture,
            backgroundBlendMode: "overlay",
          }}
          onMouseMove={(e) => {
            mouseX.set(e.clientX / window.innerWidth);
            mouseY.set(e.clientY / window.innerHeight);
          }}
        >
          {/* 噪点纹理叠加 */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: noiseTexture, backgroundSize: "200px 200px" }}
          />

          {/* 网格背景 */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />

          {/* 鼠标跟随环境光 */}
          <motion.div className="pointer-events-none absolute inset-0" style={{ background: glowBg }} />

          {/* 场景标题 */}
          <SceneTitle progress={scrollYProgress} />

          {/* 进度指示器 */}
          <SceneIndicator progress={scrollYProgress} />

          {/* 5 个场景（真实页面 + 虚拟光标演示） */}
          <Scene1 progress={scrollYProgress} active={activeScene === 0} />
          <Scene2 progress={scrollYProgress} active={activeScene === 1} />
          <Scene3 progress={scrollYProgress} active={activeScene === 2} />
          <Scene4 progress={scrollYProgress} active={activeScene === 3} />
          <Scene5 progress={scrollYProgress} active={activeScene === 4} />

          {/* 滚动提示（仅 Scene 1 时显示） */}
          <ScrollHint progress={scrollYProgress} />
        </div>
      </div>

      {/* 底部渐变过渡：深色 → 亮色 */}
      <div className="h-24 bg-gradient-to-b from-slate-950 to-background" />
    </>
  );
}

function ScrollHint({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0, 0.03, 0.06], [1, 1, 0]);
  return (
    <motion.div style={{ opacity }} className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2 text-center">
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
        className="text-xs text-white/30"
      >
        ↓ 向下滚动探索
      </motion.div>
    </motion.div>
  );
}
