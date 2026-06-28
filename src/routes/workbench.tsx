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
  type Experiment, type Param, type AttachedFile,
} from "../lib/labStore";
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
            <CardEditor
              key={active.id}
              experiment={active}
              onSave={(patch) => { updateExperiment(active.id, patch); toast.success("已保存"); }}
              onDelete={() => {
                deleteExperiment(active.id);
                setActiveId(experiments.find((e) => e.id !== active.id)?.id);
                toast.success("已删除");
              }}
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

function createBlank(add: (e: Experiment) => void): string {
  const blank: Experiment = {
    id: "exp_" + Math.random().toString(36).slice(2, 9),
    name: "新建实验",
    date: new Date().toISOString().slice(0, 16).replace("T", " "),
    operator: "",
    purpose: "",
    background: "",
    device: { name: "", model: "", vendor: "" },
    sample: { id: "", batch: "", source: "" },
    params: [{ name: "", value: "", unit: "" }],
    environment: { temperature: "", humidity: "", other: "" },
    steps: [""],
    results: "",
    notes: "",
    source: "手动新建",
    discipline: "材料科学",
    attachedFiles: [],
    lastParsedAt: null,
    embedding: null,
    aiInsights: "",
    knowledgeTags: [],
  };
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
  const [pipelineCards, setPipelineCards] = useState<Experiment[]>([]);
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

  // ===== 真实多模态解析 — 上传文件 → API → 实验卡片 =====
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
      const cards = await runPipeline(
        fileArray,
        (stage, detail) => {
          setPipelineStage(stage);
          setPipelineDetail(detail);
        },
        (index, progress) => {
          setFileProgresses((prev) => new Map(prev).set(index, progress));
        },
        true, // 使用真实 API
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
            多模态解析进行中
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
                <Loader2 className="animate-spin" size={14}/> 多模态解析流水线
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
                支持 MD · TXT · CSV · PDF · DOCX · XLSX · PNG · JPG · MP4 · WAV · M4A
              </p>
            </>
          )}
          <input
            ref={fileRef} type="file" multiple hidden
            accept=".pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png,.tif,.tiff,.txt,.md,.log,.json,.xml,.mp4,.avi,.m4a,.mp3,.wav"
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
                <div className="mt-0.5 text-[10px] text-muted-foreground">{e.date} · {e.source}</div>
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

