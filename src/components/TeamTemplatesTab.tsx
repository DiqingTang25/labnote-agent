/**
 * 团队模板 Tab — 模板列表 + 完整字段编辑器（管理员）
 *
 * 权限（与 20260816_teams.sql 的 templates RLS 一致）：
 *   - 全员（团队成员）可见团队模板、可在工作台选用
 *   - 仅 owner/admin 可新建 / 编辑 / 删除（RLS templates_team_admin）
 *
 * 创建方式：从 27 个预置模板复制字段结构，或从空白通用模板开始；
 * 编辑器支持增删改字段组（label/chunkType）与字段
 * （path/label/type/unit/placeholder/options/required/表格列）。
 */
import { useEffect, useState, type FormEvent } from "react";
import { LayoutTemplate, Plus, Trash2, Pencil, X, Check, Layers } from "lucide-react";
import { toast } from "sonner";
import { useLab } from "../lib/labStore";
import { ALL_PRESET_TEMPLATES, GENERIC_DRY_EXPERIMENT_TEMPLATE } from "../lib/templates/presets";
import type { FieldDef, FieldGroup, FieldType, TableColumn } from "../lib/exp-core";
import {
  fetchTeamTemplates,
  insertTeamTemplate,
  updateTeamTemplate,
  deleteTeamTemplate,
  type TeamTemplateRow,
} from "../lib/supabase";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "单行文本" },
  { value: "textarea", label: "多行文本" },
  { value: "number", label: "数字" },
  { value: "select", label: "下拉选择" },
  { value: "boolean", label: "开关" },
  { value: "date", label: "日期" },
  { value: "datetime", label: "日期时间" },
  { value: "table", label: "表格" },
  { value: "taglist", label: "标签列表" },
];

const CHUNK_TYPES: { value: string; label: string }[] = [
  { value: "group", label: "普通组（group）" },
  { value: "meta", label: "元信息（meta）" },
  { value: "purpose", label: "目的（purpose）" },
  { value: "device_sample", label: "设备样品（device_sample）" },
  { value: "params_steps", label: "参数步骤（params_steps）" },
  { value: "results", label: "结果（results）" },
  { value: "extra", label: "扩展（extra）" },
];

const inputCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60";

function parseGroups(raw: unknown): FieldGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g): g is FieldGroup => !!g && typeof g === "object")
    .map((g) => ({
      id: String((g as FieldGroup).id ?? `g${Math.random().toString(36).slice(2, 7)}`),
      label: String((g as FieldGroup).label ?? "未命名组"),
      chunkType: (g as FieldGroup).chunkType ?? "group",
      fields: Array.isArray((g as FieldGroup).fields) ? ((g as FieldGroup).fields as FieldDef[]) : [],
    }));
}

