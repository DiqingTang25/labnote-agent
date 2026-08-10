/**
 * DynamicCardEditor — 配置驱动的实验卡片编辑器
 *
 * 零硬编码字段。
 * Header: name / date / operator / experimentType（核心列）
 * Body: 按 template.fieldGroups 渲染 Section + DynamicField
 * Extra: properties.extra 中所有未归类数据 — 永远可见可编辑
 */

import { useState, useEffect } from "react";
import type { ExperimentDoc, Template, FieldDef, DocProperties } from "../../lib/exp-core";
import { getTemplate, GENERIC_TEMPLATE } from "../../lib/templates/presets";
import { setProperty, getProperty, flattenProperties } from "../../lib/property-utils";
import { DynamicField, FieldWrapper } from "./DynamicField";
import { Plus, Save, FileText, FileJson, Printer, Trash2, Package, Sparkles, X } from "lucide-react";

// ═══════════════════════════════════════════════════════
// Tailwind helpers
// ═══════════════════════════════════════════════════════

const inputCls = "w-full rounded-lg border border-border px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30";
const cellCls = "w-full rounded border border-border px-1.5 py-1 bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary/30";

// ═══════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════

type Props = {
  doc: ExperimentDoc;
  allExperiments?: ExperimentDoc[];
  onSave: (doc: ExperimentDoc) => void;
  onDelete: () => void;
  onExportJSON?: () => void;
  onExportMD?: () => void;
  onExportPDF?: () => void;
  onTemplateChange?: (templateId: string) => void;
  /** 文件管理 */
  attachedFiles?: Array<{
    id: string; name: string; mediaType: string; size: number;
    file_url: string; storage_path: string; textContent?: string;
  }>;
  onViewFile?: (file: { name: string; textContent?: string }) => void;
  onRemoveFile?: (fileId: string) => void;
};

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════

