import type { ExperimentDoc, Template } from "./exp-core";
import { getProperty } from "./property-utils";
import {
  validateProperties,
  type BatchResult,
  type ValidationResult,
} from "./constraint-validator";

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

export function validateExperimentDoc(doc: ExperimentDoc, template: Template): BatchResult {
  const result = validateProperties(doc.properties, template);
  const errors: ValidationResult[] = [...result.errors];
  const warnings: ValidationResult[] = [...result.warnings];

  for (const group of template.fieldGroups) {
    for (const field of group.fields) {
      if (!field.required) continue;
      const value = getProperty(doc.properties, field.path);
      if (isEmpty(value)) {
        errors.push({
          fieldPath: field.path,
          value: 0,
          severity: "error",
          message: `${field.label}为必填字段，当前为空`,
        });
      }
    }
  }

  if (!doc.name.trim() || doc.name === "未命名实验") {
    warnings.push({
      fieldPath: "name",
      value: 0,
      severity: "warning",
      message: "实验名称仍为默认名称",
    });
  }

  const meta = doc.properties._meta;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const validationFailed = (meta as Record<string, unknown>).validationFailed;
    if (validationFailed === true) {
      warnings.push({
        fieldPath: "_meta.validationFailed",
        value: 1,
        severity: "warning",
        message: "此前自动修正未通过最终校验，需要人工复核",
      });
    }
  }

  return { passed: errors.length === 0, errors, warnings };
}

export function formatValidationIssues(result: BatchResult): string {
  return [...result.errors, ...result.warnings]
    .map((issue) => `${issue.fieldPath}: ${issue.message}`)
    .join("\n");
}
