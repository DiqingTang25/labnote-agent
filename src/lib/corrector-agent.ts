import type { ExperimentDoc, Template } from "./exp-core";
import { mergeProperties } from "./property-utils";
import { parseAPIResponse, normalizeExperiment } from "./json-parser";
import { buildReparsePrompt } from "./prompt-builder";
import { chat, MODEL_TEXT } from "./deepseek";
import type { ValidationResult } from "./constraint-validator";

export type CorrectorSourceFile = {
  name: string;
  textContent: string;
};

function correctionPrompt(
  template: Template,
  doc: ExperimentDoc,
  files: CorrectorSourceFile[],
  errors: ValidationResult[],
): string {
  const base = buildReparsePrompt(template, doc, files);
  const issues = errors.map((error) => `- ${error.fieldPath}: ${error.message}`).join("\n");
  return `${base}\n\n【校验错误，必须优先修正】\n${issues}\n\n只返回一个 JSON 实验对象或 {"experiments":[...]}，不要解释。对于无法从文件确认的值保留原值，不要编造。`;
}

export async function correctExperimentDoc(
  doc: ExperimentDoc,
  template: Template,
  sourceFiles: CorrectorSourceFile[],
  errors: ValidationResult[],
): Promise<ExperimentDoc> {
  let current = doc;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await chat(
        MODEL_TEXT,
        [{ role: "user", content: correctionPrompt(template, current, sourceFiles, errors) }],
        4096,
      );
      const parsed = parseAPIResponse(raw, "__corrector__", template)[0];
      if (!parsed) continue;
      current = normalizeExperiment(
        { ...current, ...parsed },
        {
          ...current,
          properties: mergeProperties(current.properties, parsed.properties ?? {}),
        },
      );
    } catch (error) {
      console.warn(`[Corrector] attempt ${attempt + 1} failed:`, error);
    }
  }

  return current;
}

export function markValidationFailed(
  doc: ExperimentDoc,
  errors: ValidationResult[],
): ExperimentDoc {
  return {
    ...doc,
    properties: mergeProperties(doc.properties, {
      _meta: {
        validationFailed: true,
        validationErrors: errors.map((error) => ({
          fieldPath: error.fieldPath,
          message: error.message,
        })),
      },
    }),
  };
}