export function DynamicCardEditor({
  doc,
  allExperiments,
  onSave,
  onDelete,
  onExportJSON,
  onExportMD,
  onExportPDF,
  onTemplateChange,
  attachedFiles,
  onViewFile,
  onRemoveFile,
}: Props) {
  const [draft, setDraft] = useState<ExperimentDoc>(doc);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldPath, setNewFieldPath] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<string>("text");
  const [showTemplateBanner, setShowTemplateBanner] = useState(false);

  // Resolve template
  const meta = (draft.properties as Record<string, unknown>)?.["_meta"] as Record<string, unknown> | undefined;
  const templateId = meta?.templateId as string | undefined;
  const template = templateId ? getTemplate(templateId) : undefined;

  // Sync when doc changes externally
  useEffect(() => {
    setDraft(doc);
  }, [doc.id]);

  const updateCore = <K extends keyof ExperimentDoc>(key: K, value: ExperimentDoc[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const updateProperty = (path: string, value: unknown) => {
    setDraft((d) => ({
      ...d,
      properties: setProperty(d.properties, path, value as import("../../lib/exp-core").PropValue),
    }));
  };

  const currentTemplate = template ?? GENERIC_TEMPLATE;

  // Collect extra keys (keys not in any template field)
  const templatePaths = new Set<string>();
  for (const group of currentTemplate.fieldGroups) {
    for (const field of group.fields) {
      templatePaths.add(field.path);
    }
  }
  // Also collect reserved paths
  templatePaths.add("_meta");
  templatePaths.add("extra");
  templatePaths.add("steps");

  const extraEntries: Array<{ key: string; value: unknown }> = [];
  const extraObj = draft.properties["extra"] as Record<string, unknown> | undefined;
  if (extraObj) {
    for (const [k, v] of Object.entries(extraObj)) {
      extraEntries.push({ key: k, value: v });
    }
  }

  // Find properties not in template and not in extra
  const unclassifiedEntries: Array<{ path: string; value: unknown }> = [];
  const flatEntries = flattenProperties(draft.properties);
  for (const entry of flatEntries) {
    if (!templatePaths.has(entry.path) && !entry.path.startsWith("extra.") && !entry.path.startsWith("_meta.")) {
      unclassifiedEntries.push(entry);
    }
  }

  const addCustomField = () => {
    if (!newFieldPath.trim()) return;
    const path = newFieldPath.trim();
    const label = newFieldLabel.trim() || path.split(".").pop() || path;
    updateProperty(path, "");

    // Record in _meta.overrides
    const overrides = (meta?.overrides as FieldDef[]) ?? [];
    const newOverrides = [...overrides, {
      path,
      label,
      type: newFieldType as FieldDef["type"],
    }];
    updateProperty("_meta", { ...(meta ?? {}), overrides: newOverrides });

    setShowAddField(false);
    setNewFieldPath("");
    setNewFieldLabel("");
  };

  // Source/discipline from properties
  const source = (draft.properties as Record<string, unknown>)?.["source"] as string || "LabNote";
  const discipline = (draft.properties as Record<string, unknown>)?.["discipline"] as string || "";

  return (
    <div className="card-soft p-5">
      {/* ═══ Header ═══ */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <input
            value={draft.name}
            onChange={(e) => updateCore("name", e.target.value)}
            className="w-full text-xl font-bold bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none pb-1"
          />
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground items-center">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft text-primary px-2 py-0.5">
              <Package size={11} />{source}
            </span>
            {discipline && <span>{discipline}</span>}
            {currentTemplate.id !== "tpl_generic" && (
              <span className="text-primary text-[10px] bg-primary-soft px-2 py-0.5 rounded-full">
                {currentTemplate.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 no-print">
          <IconBtn onClick={() => onSave(draft)} icon={<Save size={14} />} label="保存" />
          {onExportMD && <IconBtn onClick={onExportMD} icon={<FileText size={14} />} label="MD" />}
          {onExportJSON && <IconBtn onClick={onExportJSON} icon={<FileJson size={14} />} label="JSON" />}
          {onExportPDF && <IconBtn onClick={onExportPDF} icon={<Printer size={14} />} label="PDF" />}
          <IconBtn onClick={onDelete} icon={<Trash2 size={14} />} label="删除" danger />
        </div>
      </div>

      {/* ═══ Template Suggestion Banner ═══ */}
      {showTemplateBanner && onTemplateChange && (
        <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
          <span className="text-xs text-primary flex items-center gap-1.5">
            <Sparkles size={13} />
            AI 检测到该实验更适合「{currentTemplate.name}」模板，切换后字段将按专业分组展示
          </span>
          <button
            onClick={() => { onTemplateChange(currentTemplate.id); setShowTemplateBanner(false); }}
            className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md font-medium"
          >
            一键切换
          </button>
        </div>
      )}

      {/* ═══ Core Fields ═══ */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <FieldWrapper label="实验时间">
          <input value={draft.date} onChange={(e) => updateCore("date", e.target.value)} className={inputCls} />
        </FieldWrapper>
        <FieldWrapper label="实验人员">
          <input value={draft.operator} onChange={(e) => updateCore("operator", e.target.value)} className={inputCls} />
        </FieldWrapper>
        <FieldWrapper label="实验类型">
          <input
            value={draft.experimentType}
            onChange={(e) => updateCore("experimentType", e.target.value)}
            className={inputCls}
            placeholder="simulation / measurement / synthesis / ..."
          />
        </FieldWrapper>
      </div>

      {/* ═══ Template Field Groups ═══ */}
      {currentTemplate.fieldGroups.map((group) => {
        if (group.fields.length === 0 && group.id !== "steps") return null;

        return (
          <Section key={group.id} title={group.label}>
            {group.id === "steps" ? (
              <StepsEditor
                steps={(draft.properties["steps"] as string[]) ?? []}
                onChange={(v) => updateProperty("steps", v)}
                inputCls={inputCls}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {group.fields.map((field) => (
                  <FieldWrapper
                    key={field.path}
                    label={field.label}
                    required={field.required}
                    suggested={field.suggested}
                    unit={field.type === "number" ? field.unit : undefined}
                  >
                    <DynamicField
                      def={field}
                      properties={draft.properties}
                      onChange={(newProps) => setDraft((d) => ({ ...d, properties: newProps }))}
                      inputCls={inputCls}
                    />
                  </FieldWrapper>
                ))}
              </div>
            )}
            {/* Group-scoped add field */}
            <button
              onClick={() => {
                setNewFieldPath(group.id + ".");
                setShowAddField(true);
              }}
              className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> 在此组添加字段
            </button>
          </Section>
        );
      })}

      {/* ═══ Unclassified Properties ═══ */}
      {unclassifiedEntries.length > 0 && (
        <Section title="其他属性">
          <div className="grid grid-cols-2 gap-3">
            {unclassifiedEntries.map((entry) => (
              <FieldWrapper key={entry.path} label={entry.path}>
                <input
                  value={typeof entry.value === "string" ? entry.value : JSON.stringify(entry.value)}
                  onChange={(e) => updateProperty(entry.path, e.target.value)}
                  className={inputCls}
                />
              </FieldWrapper>
            ))}
          </div>
        </Section>
      )}

      {/* ═══ Extra Section — AI 未归类数据 ═══ */}
      {extraEntries.length > 0 && (
        <Section title="AI 提取的未归类数据" actions={
          <span className="text-[10px] text-muted-foreground">这些信息未被模板覆盖，但已完整保留</span>
        }>
          <div className="grid grid-cols-2 gap-3">
            {extraEntries.map(({ key, value }) => (
              <FieldWrapper key={key} label={key}>
                <input
                  value={typeof value === "string" ? value : JSON.stringify(value)}
                  onChange={(e) => {
                    const newExtra = { ...(extraObj ?? {}) };
                    newExtra[key] = e.target.value;
                    updateProperty("extra", newExtra);
                  }}
                  className={inputCls}
                />
              </FieldWrapper>
            ))}
          </div>
        </Section>
      )}

      {/* ═══ Add Field Dialog ═══ */}
      {showAddField && (
        <div className="mt-3 p-3 rounded-lg bg-secondary/30 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">添加自定义字段</span>
            <button onClick={() => setShowAddField(false)} className="text-muted-foreground hover:text-destructive">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              value={newFieldPath}
              onChange={(e) => setNewFieldPath(e.target.value)}
              placeholder="字段路径 (如 model.dropout)"
              className={inputCls + " text-xs"}
            />
            <input
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              placeholder="显示标签"
              className={inputCls + " text-xs"}
            />
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value)}
              className={inputCls + " text-xs"}
            >
              <option value="text">文本</option>
              <option value="textarea">长文本</option>
              <option value="number">数字</option>
              <option value="select">下拉选择</option>
              <option value="boolean">开关</option>
              <option value="date">日期</option>
            </select>
          </div>
          <button
            onClick={addCustomField}
            className="mt-2 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md"
          >
            添加字段
          </button>
        </div>
      )}

      <button
        onClick={() => setShowAddField(true)}
        className="mt-4 text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
      >
        <Plus size={12} /> 添加自定义字段
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════

function Section({ title, actions, children }: {
  title: string; actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

function IconBtn({ onClick, icon, label, danger }: {
  onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-md hover:bg-secondary/60 text-xs flex items-center gap-1 ${
        danger ? "text-destructive hover:text-destructive" : "text-muted-foreground"
      }`}
      title={label}
    >
      {icon}
    </button>
  );
}

function StepsEditor({ steps, onChange, inputCls }: {
  steps: string[]; onChange: (v: string[]) => void; inputCls: string;
}) {
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="mt-2 text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
          <textarea
            value={s}
            onChange={(e) => {
              const next = [...steps];
              next[i] = e.target.value;
              onChange(next);
            }}
            className={inputCls + " flex-1 min-h-[40px]"}
          />
          <button
            onClick={() => onChange(steps.filter((_, j) => j !== i))}
            className="p-1.5 text-muted-foreground hover:text-destructive"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...steps, ""])}
        className="text-xs text-primary hover:underline flex items-center gap-1"
      >
        <Plus size={12} /> 添加步骤
      </button>
    </div>
  );
}
