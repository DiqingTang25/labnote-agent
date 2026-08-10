/**
 * 实验工作台：三栏布局
 * 左：数据输入 + 历史 | 中：实验卡片编辑 | 右：复现助手 + RAG 问答
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { z } from "zod";
import {
  Upload, FilePlus2, Save, Download, FileJson, Printer, Trash2,
  Plus, X, CheckCircle2, AlertCircle, Sparkles, Send, ClipboardCopy, ThumbsUp, ThumbsDown,
  Loader2, Package, Clock, FileText, Bot, Target, MapPin, ArrowUpRight,
  FolderOpen, GitBranch, Link2, Unlink,
} from "lucide-react";
import { toast } from "sonner";
import {
  useLab,
  checkCompleteness, generateMethods,
  type ExperimentDoc, type AttachedFile,
} from "../lib/labStore";
import { createBlankDoc } from "../lib/exp-core";
import { mergeProperties, getString } from "../lib/property-utils";
import { DynamicCardEditor } from "../components/fields/DynamicCardEditor";
import { DEFAULT_TEMPLATE } from "../lib/templates/presets";
import {
  ragAnswerReal, ragAnswerRealStream, submitFeedback, fetchExperimentRelations, addExperimentRelation,
  deleteExperimentRelation, suggestRelations,
  RELATION_LABELS, type ExperimentRelation,
} from "../lib/supabase";
import { RequireAuth } from "../lib/auth-guard";
import { useElectron } from "../lib/electron/useElectron";
import { FolderWatcherPanel } from "../lib/electron/FolderWatcherPanel";
import {
  runPipeline,
  detectFileInfo,
  PIPELINE_STAGES,
  classifyFile,
  type PipelineStage,
  type FileProgress,
} from "../lib/multimodal-parser";
import { ExperimentSummary } from "../components/ExperimentSummary";
import { consumePendingUpload } from "../lib/upload-bridge";
import { autoFillExperiment, reparseExperimentFiles } from "../lib/deepseek";
import { extractJSON } from "../lib/json-parser";
import { calibrateExperimentFields, type FieldConfidence } from "../lib/confidence";

const search = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/workbench")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "实验工作台 – LabNote Agent" },
      { name: "description", content: "三栏式实验工作台：数据采集、结构化实验卡片编辑、复现助手与 RAG 知识问答。" },
    ],
  }),
  component: Workbench,
});

function Workbench() {
  const { id } = Route.useSearch();
  const { experiments, addExperiment, updateExperiment, deleteExperiment } = useLab();
  const [activeId, setActiveId] = useState<string | undefined>(id ?? experiments[0]?.id);
  const active = experiments.find((e) => e.id === activeId);

  return (
    <RequireAuth>
    <div className="mx-auto max-w-[1500px] px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">实验工作台</h1>
        <p className="text-sm text-muted-foreground mt-1">采集 · 结构化 · 复现 · 追溯</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-3"><LeftPanel onSelect={setActiveId} activeId={activeId}/></div>
        <div className="lg:col-span-6">
          {active ? (
            <DynamicCardEditor
              key={active.id}
              doc={active}
              onSave={(doc) => { updateExperiment(active.id, doc); toast.success("已保存"); }}
              onDelete={() => {
                deleteExperiment(active.id);
                setActiveId(experiments.find((e) => e.id !== active.id)?.id);
                toast.success("已删除");
              }}
              allExperiments={experiments}
            />
          ) : (
            <EmptyState onCreate={() => {
              const id = createBlank(addExperiment);
              setActiveId(id);
            }}/>
          )}
        </div>
        <div className="lg:col-span-3"><RightPanel experiment={active}/></div>
      </div>
    </div>
    </RequireAuth>
  );
}

function createBlank(add: (e: ExperimentDoc) => void): string {
  const blank = createBlankDoc(DEFAULT_TEMPLATE);
  blank.name = "新建实验";
  add(blank);
  return blank.id;
}

const statusLabels: Record<string, string> = {
  waiting: "等待中",
  reading: "读取中",
  analyzing: "分析中",
  extracting: "提取中",
  complete: "完成",
  error: "错误",
};

/* ---------- 左栏 ---------- */