function newGroupId(): string {
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function blankField(): FieldDef {
  return { path: "", label: "", type: "text" };
}

function blankColumn(): TableColumn {
  return { key: "", label: "", type: "text" };
}

export function TeamTemplatesTab({ teamId, isAdmin }: { teamId: string; isAdmin: boolean }) {
  const { refreshTeamTemplates } = useLab();
  const [rows, setRows] = useState<TeamTemplateRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", baseId: "" });
  const [editing, setEditing] = useState<{
    id: string;
    name: string;
    experimentType: string;
    domain: string;
    fieldGroups: FieldGroup[];
  } | null>(null);

  const load = async () => {
    setRows(await fetchTeamTemplates(teamId));
  };

  useEffect(() => {
    load();
  }, [teamId]);

  const startCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setBusy(true);
    try {
      const base = ALL_PRESET_TEMPLATES.find((t) => t.id === createForm.baseId);
      const fieldGroups = structuredClone(
        base?.fieldGroups ?? GENERIC_DRY_EXPERIMENT_TEMPLATE.fieldGroups,
      );
      const row = await insertTeamTemplate({
        team_id: teamId,
        name: createForm.name.trim(),
        experiment_type: base?.experimentType ?? "other",
        domain: base?.domain ?? "",
        field_groups: fieldGroups,
      });
      if (!row) throw new Error("创建失败（无管理员权限或网络错误）");
      toast.success("团队模板已创建");
      setCreating(false);
      setCreateForm({ name: "", baseId: "" });
      await refreshTeamTemplates();
      await load();
      setEditing({
        id: row.id,
        name: row.name,
        experimentType: row.experiment_type,
        domain: row.domain,
        fieldGroups,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败");
    } finally {
      setBusy(false);
    }
  };

  const saveEditing = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("模板名称不能为空");
      return;
    }
    setBusy(true);
    try {
      const ok = await updateTeamTemplate(editing.id, {
        name: editing.name.trim(),
        experiment_type: editing.experimentType || "other",
        domain: editing.domain,
        field_groups: editing.fieldGroups,
      });
      if (!ok) throw new Error("保存失败（无管理员权限或网络错误）");
      toast.success("模板已保存");
      setEditing(null);
      await refreshTeamTemplates();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: TeamTemplateRow) => {
    setBusy(true);
    try {
      const ok = await deleteTeamTemplate(row.id);
      if (!ok) throw new Error("删除失败（无管理员权限）");
      toast.success("模板已删除");
      await refreshTeamTemplates();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- 编辑器（全屏替换列表） ---------- */
  if (editing) {
    return (
      <TemplateEditor
        editing={editing}
        busy={busy}
        onChange={setEditing}
        onSave={saveEditing}
        onCancel={() => setEditing(null)}
      />
    );
  }

  /* ---------- 列表 ---------- */
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          团队共享的实验字段模板，成员在工作台「新建实验」时可选用。
        </p>
        {isAdmin && (
          <button
            onClick={() => setCreating(!creating)}
            className="ml-auto flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition"
          >
            <Plus size={12} /> 新建模板
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={startCreate} className="card-soft space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="模板名称 *（如：水热合成实验）"
              className={inputCls}
            />
            <select
              value={createForm.baseId}
              onChange={(e) => setCreateForm({ ...createForm, baseId: e.target.value })}
              className={inputCls}
            >
              <option value="">空白通用模板</option>
              {ALL_PRESET_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}（{t.domain || "通用"}）
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
            >
              <Check size={12} /> 创建并编辑字段
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
            >
              <X size={12} /> 取消
            </button>
          </div>
        </form>
      )}

      {rows.length === 0 && !creating ? (
        <div className="card-soft flex flex-col items-center gap-2 py-12 text-center">
          <LayoutTemplate size={32} className="text-primary" />
          <p className="text-sm text-muted-foreground">还没有团队模板</p>
          {isAdmin ? (
            <p className="text-xs text-muted-foreground">从 27 个预置模板复制一个，或从空白开始定义团队的字段规范</p>
          ) : (
            <p className="text-xs text-muted-foreground">管理员创建后，团队成员可在工作台选用</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const groups = parseGroups(r.field_groups);
            const fieldCount = groups.reduce((n, g) => n + (g.fields?.length ?? 0), 0);
            return (
              <div key={r.id} className="card-soft flex flex-wrap items-center gap-3 p-4">
                <LayoutTemplate size={16} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.experiment_type || "other"}
                    {r.domain ? ` · ${r.domain}` : ""} · v{r.version} · {groups.length} 组 / {fieldCount} 字段
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() =>
                          setEditing({
                            id: r.id,
                            name: r.name,
                            experimentType: r.experiment_type,
                            domain: r.domain,
                            fieldGroups: parseGroups(r.field_groups),
                          })
                        }
                        aria-label="编辑"
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                      >
                        <Pencil size={12} /> 编辑
                      </button>
                      <button
                        onClick={() => remove(r)}
                        disabled={busy}
                        aria-label="删除"
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
                      >
                        <Trash2 size={12} /> 删除
                      </button>
                    </>
                  )}
                  {!isAdmin && (
                    <span className="rounded-full bg-primary-soft px-3 py-1 text-xs text-primary">工作台可选用</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════ 字段编辑器 ═══════════════ */

type TemplateDraft = {
  id: string;
  name: string;
  experimentType: string;
  domain: string;
  fieldGroups: FieldGroup[];
};

function TemplateEditor(props: {
  editing: TemplateDraft;
  busy: boolean;
  onChange: (e: TemplateDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { editing, busy, onChange, onSave, onCancel } = props;

  const setMeta = (patch: Partial<typeof editing>) => onChange({ ...editing, ...patch });

  const setGroup = (gi: number, patch: Partial<FieldGroup>) => {
    const groups = editing.fieldGroups.map((g, i) => (i === gi ? { ...g, ...patch } : g));
    onChange({ ...editing, fieldGroups: groups });
  };

  const addGroup = () => {
    onChange({
      ...editing,
      fieldGroups: [...editing.fieldGroups, { id: newGroupId(), label: "新字段组", chunkType: "group", fields: [blankField()] }],
    });
  };

  const removeGroup = (gi: number) => {
    onChange({ ...editing, fieldGroups: editing.fieldGroups.filter((_, i) => i !== gi) });
  };

  const setField = (gi: number, fi: number, patch: Partial<FieldDef>) => {
    const groups = editing.fieldGroups.map((g, i) => {
      if (i !== gi) return g;
      const fields = (g.fields ?? []).map((f, j) => (j === fi ? { ...f, ...patch } : f));
      return { ...g, fields };
    });
    onChange({ ...editing, fieldGroups: groups });
  };

  const addField = (gi: number) => {
    const groups = editing.fieldGroups.map((g, i) =>
      i === gi ? { ...g, fields: [...(g.fields ?? []), blankField()] } : g,
    );
    onChange({ ...editing, fieldGroups: groups });
  };

  const removeField = (gi: number, fi: number) => {
    const groups = editing.fieldGroups.map((g, i) =>
      i === gi ? { ...g, fields: (g.fields ?? []).filter((_, j) => j !== fi) } : g,
    );
    onChange({ ...editing, fieldGroups: groups });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <X size={12} /> 返回列表
        </button>
        <h3 className="text-sm font-medium">编辑模板字段</h3>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={busy}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
          >
            <Check size={12} /> 保存模板
          </button>
        </div>
      </div>

      <div className="card-soft space-y-3 p-4">
        <div className="grid grid-cols-3 gap-3">
          <input
            value={editing.name}
            onChange={(e) => setMeta({ name: e.target.value })}
            placeholder="模板名称 *"
            className={inputCls}
          />
          <input
            value={editing.experimentType}
            onChange={(e) => setMeta({ experimentType: e.target.value })}
            placeholder="实验类型标签（如 synthesis）"
            className={inputCls}
          />
          <input
            value={editing.domain}
            onChange={(e) => setMeta({ domain: e.target.value })}
            placeholder="领域（如 材料科学）"
            className={inputCls}
          />
        </div>
      </div>

      {editing.fieldGroups.map((group, gi) => (
        <div key={group.id} className="card-soft space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Layers size={14} className="text-primary" />
            <input
              value={group.label}
              onChange={(e) => setGroup(gi, { label: e.target.value })}
              placeholder="字段组名称（如：合成参数）"
              className={`${inputCls} max-w-[240px]`}
            />
            <select
              value={group.chunkType ?? "group"}
              onChange={(e) => setGroup(gi, { chunkType: e.target.value as FieldGroup["chunkType"] })}
              className={`${inputCls} max-w-[220px]`}
            >
              {CHUNK_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => removeGroup(gi)}
              aria-label="删除字段组"
              className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-red-50 hover:text-red-600 transition"
            >
              <Trash2 size={12} /> 删除组
            </button>
          </div>

          <div className="space-y-2">
            {(group.fields ?? []).map((field, fi) => (
              <FieldRowEditor
                key={`${group.id}-${fi}`}
                field={field}
                onChange={(patch) => setField(gi, fi, patch)}
                onDelete={() => removeField(gi, fi)}
              />
            ))}
          </div>

          <button
            onClick={() => addField(gi)}
            className="flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary transition"
          >
            <Plus size={12} /> 添加字段
          </button>
        </div>
      ))}

      <button
        onClick={addGroup}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary transition"
      >
        <Plus size={12} /> 添加字段组
      </button>
    </div>
  );
}

/* ---------- 单字段编辑行 ---------- */

function FieldRowEditor(props: {
  field: FieldDef;
  onChange: (patch: Partial<FieldDef>) => void;
  onDelete: () => void;
}) {
  const { field, onChange, onDelete } = props;
  const showUnit = field.type === "number";
  const showOptions = field.type === "select" || field.type === "taglist";
  const showPlaceholder = field.type === "text" || field.type === "textarea" || field.type === "number";

  return (
    <div className="space-y-2 rounded-lg border border-border/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="显示标签 *（如：反应温度）"
          className={`${inputCls} w-[180px]`}
        />
        <input
          value={field.path}
          onChange={(e) => onChange({ path: e.target.value })}
          placeholder="字段路径 *（如：synthesis.temperature）"
          className={`${inputCls} w-[240px]`}
        />
        <select
          value={field.type}
          onChange={(e) => onChange({ type: e.target.value as FieldType })}
          className={`${inputCls} w-[130px]`}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={!!field.required}
            onChange={(e) => onChange({ required: e.target.checked })}
          />
          必填
        </label>
        <button
          onClick={onDelete}
          aria-label="删除字段"
          className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-red-50 hover:text-red-600 transition"
        >
          <Trash2 size={12} /> 删除
        </button>
      </div>

      {(showUnit || showOptions || showPlaceholder) && (
        <div className="flex flex-wrap items-center gap-2">
          {showUnit && (
            <input
              value={field.unit ?? ""}
              onChange={(e) => onChange({ unit: e.target.value || undefined })}
              placeholder="单位（如 °C）"
              className={`${inputCls} w-[120px]`}
            />
          )}
          {showOptions && (
            <input
              value={(field.options ?? []).join(", ")}
              onChange={(e) =>
                onChange({ options: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })
              }
              placeholder="选项，逗号分隔（如 A, B, C）"
              className={`${inputCls} w-[280px]`}
            />
          )}
          {showPlaceholder && (
            <input
              value={field.placeholder ?? ""}
              onChange={(e) => onChange({ placeholder: e.target.value || undefined })}
              placeholder="占位提示"
              className={`${inputCls} w-[220px]`}
            />
          )}
        </div>
      )}

      {field.type === "table" && (
        <div className="space-y-1.5 rounded-lg bg-secondary/40 p-3">
          <p className="text-xs text-muted-foreground">表格列定义</p>
          {(field.columns ?? []).map((col, ci) => (
            <div key={ci} className="flex flex-wrap items-center gap-2">
              <input
                value={col.key}
                onChange={(e) => {
                  const columns = (field.columns ?? []).map((c, i) => (i === ci ? { ...c, key: e.target.value } : c));
                  onChange({ columns });
                }}
                placeholder="列 key"
                className={`${inputCls} w-[140px]`}
              />
              <input
                value={col.label}
                onChange={(e) => {
                  const columns = (field.columns ?? []).map((c, i) => (i === ci ? { ...c, label: e.target.value } : c));
                  onChange({ columns });
                }}
                placeholder="列标题"
                className={`${inputCls} w-[140px]`}
              />
              <select
                value={col.type}
                onChange={(e) => {
                  const columns = (field.columns ?? []).map((c, i) =>
                    i === ci ? { ...c, type: e.target.value as TableColumn["type"] } : c,
                  );
                  onChange({ columns });
                }}
                className={`${inputCls} w-[110px]`}
              >
                <option value="text">文本</option>
                <option value="number">数字</option>
                <option value="select">下拉</option>
              </select>
              <input
                value={col.unit ?? ""}
                onChange={(e) => {
                  const columns = (field.columns ?? []).map((c, i) =>
                    i === ci ? { ...c, unit: e.target.value || undefined } : c,
                  );
                  onChange({ columns });
                }}
                placeholder="单位"
                className={`${inputCls} w-[100px]`}
              />
              <button
                onClick={() => onChange({ columns: (field.columns ?? []).filter((_, i) => i !== ci) })}
                aria-label="删除列"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-red-50 hover:text-red-600 transition"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange({ columns: [...(field.columns ?? []), blankColumn()] })}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <Plus size={12} /> 添加列
          </button>
        </div>
      )}
    </div>
  );
}
