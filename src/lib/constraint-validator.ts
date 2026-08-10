/**
 * 物理约束校验引擎
 *
 * 从模板 FieldDef.constraints 读取边界，校验 properties 中的数值。
 * 硬边界违反 → 拒绝入库（error）
 * 常见范围偏离 → 警告但允许入库（warning）
 *
 * 来源: NOMAD Metainfo, Allotrope ASM, MLflow, CDISC ODM, Great Expectations 等
 */

import type { FieldDef, FieldGroup, Template } from "./exp-core";
import { getNumber, getProperty } from "./property-utils";
import type { DocProperties } from "./exp-core";

// ═══════════════════════════════════════════════════════
// 通用物理定律（无需外部数据）
// ═══════════════════════════════════════════════════════

type UniversalRule = {
  match: (path: string, unit: string) => boolean;
  min?: number;
  max?: number;
  message: string;
};

const UNIVERSAL_LAWS: UniversalRule[] = [
  { match: (p, u) => u === "K" || p.includes("temperature"), min: 0, message: "温度不能低于绝对零度 (0 K)" },
  { match: (p, u) => u === "°C", min: -273.15, message: "温度不能低于绝对零度 (-273.15°C)" },
  { match: (p, u) => p.includes("yield") || p.includes("Yield") || p.includes("产率"), min: 0, max: 100, message: "产率必须在 0-100% 之间" },
  { match: (p, u) => u === "%" && (p.includes("rate") || p.includes("Rate") || p.includes("ratio") || p.includes("Ratio")), min: 0, max: 100, message: "比率类字段必须在 0-100% 之间" },
  { match: (p, u) => u === "eV" && p.includes("bandGap"), min: 0, message: "带隙不能为负" },
  { match: (p, u) => p.includes("mass") || p.includes("Mass") || p.includes("weight"), min: 0, message: "质量不能为负" },
  { match: (p, u) => u === "fs" || u === "ns" || u === "μs" || p.includes("duration") || p.includes("time"), min: 0, message: "时间不能为负" },
  { match: (p, u) => u === "eV/Å" && p.includes("ediffg"), max: 0, message: "力收敛标准必须为负值 (VASP 约定)" },
  { match: (p, u) => p.includes("pValue") || p.includes("p_value"), min: 0, max: 1, message: "p 值必须在 [0, 1] 之间" },
  { match: (p, u) => p.includes("accuracy") || p.includes("Accuracy"), min: 0, max: 1, message: "准确率必须在 [0, 1] 之间" },
  { match: (p, u) => p.includes("poisson"), min: -1, max: 0.5, message: "泊松比必须在 [-1, 0.5] 之间（弹性稳定性边界）" },
];

// ═══════════════════════════════════════════════════════
// 类型
// ═══════════════════════════════════════════════════════

export type ValidationResult = {
  fieldPath: string;
  value: number;
  severity: "error" | "warning" | "ok";
  message: string;
};

export type BatchResult = {
  passed: boolean;
  errors: ValidationResult[];
  warnings: ValidationResult[];
};

// ═══════════════════════════════════════════════════════
// 主校验函数
// ═══════════════════════════════════════════════════════

/**
 * 校验一个实验文档的属性值
 * @param properties 实验的 DocProperties
 * @param template 匹配的模板（含 constraints）
 * @returns 校验结果
 */