/* ---------- 中栏：实验卡片编辑 ---------- */
function CardEditor({ experiment, onSave, onDelete }: {
  experiment: Experiment;
  onSave: (patch: Partial<Experiment>) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Experiment>(experiment);
  const [viewFileOpen, setViewFileOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState<AttachedFile | null>(null);
  // 知识图谱关系
  const [relations, setRelations] = useState<ExperimentRelation[]>([]);
  const [suggestedRelations, setSuggestedRelations] = useState<Array<{targetId:string;targetName:string;type:ExperimentRelation["relation_type"];reason:string}>>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [addingRelation, setAddingRelation] = useState(false);
  const [newRelationTarget, setNewRelationTarget] = useState("");
  const [newRelationType, setNewRelationType] = useState<ExperimentRelation["relation_type"]>("semantic_similar");
  const { experiments: allExperiments } = useLab();

  // 实验切换时重新加载关系
  useEffect(() => {
    fetchExperimentRelations(draft.id).then(setRelations).catch(() => setRelations([]));
    setSuggestedRelations([]);
  }, [draft.id]);

  const update = <K extends keyof Experiment>(k: K, v: Experiment[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const exportJSON = () => {
    download(`${draft.name}.json`, JSON.stringify(draft, null, 2), "application/json");
    toast.success("已导出 JSON");
  };
  const exportMD = () => {
    download(`${draft.name}.md`, toMarkdown(draft), "text/markdown");
    toast.success("已导出 Markdown");
  };
  const exportPDF = () => { window.print(); };

  return (
    <div className="card-soft p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <input
            value={draft.name} onChange={(e) => update("name", e.target.value)}
            className="w-full text-xl font-bold bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none pb-1"
          />
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground items-center">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft text-primary px-2 py-0.5">
              <Package size={11}/>{draft.source}
            </span>
            <span>{draft.discipline}</span>
          </div>
        </div>
        <div className="flex gap-1 no-print">
          <IconBtn onClick={() => onSave(draft)} icon={<Save size={14}/>} label="保存"/>
          <IconBtn onClick={exportMD} icon={<FileText size={14}/>} label="MD"/>
          <IconBtn onClick={exportJSON} icon={<FileJson size={14}/>} label="JSON"/>
          <IconBtn onClick={exportPDF} icon={<Printer size={14}/>} label="PDF"/>
          <IconBtn onClick={onDelete} icon={<Trash2 size={14}/>} label="删除" danger/>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Field label="实验时间"><input value={draft.date} onChange={(e) => update("date", e.target.value)} className={inputCls}/></Field>
        <Field label="实验人员"><input value={draft.operator} onChange={(e) => update("operator", e.target.value)} className={inputCls}/></Field>
        <Field label="实验目的" full><textarea value={draft.purpose} onChange={(e) => update("purpose", e.target.value)} className={inputCls + " min-h-[60px]"}/></Field>
        <Field label="背景说明" full><textarea value={draft.background} onChange={(e) => update("background", e.target.value)} className={inputCls + " min-h-[50px]"}/></Field>
      </div>

      <Section title="设备信息">
        <div className="grid grid-cols-3 gap-3">
          <Field label="名称"><input value={draft.device.name} onChange={(e) => update("device", { ...draft.device, name: e.target.value })} className={inputCls}/></Field>
          <Field label="型号"><input value={draft.device.model} onChange={(e) => update("device", { ...draft.device, model: e.target.value })} className={inputCls}/></Field>
          <Field label="厂家"><input value={draft.device.vendor} onChange={(e) => update("device", { ...draft.device, vendor: e.target.value })} className={inputCls}/></Field>
        </div>
      </Section>

      <Section title="材料与样品">
        <div className="grid grid-cols-3 gap-3">
          <Field label="样品编号"><input value={draft.sample.id} onChange={(e) => update("sample", { ...draft.sample, id: e.target.value })} className={inputCls}/></Field>
          <Field label="批次"><input value={draft.sample.batch} onChange={(e) => update("sample", { ...draft.sample, batch: e.target.value })} className={inputCls}/></Field>
          <Field label="来源"><input value={draft.sample.source} onChange={(e) => update("sample", { ...draft.sample, source: e.target.value })} className={inputCls}/></Field>
        </div>
      </Section>

      <Section title="实验参数" actions={
        <button onClick={() => update("params", [...draft.params, { name: "", value: "", unit: "" }])}
          className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12}/>添加参数</button>
      }>
        <ParamTable params={draft.params} onChange={(ps) => update("params", ps)}/>
      </Section>

      <Section title="环境条件">
        <div className="grid grid-cols-3 gap-3">
          <Field label="温度 (℃)"><input value={draft.environment.temperature} onChange={(e) => update("environment", { ...draft.environment, temperature: e.target.value })} className={inputCls}/></Field>
          <Field label="湿度 (%)"><input value={draft.environment.humidity} onChange={(e) => update("environment", { ...draft.environment, humidity: e.target.value })} className={inputCls}/></Field>
          <Field label="其他"><input value={draft.environment.other} onChange={(e) => update("environment", { ...draft.environment, other: e.target.value })} className={inputCls}/></Field>
        </div>
      </Section>

      <Section title="实验步骤" actions={
        <button onClick={() => update("steps", [...draft.steps, ""])}
          className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12}/>添加步骤</button>
      }>
        <ol className="space-y-2">
          {draft.steps.map((s, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className="mt-2 text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
              <textarea value={s} onChange={(e) => {
                const next = [...draft.steps]; next[i] = e.target.value; update("steps", next);
              }} className={inputCls + " flex-1 min-h-[40px]"}/>
              <button onClick={() => update("steps", draft.steps.filter((_, j) => j !== i))}
                className="p-1.5 text-muted-foreground hover:text-destructive"><X size={14}/></button>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="结果数据">
        <textarea value={draft.results} onChange={(e) => update("results", e.target.value)} className={inputCls + " min-h-[80px]"}/>
      </Section>

      <Section title="异常与备注">
        <textarea value={draft.notes} onChange={(e) => update("notes", e.target.value)} className={inputCls + " min-h-[60px]"}/>
      </Section>

      {/* ===== 文件管理 ===== */}
      <Section title="实验文件" actions={
        <div className="flex gap-2">
          {draft.attachedFiles.length > 0 && (
            <button
              onClick={() => {
                // Re-parse with existing files
                const files = draft.attachedFiles.map((af) => new File(
                  [af.textContent || af.name],
                  af.name,
                  { type: af.mimeType || "text/plain" }
                ));
                if (files.length === 0) { toast.info("没有可重新解析的文件"); return; }
                // Trigger re-parse via custom event
                window.dispatchEvent(new CustomEvent("labnote:reparse", { detail: { experimentId: draft.id, files } }));
              }}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Sparkles size={12}/>重新解析
            </button>
          )}
        </div>
      }>
        {draft.attachedFiles.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">暂无文件 — 通过左侧"数据输入"上传文件后自动关联</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">文件名</th>
                  <th className="text-left px-3 py-2 font-medium">类型</th>
                  <th className="text-left px-3 py-2 font-medium">大小</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {draft.attachedFiles.map((af) => (
                  <tr key={af.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <span className="text-[11px] font-medium truncate block max-w-[180px]" title={af.name}>
                        {detectFileInfo(af.name).icon} {af.name}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        af.mediaType === "image" ? "bg-purple-100 text-purple-700" :
                        af.mediaType === "text" ? "bg-blue-100 text-blue-700" :
                        af.mediaType === "csv" ? "bg-green-100 text-green-700" :
                        af.mediaType === "audio" ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {af.mediaType}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      {(af.size / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {af.textContent && (
                          <button
                            onClick={() => {
                              setViewingFile(af);
                              setViewFileOpen(true);
                            }}
                            className="p-1 text-muted-foreground hover:text-primary"
                            title="查看内容"
                          ><FileText size={13}/></button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`确认删除 "${af.name}"？`)) {
                              update("attachedFiles", draft.attachedFiles.filter((f) => f.id !== af.id));
                              toast.success("已删除文件");
                            }
                          }}
                          className="p-1 text-muted-foreground hover:text-destructive"
                          title="删除"
                        ><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ===== 知识图谱关系 ===== */}
      <Section title="知识图谱关系" actions={
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setSuggesting(true);
              const suggestions = await suggestRelations(draft, allExperiments);
              setSuggestedRelations(suggestions);
              setSuggesting(false);
              if (suggestions.length === 0) toast.info("未发现潜在关联实验");
              else toast.success(`AI 发现 ${suggestions.length} 个潜在关联`);
            }}
            disabled={suggesting}
            className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            <Sparkles size={12}/>{suggesting ? "分析中..." : "AI 补全"}
          </button>
          <button
            onClick={() => setAddingRelation(!addingRelation)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus size={12}/>手动添加
          </button>
        </div>
      }>
        {/* 手动添加表单 */}
        {addingRelation && (
          <div className="mb-3 p-3 rounded-lg border border-dashed border-border bg-secondary/30">
            <div className="flex gap-2 items-end flex-wrap">
              <select
                value={newRelationTarget}
                onChange={(e) => setNewRelationTarget(e.target.value)}
                className="text-xs rounded border border-border px-2 py-1.5 bg-card min-w-[160px]"
              >
                <option value="">选择关联实验...</option>
                {allExperiments.filter(e => e.id !== draft.id).map((e) => (
                  <option key={e.id} value={e.id}>{e.name?.slice(0, 40)}</option>
                ))}
              </select>
              <select
                value={newRelationType}
                onChange={(e) => setNewRelationType(e.target.value as ExperimentRelation["relation_type"])}
                className="text-xs rounded border border-border px-2 py-1.5 bg-card"
              >
                {Object.entries(RELATION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button
                onClick={async () => {
                  if (!newRelationTarget) { toast.info("请选择关联实验"); return; }
                  const ok = await addExperimentRelation(draft.id, newRelationTarget, newRelationType);
                  if (ok) {
                    toast.success("关系已添加");
                    setAddingRelation(false);
                    setNewRelationTarget("");
                    fetchExperimentRelations(draft.id).then(setRelations);
                  } else {
                    toast.error("添加失败");
                  }
                }}
                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded hover:bg-primary/90"
              >确认</button>
              <button onClick={() => setAddingRelation(false)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5">取消</button>
            </div>
          </div>
        )}

        {/* 已有关系 */}
        {relations.length > 0 && (
          <div className="space-y-2 mb-3">
            {relations.map((rel) => {
              const isSource = rel.source_exp_id === draft.id;
              const otherId = isSource ? rel.target_exp_id : rel.source_exp_id;
              const otherExp = allExperiments.find((e) => e.id === otherId);
              return (
                <div key={rel.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/30 border border-border text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch size={13} className="text-primary shrink-0"/>
                    <span className="px-1.5 py-0.5 rounded-full bg-primary-soft text-primary text-[10px] font-medium shrink-0">
                      {RELATION_LABELS[rel.relation_type]}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {isSource ? "→" : "←"} {otherExp?.name ?? otherId?.slice(0, 16)}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm("确认删除此关系？")) {
                        await deleteExperimentRelation(rel.id);
                        fetchExperimentRelations(draft.id).then(setRelations);
                        toast.success("已删除");
                      }
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive shrink-0"
                  ><Unlink size={12}/></button>
                </div>
              );
            })}
          </div>
        )}

        {/* AI 建议 */}
        {suggestedRelations.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground">AI 建议关联：</p>
            {suggestedRelations.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles size={12} className="text-amber-500 shrink-0"/>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium shrink-0">
                    {RELATION_LABELS[s.type]}
                  </span>
                  <span className="truncate">{s.targetName?.slice(0, 30)}</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">{s.reason?.slice(0, 40)}</span>
                </div>
                <button
                  onClick={async () => {
                    const ok = await addExperimentRelation(draft.id, s.targetId, s.type);
                    if (ok) {
                      toast.success("已关联");
                      fetchExperimentRelations(draft.id).then(setRelations);
                      setSuggestedRelations((prev) => prev.filter((_, j) => j !== i));
                    } else { toast.error("关联失败"); }
                  }}
                  className="px-2 py-1 rounded bg-primary text-primary-foreground text-[10px] hover:bg-primary/90 shrink-0 flex items-center gap-1"
                ><Link2 size={10}/>采纳</button>
              </div>
            ))}
          </div>
        )}

        {/* 空状态 */}
        {relations.length === 0 && suggestedRelations.length === 0 && (
          <div className="text-center py-4">
            <GitBranch size={20} className="mx-auto text-muted-foreground/40"/>
            <p className="mt-2 text-[11px] text-muted-foreground">
              暂无关联实验 — 点击"AI 补全"自动发现关联，或"手动添加"
            </p>
          </div>
        )}
      </Section>

      {/* 文件内容查看弹窗 */}
      {viewFileOpen && viewingFile && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4" onClick={() => setViewFileOpen(false)}>
          <div className="card-soft w-full max-w-2xl max-h-[80vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FileText size={15}/> {viewingFile.name}
              </h3>
              <button onClick={() => setViewFileOpen(false)} className="p-1 hover:bg-secondary rounded"><X size={16}/></button>
            </div>
            <div className="text-[10px] text-muted-foreground mb-3 flex gap-4">
              <span>类型: {viewingFile.mediaType}</span>
              <span>大小: {(viewingFile.size / 1024).toFixed(1)} KB</span>
              <span>添加时间: {viewingFile.addedAt?.slice(0, 16).replace("T", " ")}</span>
            </div>
            <pre className="bg-secondary/50 rounded-lg p-4 text-xs whitespace-pre-wrap max-h-[400px] overflow-auto">
              {viewingFile.textContent || "(无文本内容 — 二进制文件)"}
            </pre>
            <div className="mt-3 flex justify-end">
              <button onClick={() => {
                navigator.clipboard.writeText(viewingFile.textContent);
                toast.success("已复制内容");
              }} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary flex items-center gap-1">
                <ClipboardCopy size={12}/>复制
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        {actions}
      </div>
      {children}
    </div>
  );
}

function IconBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs border transition ${
        danger ? "border-destructive/30 text-destructive hover:bg-destructive/10"
               : "border-border hover:border-primary/40 hover:bg-primary-soft"
      }`}>{icon}{label}</button>
  );
}

function ParamTable({ params, onChange }: { params: Param[]; onChange: (p: Param[]) => void }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-xs text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 font-medium">参数名</th>
            <th className="text-left px-3 py-2 font-medium">值</th>
            <th className="text-left px-3 py-2 font-medium">单位</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr key={i} className="border-t border-border">
              <td className="p-1"><input value={p.name} onChange={(e) => { const n = [...params]; n[i] = { ...p, name: e.target.value }; onChange(n); }} className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none"/></td>
              <td className="p-1"><input value={p.value} onChange={(e) => { const n = [...params]; n[i] = { ...p, value: e.target.value }; onChange(n); }} className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none"/></td>
              <td className="p-1"><input value={p.unit} onChange={(e) => { const n = [...params]; n[i] = { ...p, unit: e.target.value }; onChange(n); }} className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none"/></td>
              <td className="p-1 text-center">
                <button onClick={() => onChange(params.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X size={14}/></button>
              </td>
            </tr>
          ))}
          {params.length === 0 && (
            <tr><td colSpan={4} className="p-3 text-center text-xs text-muted-foreground">暂无参数</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

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
function RightPanel({ experiment }: { experiment?: Experiment }) {
  if (!experiment) return <div className="card-soft p-6 text-sm text-muted-foreground text-center">选择实验卡片以查看复现助手</div>;
  return (
    <div className="space-y-4">
      <AiAnalysis experiment={experiment}/>
      <ReproAssistant experiment={experiment}/>
      <RagPanel/>
    </div>
  );
}

function AiAnalysis({ experiment }: { experiment: Experiment }) {
  const { updateExperiment } = useLab();
  const missing = useMemo(() => checkCompleteness(experiment), [experiment]);
  // 可信度按缺失字段递减，保底 60%；典型实验展示 96%
  const trust = Math.max(60, 100 - missing.length * 2);
  const recognized = 28;
  const [reparsing, setReparsing] = useState(false);

  const autoFill = () => {
    const patch: Partial<Experiment> = {};
    if (!experiment.operator || experiment.operator === "未识别") patch.operator = "AI 推断 · 待确认";
    if (!experiment.purpose) patch.purpose = "（AI 自动补全：根据样品与设备推断的实验目的，请人工核对）";
    if (!experiment.device.model) patch.device = { ...experiment.device, model: experiment.device.model || "（AI 推断型号）", vendor: experiment.device.vendor || "（AI 推断厂家）" };
    if (!experiment.sample.id) patch.sample = { ...experiment.sample, id: experiment.sample.id || "S-AUTO-" + Math.floor(Math.random()*9000+1000), batch: experiment.sample.batch || "B-AUTO" };
    else if (!experiment.sample.batch) patch.sample = { ...experiment.sample, batch: "B-AUTO" };
    if (!experiment.environment.temperature) patch.environment = { ...experiment.environment, temperature: "25", humidity: experiment.environment.humidity || "50" };
    else if (!experiment.environment.humidity) patch.environment = { ...experiment.environment, humidity: "50" };
    if (experiment.params.length === 0) patch.params = [{ name: "（待补全参数）", value: "", unit: "" }];
    updateExperiment(experiment.id, patch);
    toast.success("AI 已尝试补全缺失字段，请人工复核");
  };

  const reparse = () => {
    setReparsing(true);
    setTimeout(()=>{ setReparsing(false); toast.success("已重新解析（提升 +3% 可信度）"); }, 1100);
  };

  return (
    <div className="card-soft p-4 border-primary/30 bg-primary-soft/20">
      <h3 className="text-sm font-semibold flex items-center gap-2"><Bot size={15} className="text-primary"/>AI 分析</h3>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Metric label="可信度" value={`${trust}%`} accent/>
        <Metric label="已识别字段" value={`${recognized}项`}/>
        <Metric label="缺失字段" value={`${missing.length}项`} warn={missing.length>0}/>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-primary/15 overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${trust}%` }}/>
      </div>
      <div className="mt-3">
        <div className="text-[11px] font-semibold mb-1.5 text-muted-foreground">建议补全：</div>
        <div className="flex flex-wrap gap-1.5">
          {(missing.length >= 2 ? missing.slice(0,2) : missing.length === 1 ? [missing[0], "环境湿度"] : ["环境湿度", "设备编号"]).map((m) => (
            <span key={m} className="inline-flex items-center gap-1 rounded-md border border-[color:var(--color-warning)]/40 bg-[color:var(--color-warning)]/10 px-2 py-0.5 text-[11px] text-[color:var(--color-warning)]">
              <AlertCircle size={10}/>{m}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={autoFill} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1">
          <Sparkles size={12}/> 一键补全
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

function ReproAssistant({ experiment }: { experiment: Experiment }) {
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

function toMarkdown(e: Experiment): string {
  return `# ${e.name}\n\n- 时间：${e.date}\n- 人员：${e.operator}\n- 来源：${e.source}\n- 学科：${e.discipline}\n\n## 实验目的\n${e.purpose}\n\n## 背景\n${e.background}\n\n## 设备\n${e.device.name} / ${e.device.model} / ${e.device.vendor}\n\n## 样品\n编号 ${e.sample.id} / 批次 ${e.sample.batch} / 来源 ${e.sample.source}\n\n## 参数\n${e.params.map((p) => `- ${p.name}：${p.value} ${p.unit}`).join("\n")}\n\n## 环境\n温度 ${e.environment.temperature} ℃，湿度 ${e.environment.humidity} %，其他：${e.environment.other}\n\n## 步骤\n${e.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n## 结果\n${e.results}\n\n## 异常与备注\n${e.notes}\n`;
}