function LeftPanel({ onSelect, activeId }: { onSelect: (id: string) => void; activeId?: string }) {
  const { experiments, addExperiment } = useLab();
  const fileRef = useRef<HTMLInputElement>(null);

  // 多模态解析流水线状态
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("idle");
  const [pipelineDetail, setPipelineDetail] = useState("");
  const [pipelineCards, setPipelineCards] = useState<ExperimentDoc[]>([]);
  const [lastUploadedFiles, setLastUploadedFiles] = useState<string[]>([]);
  const [fileProgresses, setFileProgresses] = useState<Map<number, FileProgress>>(new Map());
  const [showSummary, setShowSummary] = useState(false);

  // 首页跳转过来的待上传文件
  useEffect(() => {
    const pending = consumePendingUpload();
    if (pending && pending.length > 0) {
      // 构造 FileList-like 对象传给 handleFileUpload
      const fakeList = {
        length: pending.length,
        item: (i: number) => pending[i] ?? null,
        [Symbol.iterator]: function* () { for (const f of pending) yield f; },
      } as unknown as FileList;
      // 延迟一帧确保组件已渲染
      setTimeout(() => handleFileUpload(fakeList), 300);
    }
  }, []);

  // Electron
  const { isElectron: _isElectron, watchStatus, recentFiles, selectFolder, startWatch, stopWatch } = useElectron();

  const handleElectronSelectFolder = async () => {
    const folder = await selectFolder();
    if (folder) await startWatch(folder);
  };

  const handleGenerateCardFromFile = (file: { name: string }) => {
    // 使用真实解析但提示需要完整文件对象
    toast.info(`请在数据输入区上传文件 "${file.name}" 进行 AI 解析`);
  };

  // ===== AI 解析 + 云端存储 — 上传文件 → Storage → API → 实验卡片 =====
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const fileArray = Array.from(files);
    const fileNames = fileArray.map((f) => f.name);

    setLastUploadedFiles(fileNames);
    setPipelineRunning(true);
    setPipelineCards([]);
    setPipelineStage("reading");
    setFileProgresses(new Map());

    try {
      // 1. AI 解析（生成实验卡片，含临时 ID）
      const cards = await runPipeline(
        fileArray,
        (stage, detail) => {
          setPipelineStage(stage);
          setPipelineDetail(detail);
        },
        (index, progress) => {
          setFileProgresses((prev) => new Map(prev).set(index, progress));
        },
        true,
      );

      // 2. 上传原始文件到 Supabase Storage
      const { uploadFileToStorage } = await import("../lib/deepseek");
      const supabase = (await import("../lib/supabase")).supabase;
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (userId) {
        setPipelineStage("merging");
        setPipelineDetail("上传原始文件到云端...");

        for (const card of cards) {
          for (let i = 0; i < fileArray.length; i++) {
            const af = card.attachedFiles.find(
              (f) => f.name === fileArray[i].name && !f.file_url,
            );
            if (!af) continue;

            const result = await uploadFileToStorage(fileArray[i], userId, card.id);
            if (result) {
              af.file_url = result.url;
              af.storage_path = result.path;
            }
          }
        }
      }

      setPipelineCards(cards);
      cards.forEach((card) => addExperiment(card));
      if (cards.length > 0) onSelect(cards[0].id);

      toast.success(`${fileArray.length} 个文件 → ${cards.length} 张实验卡片 (已云端存储)`);
      if (cards.length > 0) setShowSummary(true);
    } catch (e) {
      console.error("[Pipeline] 解析失败", e);
      toast.error("解析过程出错");
    } finally {
      setPipelineRunning(false);
    }
  };

  const pipelineStages = PIPELINE_STAGES;
  const currentStageIdx = pipelineStages.findIndex((s) => s.key === pipelineStage);

  return (
    <div className="space-y-4">

      {/* ===== 解析进度 ===== */}
      {pipelineRunning && (
        <div className="card-soft p-4 border-primary/30 bg-primary-soft/10">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-3">
            <Loader2 className="animate-spin" size={13}/>
            AI 文本解析进行中
          </div>
          <div className="space-y-2">
            {pipelineStages.slice(0, -1).map((s, i) => {
              const isDone = i < currentStageIdx;
              const isActive = s.key === pipelineStage;
              return (
                <div key={s.key} className="flex items-center gap-2 text-[11px]">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                    isDone ? "bg-[color:var(--color-success)] text-white"
                    : isActive ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                  }`}>
                    {isDone ? "✓" : isActive ? "·" : ""}
                  </span>
                  <span className={isDone ? "text-foreground" : isActive ? "text-primary font-medium" : "text-muted-foreground"}>
                    {s.label}
                  </span>
                  {isActive && (
                    <span className="text-[10px] text-primary/70 ml-auto truncate max-w-[120px]">
                      {pipelineDetail}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 逐文件进度 */}
          {fileProgresses.size > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground mb-2">文件进度</p>
              <div className="space-y-1 max-h-[180px] overflow-auto">
                {Array.from(fileProgresses.entries()).map(([i, fp]) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    {fp.status === "complete" ? (
                      <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                    ) : fp.status === "error" ? (
                      <AlertCircle size={12} className="text-red-500 shrink-0" />
                    ) : fp.status === "analyzing" ? (
                      <Loader2 size={12} className="animate-spin text-primary shrink-0" />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-muted-foreground/30 shrink-0" />
                    )}
                    <span className="truncate flex-1 text-[11px]">{fp.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {fp.status === "error" ? fp.error : statusLabels[fp.status] ?? fp.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 解析结果 ===== */}
      {pipelineCards.length > 0 && !pipelineRunning && (
        <div className="card-soft p-3 bg-[color:var(--color-success)]/5 border-[color:var(--color-success)]/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--color-success)]">
            <CheckCircle2 size={14}/>
            解析完成 · {pipelineCards.length} 张实验卡片
          </div>
        </div>
      )}

      {/* 文件夹监听 */}
      <FolderWatcherPanel
        isElectron={_isElectron}
        watching={watchStatus.watching}
        folderPath={watchStatus.folderPath}
        recentFiles={recentFiles}
        onSelectFolder={handleElectronSelectFolder}
        onStopWatch={stopWatch}
        onGenerateCard={handleGenerateCardFromFile}
      />

      {/* 上传区域 */}
      <div className="card-soft p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Upload size={15}/>数据输入</h3>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
          onClick={() => !pipelineRunning && fileRef.current?.click()}
          className={`mt-3 cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition ${
            pipelineRunning
              ? "border-primary/40 bg-primary-soft/20"
              : "border-border bg-secondary/40 hover:border-primary/50 hover:bg-primary-soft/40"
          }`}
        >
          {pipelineRunning ? (
            <div className="text-left">
              <div className="flex items-center gap-2 text-primary text-xs font-semibold mb-2">
                <Loader2 className="animate-spin" size={14}/> AI 解析流水线
              </div>
              <ul className="space-y-1.5">
                {pipelineStages.slice(0, -1).map((s, i) => {
                  const isDone = i < currentStageIdx;
                  const isActive = s.key === pipelineStage;
                  return (
                    <li key={s.key} className="flex items-center gap-2 text-[11px]">
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                        isDone ? "bg-[color:var(--color-success)] text-white"
                        : isActive ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                      }`}>
                        {isDone ? "✓" : isActive ? "·" : ""}
                      </span>
                      <span className={isDone ? "text-foreground" : isActive ? "text-primary font-medium" : "text-muted-foreground"}>
                        {s.label}
                      </span>
                      {isActive && (
                        <span className="flex-1 ml-1 h-1 rounded-full bg-primary/15 overflow-hidden">
                          <span className="block h-full w-1/2 bg-primary animate-[slide_0.9s_ease-in-out_infinite]"/>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <style>{`@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
            </div>
          ) : (
            <>
              <Upload size={18} className="mx-auto text-muted-foreground"/>
              <p className="mt-2 text-xs text-muted-foreground">拖拽文件到此处或点击上传</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                支持 MD · TXT · CSV · PDF · DOCX · XLSX · PNG · JPG · JSON · LOG
              </p>
            </>
          )}
          <input
            ref={fileRef} type="file" multiple hidden
            accept=".pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png,.txt,.md,.log,.json,.xml"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>
        <button
          onClick={() => { const id = createBlank(addExperiment); onSelect(id); }}
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground hover:bg-primary/90 transition"
        >
          <FilePlus2 size={14}/> 新建实验
        </button>
      </div>

      {/* 历史 */}
      <div className="card-soft p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Clock size={15}/>历史实验</h3>
        <ul className="mt-3 space-y-1 max-h-[480px] overflow-auto pr-1">
          {experiments.slice(0, 10).map((e) => (
            <li key={e.id}>
              <button
                onClick={() => onSelect(e.id)}
                className={`w-full text-left rounded-lg p-2.5 text-xs transition ${
                  activeId === e.id ? "bg-primary-soft text-primary" : "hover:bg-secondary"
                }`}
              >
                <div className="font-medium truncate">{e.name}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{e.date} · {getString(e.properties, "source")}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 实验总结 */}
      {showSummary && pipelineCards.length > 0 && (
        <ExperimentSummary
          experiments={pipelineCards}
          fileCount={lastUploadedFiles.length}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  );
}


const inputCls = "w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50";
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="card-soft p-12 text-center">
      <FilePlus2 size={28} className="mx-auto text-muted-foreground"/>
      <p className="mt-3 text-sm text-muted-foreground">还没有打开任何实验卡片</p>
      <button onClick={onCreate} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
        <Plus size={14}/> 新建实验
      </button>
    </div>
  );
}

/* ---------- 右栏：复现助手 + RAG ---------- */
function RightPanel({ experiment }: { experiment?: ExperimentDoc }) {
  if (!experiment) return <div className="card-soft p-6 text-sm text-muted-foreground text-center">选择实验卡片以查看复现助手</div>;
  return (
    <div className="space-y-4">
      <AiAnalysis experiment={experiment}/>
      <ReproAssistant experiment={experiment}/>
      <RagPanel/>
    </div>
  );
}

type EvalResult = {
  overallConfidence: number;
  fromLogprobs: boolean;
  fields: FieldConfidence[];
  summary?: string;
};

function AiAnalysis({ experiment }: { experiment: ExperimentDoc }) {
  const { updateExperiment } = useLab();
  const missing = useMemo(() => checkCompleteness(experiment), [experiment]);
  const [autoFilling, setAutoFilling] = useState(false);
  const [reparsing, setReparsing] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState("");

  // 实验切换时重新评估（带 logprobs 校准）
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setEvalLoading(true);
      setEvalError("");
      try {
        // 收集关联文件的文本内容作为校验依据
        const sourceFiles = experiment.attachedFiles
          .filter((f) => f.textContent)
          .map((f) => ({ name: f.name, textContent: f.textContent! }));

        const calibrated = await calibrateExperimentFields(
          {
            name: experiment.name,
            date: experiment.date,
            operator: experiment.operator,
            experimentType: experiment.experimentType,
            properties: experiment.properties,
          },
          sourceFiles.length > 0 ? sourceFiles : undefined,
        );

        if (!cancelled) {
          // 从 calibrateExperimentFields 的返回中提取 summary
          const rawSummary = (calibrated.data as Record<string, unknown>)?.summary;
          setEvalResult({
            overallConfidence: calibrated.overallConfidence,
            fromLogprobs: calibrated.fromLogprobs,
            fields: calibrated.fields,
            summary: typeof rawSummary === "string" ? rawSummary : undefined,
          });
        }
      } catch (err) {
        if (!cancelled) setEvalError(err instanceof Error ? err.message : "评估失败");
      } finally {
        if (!cancelled) setEvalLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [experiment.id]);

  // 置信度：优先 logprobs 校准，否则回退到公式
  const overallConfidence = evalResult?.overallConfidence ?? Math.max(60, 100 - missing.length * 2);
  const filledCount = evalResult?.fields.filter((f) => f.confidence > 0).length ?? (28 - missing.length);

  // 按置信度分组
  const highFields = evalResult?.fields.filter((f) => f.confidence >= 80) ?? [];
  const midFields = evalResult?.fields.filter((f) => f.confidence >= 50 && f.confidence < 80) ?? [];
  const lowFields = evalResult?.fields.filter((f) => f.confidence > 0 && f.confidence < 50) ?? [];

  const autoFill = async () => {
    setAutoFilling(true);
    try {
      const raw = await autoFillExperiment({
        name: experiment.name,
        experimentType: experiment.experimentType,
        date: experiment.date,
        operator: experiment.operator,
        properties: experiment.properties,
      });
      const data = extractJSON<Record<string, unknown>>(raw);
      if (!data || typeof data !== "object") { toast.error("AI 返回格式异常，请重试"); return; }

      const { name, experimentType, date, operator, aiInsights, knowledgeTags, properties, ...propertyPatch } = data;
      const nextProperties = mergeProperties(
        experiment.properties,
        (properties && typeof properties === "object" && !Array.isArray(properties) ? properties : propertyPatch) as ExperimentDoc["properties"],
      );
      updateExperiment(experiment.id, {
        ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
        ...(typeof experimentType === "string" && experimentType.trim() ? { experimentType: experimentType.trim() } : {}),
        ...(typeof date === "string" && date.trim() ? { date: date.trim() } : {}),
        ...(typeof operator === "string" && operator.trim() ? { operator: operator.trim() } : {}),
        ...(typeof aiInsights === "string" && aiInsights.trim() ? { aiInsights: aiInsights.trim() } : {}),
        ...(Array.isArray(knowledgeTags) ? { knowledgeTags: knowledgeTags.filter((tag): tag is string => typeof tag === "string") } : {}),
        properties: nextProperties,
      });
      toast.success("AI 已补全缺失字段，请人工复核");
      setEvalResult(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "补全失败");
    } finally {
      setAutoFilling(false);
    }
  };

  const reparse = async () => {
    const filesWithContent = experiment.attachedFiles
      .filter((file) => file.textContent)
      .map((file) => ({ name: file.name, textContent: file.textContent! }));
    if (filesWithContent.length === 0) { toast.info("没有可解析的文件内容。请重新上传文件以触发文本提取。"); return; }

    setReparsing(true);
    try {
      const raw = await reparseExperimentFiles({
        name: experiment.name,
        experimentType: experiment.experimentType,
        date: experiment.date,
        operator: experiment.operator,
        properties: experiment.properties,
      }, filesWithContent);
      const data = extractJSON<Record<string, unknown>>(raw);
      if (!data || typeof data !== "object") { toast.error("AI 返回格式异常，请重试"); return; }

      const { name, experimentType, date, operator, aiInsights, knowledgeTags, properties, ...propertyPatch } = data;
      updateExperiment(experiment.id, {
        ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
        ...(typeof experimentType === "string" && experimentType.trim() ? { experimentType: experimentType.trim() } : {}),
        ...(typeof date === "string" && date.trim() ? { date: date.trim() } : {}),
        ...(typeof operator === "string" && operator.trim() ? { operator: operator.trim() } : {}),
        ...(typeof aiInsights === "string" && aiInsights.trim() ? { aiInsights: aiInsights.trim() } : {}),
        ...(Array.isArray(knowledgeTags) ? { knowledgeTags: knowledgeTags.filter((tag): tag is string => typeof tag === "string") } : {}),
        properties: mergeProperties(
          experiment.properties,
          (properties && typeof properties === "object" && !Array.isArray(properties) ? properties : propertyPatch) as ExperimentDoc["properties"],
        ),
      });
      toast.success("已重新解析，请核对变更");
      setEvalResult(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "重新解析失败");
    } finally {
      setReparsing(false);
    }
  };

  return (
    <div className="card-soft p-4 border-primary/30 bg-primary-soft/20">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Bot size={15} className="text-primary"/>AI 置信度评估
        {evalResult?.fromLogprobs && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[color:var(--color-success)]/10 text-[color:var(--color-success)] font-normal">
            token-level
          </span>
        )}
      </h3>

      {evalLoading && !evalResult ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={13} className="animate-spin"/>正在逐字段校准...
        </div>
      ) : (
        <>
          {/* 整体置信度 + 分布 */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/70 p-2">
              <div className="text-[10px] text-muted-foreground">综合置信度</div>
              <div className={`text-base font-bold tabular-nums mt-0.5 ${
                overallConfidence >= 80 ? "text-[color:var(--color-success)]"
                : overallConfidence >= 50 ? "text-[color:var(--color-warning)]"
                : "text-destructive"
              }`}>{overallConfidence}%</div>
            </div>
            <div className="rounded-lg bg-white/70 p-2">
              <div className="text-[10px] text-muted-foreground">高置信字段</div>
              <div className="text-base font-bold tabular-nums mt-0.5 text-[color:var(--color-success)]">{highFields.length}</div>
            </div>
            <div className="rounded-lg bg-white/70 p-2">
              <div className="text-[10px] text-muted-foreground">需核对字段</div>
              <div className={`text-base font-bold tabular-nums mt-0.5 ${lowFields.length > 0 ? "text-destructive" : "text-muted-foreground"}`}>{lowFields.length}</div>
            </div>
          </div>

          {/* 置信度分布条 */}
          {evalResult && (
            <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden flex">
              <div className="h-full bg-[color:var(--color-success)] transition-all duration-700"
                style={{ width: `${(highFields.length / Math.max(evalResult.fields.length, 1)) * 100}%` }}/>
              <div className="h-full bg-[color:var(--color-warning)] transition-all duration-700"
                style={{ width: `${(midFields.length / Math.max(evalResult.fields.length, 1)) * 100}%` }}/>
              <div className="h-full bg-destructive transition-all duration-700"
                style={{ width: `${(lowFields.length / Math.max(evalResult.fields.length, 1)) * 100}%` }}/>
            </div>
          )}

          {/* 摘要 */}
          {evalResult?.summary && (
            <div className="mt-2 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-[11px] text-muted-foreground leading-relaxed">
              {evalResult.summary}
            </div>
          )}
        </>
      )}

      {/* 低置信字段速览 */}
      {lowFields.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold mb-1.5 text-muted-foreground flex items-center gap-1">
            <AlertCircle size={11} className="text-destructive"/>需人工核对
          </div>
          <div className="space-y-1 max-h-[120px] overflow-auto">
            {lowFields.slice(0, 5).map((f) => (
              <div key={f.path} className="flex items-center gap-2 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0"/>
                <span className="text-muted-foreground truncate">{f.path}</span>
                <span className="text-destructive font-medium ml-auto shrink-0">{f.confidence}%</span>
              </div>
            ))}
            {lowFields.length > 5 && (
              <div className="text-[10px] text-muted-foreground pl-4">...等 {lowFields.length} 个字段</div>
            )}
          </div>
        </div>
      )}

      {evalError && (
        <div className="mt-2 text-[10px] text-muted-foreground">{evalError}</div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={autoFill} disabled={autoFilling}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1 disabled:opacity-60">
          {autoFilling ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
          一键补全
        </button>
        <button onClick={reparse} disabled={reparsing}
          className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-primary/40 flex items-center justify-center gap-1 disabled:opacity-60">
          {reparsing ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
          重新解析
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-white/70 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-base font-bold tabular-nums mt-0.5 ${accent ? "text-primary" : warn ? "text-[color:var(--color-warning)]" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function ReproAssistant({ experiment }: { experiment: ExperimentDoc }) {
  const missing = useMemo(() => checkCompleteness(experiment), [experiment]);
  const methods = useMemo(() => generateMethods(experiment), [experiment]);
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const checklist = [
    ...missing.map((m) => `补充：${m}`),
    "记录至少 3 次重复实验结果",
    "保存原始仪器数据文件",
    "记录环境异常与中断事件",
    "核对所有单位与符号规范",
  ];

  const exportPack = () => {
    const content = `# 复现包：${experiment.name}\n\n## 实验卡片\n${"```json\n" + JSON.stringify(experiment, null, 2) + "\n```"}\n\n## Methods 草稿\n${methods}\n`;
    download(`${experiment.name}-复现包.md`, content, "text/markdown");
    toast.success("已导出复现包（含卡片 JSON + Methods）");
  };

  const copyMethods = () => {
    navigator.clipboard.writeText(methods);
    toast.success("Methods 已复制到剪贴板");
  };

  return (
    <div className="card-soft p-4">
      <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles size={15} className="text-primary"/>复现助手</h3>

      {/* 完整性 */}
      <div className="mt-3">
        <div className="flex items-center gap-2 text-xs">
          {missing.length === 0 ? (
            <><CheckCircle2 size={14} className="text-[color:var(--color-success)]"/><span className="text-[color:var(--color-success)]">完整性检查通过</span></>
          ) : (
            <><AlertCircle size={14} className="text-[color:var(--color-warning)]"/>
              <span>检测到 <b>{missing.length}</b> 项缺失字段</span></>
          )}
        </div>
        {missing.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {missing.slice(0, 6).map((m) => (
              <li key={m} className="flex gap-1.5 items-start"><span className="text-[color:var(--color-warning)] mt-0.5">●</span>{m}</li>
            ))}
            {missing.length > 6 && <li className="text-[10px]">…等共 {missing.length} 项</li>}
          </ul>
        )}
      </div>

      {/* 复现清单 */}
      <div className="mt-4">
        <h4 className="text-xs font-semibold mb-2">复现实验检查清单</h4>
        <ul className="space-y-1.5 max-h-40 overflow-auto pr-1">
          {checklist.map((c) => (
            <li key={c}>
              <label className="flex items-start gap-2 text-xs cursor-pointer hover:bg-secondary rounded p-1">
                <input type="checkbox" checked={!!checks[c]} onChange={(e) => setChecks({ ...checks, [c]: e.target.checked })}
                  className="mt-0.5 accent-[color:var(--color-primary)]"/>
                <span className={checks[c] ? "line-through text-muted-foreground" : ""}>{c}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Methods */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="text-xs font-semibold">论文 Methods 草稿</h4>
          <button onClick={copyMethods} className="text-[11px] text-primary hover:underline flex items-center gap-1"><ClipboardCopy size={11}/>复制</button>
        </div>
        <div className="rounded-lg bg-secondary/60 p-2.5 text-xs leading-relaxed max-h-40 overflow-auto">{methods}</div>
      </div>

      <button onClick={exportPack} className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground hover:bg-primary/90">
        <Download size={13}/> 导出复现包
      </button>
    </div>
  );
}
type Source ={ doc: string; page: string; confidence: string; link: string; chunkType?: string; snippet?: string };

function RagPanel() {
  const { experiments } = useLab();
  const navigate = useNavigate();
  const [chat, setChat] = useState<{ role: "user" | "agent"; text: string; sources?: Source[] }[]>([
    { role: "agent", text: "你好，我是 LabNote Agent。已加载 " + experiments.length + " 条实验记录，可基于知识库问答与追溯。", sources: [] },
  ]);
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Record<number, "up" | "down" | null>>({});

  const send = async (text?: string) => {
    const t = (text ?? q).trim();
    if (!t || loading) return;
    setChat((c) => [...c, { role: "user", text: t }]);
    setQ("");
    setLoading(true);

    // 构建对话历史（最近 3 轮 = 6 条消息）
    const history = chat
      .slice(-6)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.text,
      }));

    // 插入占位 entry，逐 token 更新（流式优先，失败降级）
    setChat((c) => [...c, { role: "agent", text: "", sources: [] }]);

    try {
      const response = await ragAnswerRealStream(t, undefined, history);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const answerParts: string[] = [];
      let sources: Source[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr);
            switch (event.type) {
              case "sources":
                sources = event.sources as Source[];
                break;
              case "token":
                answerParts.push(event.content);
                setChat((c) => {
                  const updated = [...c];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], text: answerParts.join(""), sources };
                  return updated;
                });
                break;
              case "error":
                throw new Error(event.message || "Stream error");
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Stream error") throw e;
          }
        }
      }

      // 确保最终状态
      setChat((c) => {
        const updated = [...c];
        updated[updated.length - 1] = { ...updated[updated.length - 1], text: answerParts.join("") || updated[updated.length - 1].text, sources };
        return updated;
      });
    } catch (err) {
      console.warn("[RAG] 流式失败，降级到非流式:", err);
      setChat((c) => c.slice(0, -1)); // 移除占位 entry
      try {
        const { answer, sources } = await ragAnswerReal(t, undefined, history);
        setChat((c) => [...c, { role: "agent", text: answer, sources }]);
      } catch {
        setChat((c) => [...c, {
          role: "agent",
          text: "抱歉，RAG 检索暂时不可用。请稍后重试或直接在实验卡片中搜索。",
          sources: [],
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ["上次使用样品 Fe-2309 的退火温度是多少？", "哪几次实验出现电流异常？", "知识库涉及哪些设备？"];

  return (
    <div className="card-soft p-4">
      <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles size={15} className="text-primary"/>知识问答 (RAG)</h3>
      <div className="mt-3 max-h-72 overflow-auto space-y-2 pr-1">
        {chat.map((m, i) => (
          <div key={i}>
            <div className={`text-xs rounded-lg p-2 ${m.role === "user" ? "bg-primary-soft text-primary ml-6" : "bg-secondary mr-6"}`}>{m.text}</div>
            {m.role === "agent" && m.sources && m.sources.length > 0 && (
              <div className="mt-1 mr-6 rounded-lg border border-border bg-card p-2">
                <div className="text-[10px] text-muted-foreground font-semibold mb-1.5 flex items-center gap-1"><FileText size={10}/>来源文档</div>
                <ul className="space-y-1.5">
                  {m.sources.map((s, idx) => (
                    <li key={idx} className="text-[11px] py-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin size={10}/>{s.page}</span>
                          <span className="truncate text-foreground">{s.doc}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-1 text-[color:var(--color-success)]"><Target size={10}/>{s.confidence}</span>
                          <button onClick={() => navigate({ to: s.link })}
                            className="inline-flex items-center gap-0.5 text-primary hover:underline">
                            <ArrowUpRight size={10}/>查看卡片
                          </button>
                        </div>
                      </div>
                      {s.snippet && (
                        <div className="mt-0.5 pl-5 text-[9px] text-muted-foreground truncate">{s.snippet.slice(0, 100)}</div>
                      )}
                    </li>
                  ))}
                </ul>
                {/* 反馈按钮 */}
                <div className="flex items-center gap-1 mt-1.5 justify-end">
                  {feedback[i] === "up" ? (
                    <span className="text-[10px] text-[color:var(--color-success)] flex items-center gap-0.5"><ThumbsUp size={10}/> 有用</span>
                  ) : feedback[i] === "down" ? (
                    <span className="text-[10px] text-muted-foreground">已反馈</span>
                  ) : (
                    <>
                      <button onClick={() => { setFeedback({ ...feedback, [i]: "up" }); submitFeedback({ question: chat[i - 1]?.text ?? "", answer: m.text, sources: m.sources ?? [], rating: "up" }); }} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-[color:var(--color-success)]"><ThumbsUp size={11}/></button>
                      <button onClick={() => { setFeedback({ ...feedback, [i]: "down" }); submitFeedback({ question: chat[i - 1]?.text ?? "", answer: m.text, sources: m.sources ?? [], rating: "down" }); }} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-destructive"><ThumbsDown size={11}/></button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {suggestions.map((s) => (
          <button key={s} onClick={() => send(s)} className="text-[10px] rounded-md border border-border px-1.5 py-0.5 hover:border-primary/40 hover:bg-primary-soft">{s}</button>
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="向知识库提问…" disabled={loading} className={inputCls + " text-xs disabled:opacity-50"}/>
        <button onClick={() => send()} disabled={loading}
          className="rounded-lg bg-primary text-primary-foreground px-2.5 hover:bg-primary/90 disabled:opacity-60">
          {loading ? <Loader2 size={13} className="animate-spin"/> : <Send size={13}/>}
        </button>
      </div>
    </div>
  );
}

/* ---------- 工具：导出 ---------- */
function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(e: ExperimentDoc): string {
  return generateMethods(e);
}
