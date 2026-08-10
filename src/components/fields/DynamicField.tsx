/**
 * DynamicField — 一个 FieldDef → 一个输入控件
 *
 * 根据字段类型（text/textarea/number/select/boolean/date/table/taglist）
 * 自动渲染对应的输入控件。绑定 DocProperties 的路径读写。
 */

import { useState } from "react";
import type { FieldDef, DocProperties, PropValue, TableColumn } from "../../lib/exp-core";
import { getProperty, setProperty, getString, getNumber, getBool } from "../../lib/property-utils";
import { Plus, X } from "lucide-react";

// ═══════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════

type Props = {
  /** 字段定义（来自 template.fieldGroups[].fields[]） */
  def: FieldDef;
  /** 当前完整 properties 对象 */
  properties: DocProperties;
  /** 字段值变更回调 */
  onChange: (newProps: DocProperties) => void;
  /** 通用 input 样式类 */
  inputCls?: string;
};

const DEFAULT_INPUT = "w-full rounded-lg border border-border px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30";

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════

export function DynamicField({ def, properties, onChange, inputCls = DEFAULT_INPUT }: Props) {
  const cls = inputCls;

  switch (def.type) {
    case "text":
      return (
        <TextInput
          value={getString(properties, def.path)}
          placeholder={def.placeholder}
          cls={cls}
          onChange={(v) => onChange(setProperty(properties, def.path, v))}
        />
      );

    case "textarea":
      return (
        <TextareaInput
          value={getString(properties, def.path)}
          placeholder={def.placeholder}
          cls={cls}
          onChange={(v) => onChange(setProperty(properties, def.path, v))}
        />
      );

    case "number":
      return (
        <NumberInput
          value={getNumber(properties, def.path)}
          unit={def.unit}
          placeholder={def.placeholder}
          cls={cls}
          onChange={(v) => onChange(setProperty(properties, def.path, v))}
        />
      );

    case "select":
      return (
        <SelectInput
          value={getString(properties, def.path)}
          options={def.options ?? []}
          cls={cls}
          onChange={(v) => onChange(setProperty(properties, def.path, v))}
        />
      );

    case "boolean":
      return (
        <BoolInput
          value={getBool(properties, def.path) ?? false}
          cls={cls}
          onChange={(v) => onChange(setProperty(properties, def.path, v))}
        />
      );

    case "date":
    case "datetime":
      return (
        <DateInput
          value={getString(properties, def.path)}
          cls={cls}
          onChange={(v) => onChange(setProperty(properties, def.path, v))}
        />
      );

    case "table":
      return (
        <TableInput
          columns={def.columns ?? []}
          value={getProperty(properties, def.path) as TableRow[] | undefined}
          cls={cls}
          onChange={(v) => onChange(setProperty(properties, def.path, v))}
        />
      );

    case "taglist":
      return (
        <TagInput
          value={getProperty(properties, def.path) as string[] | undefined}
          placeholder={def.placeholder}
          cls={cls}
          onChange={(v) => onChange(setProperty(properties, def.path, v))}
        />
      );

    default:
      return (
        <TextInput
          value={getString(properties, def.path)}
          placeholder={def.placeholder}
          cls={cls}
          onChange={(v) => onChange(setProperty(properties, def.path, v))}
        />
      );
  }
}

// ═══════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════

function FieldWrapper({ label, required, suggested, unit, children }: {
  label: string; required?: boolean; suggested?: boolean; unit?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
        {suggested && <span className="text-primary text-[10px] bg-primary-soft px-1 rounded">建议</span>}
      </span>
      <div className="flex items-center gap-1.5">
        {children}
        {unit && <span className="text-[10px] text-muted-foreground whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  );
}

function TextInput({ value, placeholder, cls, onChange }: {
  value: string; placeholder?: string; cls: string; onChange: (v: string) => void;
}) {
  return <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} />;
}

function TextareaInput({ value, placeholder, cls, onChange }: {
  value: string; placeholder?: string; cls: string; onChange: (v: string) => void;
}) {
  return <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls + " min-h-[60px]"} />;
}

function NumberInput({ value, unit, placeholder, cls, onChange }: {
  value: number | undefined; unit?: string; placeholder?: string; cls: string; onChange: (v: number | string) => void;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? "" : parseFloat(v));
      }}
      className={cls}
    />
  );
}

function SelectInput({ value, options, cls, onChange }: {
  value: string; options: string[]; cls: string; onChange: (v: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
      <option value="">—</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

function BoolInput({ value, cls, onChange }: {
  value: boolean; cls: string; onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
        value
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:border-primary/50"
      }`}
    >
      {value ? "✓ 是" : "✗ 否"}
    </button>
  );
}

function DateInput({ value, cls, onChange }: {
  value: string; cls: string; onChange: (v: string) => void;
}) {
  return (
    <input
      type="date"
      value={value ? value.slice(0, 10) : ""}
      onChange={(e) => onChange(e.target.value)}
      className={cls}
    />
  );
}

// ═══════════════════════════════════════════════════════
// Table Input
// ═══════════════════════════════════════════════════════

type TableRow = Record<string, PropValue>;

function TableInput({ columns, value, cls, onChange }: {
  columns: TableColumn[];
  value: TableRow[] | undefined;
  cls: string;
  onChange: (v: TableRow[]) => void;
}) {
  const rows = value ?? [];

  const addRow = () => {
    const row: TableRow = {};
    for (const col of columns) row[col.key] = "";
    onChange([...rows, row]);
  };

  const updateCell = (rowIdx: number, colKey: string, val: string) => {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [colKey]: val } : r));
    onChange(next);
  };

  const removeRow = (rowIdx: number) => {
    onChange(rows.filter((_, i) => i !== rowIdx));
  };

  if (columns.length === 0) {
    return <p className="text-[11px] text-muted-foreground">表格列未定义</p>;
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-[10px] text-muted-foreground">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="text-left px-2 py-1.5 font-medium">
                {col.label}{col.unit ? ` (${col.unit})` : ""}
              </th>
            ))}
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {columns.map((col) => (
                <td key={col.key} className="p-1">
                  <input
                    value={(row[col.key] as string) ?? ""}
                    onChange={(e) => updateCell(i, col.key, e.target.value)}
                    className="w-full rounded border border-border px-1.5 py-1 bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </td>
              ))}
              <td className="p-1 text-center">
                <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive">
                  <X size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={addRow}
        className="w-full py-1.5 text-[11px] text-primary hover:bg-primary/5 flex items-center justify-center gap-1 border-t border-border"
      >
        <Plus size={12} /> 添加行
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Tag Input
// ═══════════════════════════════════════════════════════

function TagInput({ value, placeholder, cls, onChange }: {
  value: string[] | undefined;
  placeholder?: string;
  cls: string;
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const tags = value ?? [];

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput("");
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-md bg-primary-soft text-primary text-[11px] px-2 py-0.5">
          {tag}
          <button onClick={() => onChange(tags.filter((_, j) => j !== i))} className="hover:text-destructive">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={input}
        placeholder={tags.length === 0 ? placeholder ?? "输入标签后回车" : "+ 添加"}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
        className={cls + " w-32"}
      />
    </div>
  );
}

// Re-export for use in DynamicCardEditor
export { FieldWrapper };