export function validateProperties(
  properties: DocProperties,
  template: Template,
): BatchResult {
  const errors: ValidationResult[] = [];
  const warnings: ValidationResult[] = [];

  // 1. 按模板字段逐项校验
  for (const group of template.fieldGroups) {
    for (const field of group.fields) {
      if (field.type !== "number") continue;

      const value = getNumber(properties, field.path);
      if (value === undefined) continue; // 字段不存在，跳过

      // 1a. 模板定义的约束
      if (field.constraints) {
        const c = field.constraints;

        // 硬边界
        if (c.min !== undefined && c.min !== null && value < c.min) {
          errors.push({
            fieldPath: field.path,
            value,
            severity: "error",
            message: `${field.label}: ${value} < 最小值 ${c.min} ${field.unit || ""}。${c.source || ""}`,
          });
        }
        if (c.max !== undefined && c.max !== null && value > c.max) {
          errors.push({
            fieldPath: field.path,
            value,
            severity: "error",
            message: `${field.label}: ${value} > 最大值 ${c.max} ${field.unit || ""}。${c.source || ""}`,
          });
        }

        // 软边界（典型范围）
        if (c.typicalRange) {
          const [lo, hi] = c.typicalRange;
          if (value < lo || value > hi) {
            warnings.push({
              fieldPath: field.path,
              value,
              severity: "warning",
              message: `${field.label}: ${value} ${field.unit || ""} 超出常见范围 [${lo}, ${hi}]。${c.source || ""}`,
            });
          }
        }
      }

      // 1b. 通用物理定律
      for (const law of UNIVERSAL_LAWS) {
        if (law.match(field.path, field.unit || "")) {
          if (law.min !== undefined && value < law.min) {
            errors.push({ fieldPath: field.path, value, severity: "error", message: law.message });
          }
          if (law.max !== undefined && value > law.max) {
            errors.push({ fieldPath: field.path, value, severity: "error", message: law.message });
          }
        }
      }
    }
  }

  // 2. 检查所有 properties 中的 number 值（包括模板外字段）
  const extraNumberFields = collectExtraNumbers(properties, template);
  for (const { path, value } of extraNumberFields) {
    for (const law of UNIVERSAL_LAWS) {
      if (law.match(path, "")) {
        if (law.min !== undefined && value < law.min) {
          errors.push({ fieldPath: path, value, severity: "error", message: law.message });
        }
        if (law.max !== undefined && value > law.max) {
          errors.push({ fieldPath: path, value, severity: "error", message: law.message });
        }
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 校验单个字段值
 */
export function validateField(
  value: number,
  field: FieldDef,
): ValidationResult | null {
  // 通用物理定律
  for (const law of UNIVERSAL_LAWS) {
    if (law.match(field.path, field.unit || "")) {
      if (law.min !== undefined && value < law.min) {
        return { fieldPath: field.path, value, severity: "error", message: law.message };
      }
      if (law.max !== undefined && value > law.max) {
        return { fieldPath: field.path, value, severity: "error", message: law.message };
      }
    }
  }

  // 模板约束
  if (!field.constraints) return null;
  const c = field.constraints;

  if (c.min !== undefined && c.min !== null && value < c.min) {
    return {
      fieldPath: field.path,
      value,
      severity: "error",
      message: `${field.label}: ${value} < 最小值 ${c.min} ${field.unit || ""}`,
    };
  }
  if (c.max !== undefined && c.max !== null && value > c.max) {
    return {
      fieldPath: field.path,
      value,
      severity: "error",
      message: `${field.label}: ${value} > 最大值 ${c.max} ${field.unit || ""}`,
    };
  }
  if (c.typicalRange) {
    const [lo, hi] = c.typicalRange;
    if (value < lo || value > hi) {
      return {
        fieldPath: field.path,
        value,
        severity: "warning",
        message: `${field.label}: ${value} ${field.unit || ""} 超出常见范围 [${lo}, ${hi}]`,
      };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════
// 辅助
// ═══════════════════════════════════════════════════════

/** 收集不在模板中、但 properties 里存在的数值字段 */
function collectExtraNumbers(
  props: DocProperties,
  template: Template,
): Array<{ path: string; value: number }> {
  const templatePaths = new Set<string>();
  for (const g of template.fieldGroups) {
    for (const f of g.fields) {
      templatePaths.add(f.path);
    }
  }

  const result: Array<{ path: string; value: number }> = [];
  const walk = (obj: Record<string, unknown>, prefix: string) => {
    for (const [key, val] of Object.entries(obj)) {
      if (key === "_meta" || key === "extra") continue;
      const fullPath = prefix ? `${prefix}.${key}` : key;
      if (typeof val === "number" && !templatePaths.has(fullPath)) {
        result.push({ path: fullPath, value: val });
      } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        walk(val as Record<string, unknown>, fullPath);
      }
    }
  };
  walk(props, "");
  return result;
}
