import assert from "node:assert/strict";
import { parseAPIResponse, normalizeExperiment } from "../src/lib/json-parser";
import { markValidationFailed } from "../src/lib/corrector-agent";
import { validateExperimentDoc } from "../src/lib/validator-agent";
import type { Template } from "../src/lib/exp-core";

const template: Template = {
  id: "tpl_validation_test",
  name: "校验测试模板",
  experimentType: "other",
  domain: "test",
  version: 2,
  isPreset: true,
  fieldGroups: [
    {
      id: "conditions",
      label: "条件",
      fields: [
        { path: "purpose", label: "实验目的", type: "text", required: true },
        { path: "temperature", label: "温度", type: "number", unit: "K", required: true },
      ],
    },
  ],
};

const parsed = parseAPIResponse(
  JSON.stringify({
    name: "低温实验",
    properties: { purpose: "验证约束", temperature: -1 },
  }),
  "test.json",
  template,
)[0];

assert.ok(parsed);
assert.equal((parsed.properties?._meta as Record<string, unknown>).templateId, template.id);
assert.equal(
  (parsed.properties?._meta as Record<string, unknown>).templateVersion,
  template.version,
);

const invalidDoc = normalizeExperiment(parsed, { properties: parsed.properties });
const invalid = validateExperimentDoc(invalidDoc, template);
assert.equal(invalid.passed, false);
assert.ok(invalid.errors.some((error) => error.fieldPath === "temperature"));

const marked = markValidationFailed(invalidDoc, invalid.errors);
assert.equal((marked.properties._meta as Record<string, unknown>).validationFailed, true);

const validDoc = normalizeExperiment(
  {
    name: "正常实验",
    properties: { purpose: "验证约束", temperature: 298 },
  },
  { properties: { purpose: "验证约束", temperature: 298 } },
);
const valid = validateExperimentDoc(validDoc, template);
assert.equal(valid.passed, true);

console.log("pipeline validation tests passed");
