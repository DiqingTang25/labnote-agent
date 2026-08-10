import { validateProperties } from "./constraint-validator";
import { createBlankDoc, type DocProperties, type ExperimentDoc, type PropValue, type Template } from "./exp-core";
import { splitExperimentIntoChunks } from "./experiment-utils";
import { buildGraphData } from "./graph-data";
import { normalizeExperiment, parseAPIResponse } from "./json-parser";
import { getProperty, mergeProperties, setProperty } from "./property-utils";
import { applySanitization, scanSensitivity } from "./sanitizer";
import { ALL_PRESET_TEMPLATES, DEFAULT_TEMPLATE, getTemplate, matchTemplate } from "./templates/presets";

export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

type ToolResult = Record<string, unknown>;

type JsonObject = Record<string, unknown>;

const templateSummary = (template: Template) => ({
  id: template.id,
  name: template.name,
  domain: template.domain,
  experimentType: template.experimentType,
  version: template.version,
  keywords: template.keywords ?? [],
  fieldGroups: template.fieldGroups,
});

const requiredPaths = (template: Template) => template.fieldGroups
  .flatMap((group) => group.fields)
  .filter((field) => field.required)
  .map((field) => field.path);

function object(value: unknown, fieldName: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} must be a JSON object`);
  }
  return value as JsonObject;
}

function stringValue(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${fieldName} must be a non-empty string`);
  return value.trim();
}

function findTemplate(templateId: unknown): Template {
  const id = typeof templateId === "string" && templateId ? templateId : DEFAULT_TEMPLATE.id;
  const template = getTemplate(id);
  if (!template) throw new Error(`Unknown template_id: ${id}`);
  return template;
}

function asProperties(value: unknown): DocProperties {
  return object(value, "properties") as DocProperties;
}

function applyPropertyPatches(properties: DocProperties, patches: unknown): DocProperties {
  if (patches === undefined) return properties;
  if (!Array.isArray(patches)) throw new Error("property_patches must be an array");

  return patches.reduce<DocProperties>((current, patch, index) => {
    const item = object(patch, `property_patches[${index}]`);
    return setProperty(
      current,
      stringValue(item.path, `property_patches[${index}].path`),
      item.value as PropValue,
    );
  }, properties);
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: "list_labnote_templates",
    description: "Returns the complete LabNote preset template catalog, including dynamic field groups, field types, units, required flags, and constraints.",
    inputSchema: { type: "object", properties: { domain: { type: "string" }, experiment_type: { type: "string" }, include_fields: { type: "boolean", default: true } } },
  },
  {
    name: "match_labnote_template",
    description: "Matches an experiment description against LabNote's complete template catalog without creating or saving a record.",
    inputSchema: { type: "object", required: ["text"], properties: { text: { type: "string", minLength: 1 } } },
  },
  {
    name: "create_experiment_card_draft",
    description: "Creates a complete unsaved ExperimentDoc draft using LabNote's real dynamic template, metadata model, and property merge semantics.",
    inputSchema: { type: "object", properties: { template_id: { type: "string", default: "tpl_generic_dry_experiment" }, name: { type: "string" }, date: { type: "string" }, operator: { type: "string" }, experiment_type: { type: "string" }, properties_patch: { type: "object" }, property_patches: { type: "array", items: { type: "object", required: ["path", "value"], properties: { path: { type: "string" }, value: {} } } } } },
  },
  {
    name: "validate_experiment_properties",
    description: "Validates required dynamic fields and LabNote physical/numerical constraints. It never saves data.",
    inputSchema: { type: "object", required: ["template_id", "properties"], properties: { template_id: { type: "string" }, properties: { type: "object" } } },
  },
  {
    name: "build_experiment_rag_chunks",
    description: "Builds the same template-driven RAG chunks used by LabNote knowledge retrieval, entirely offline and without inserting embeddings.",
    inputSchema: { type: "object", required: ["experiment"], properties: { experiment: { type: "object" }, template_id: { type: "string" } } },
  },
  {
    name: "build_experiment_graph",
    description: "Builds LabNote graph nodes and edges from supplied ExperimentDoc records using the same graph-data domain logic as the web application. It does not write relations.",
    inputSchema: { type: "object", required: ["experiments"], properties: { experiments: { type: "array", minItems: 1, items: { type: "object" } } } },
  },
  {
    name: "apply_experiment_property_patches",
    description: "Applies path-based dynamic property patches immutably to an unsaved LabNote ExperimentDoc draft. It never writes to Supabase.",
    inputSchema: { type: "object", required: ["experiment", "property_patches"], properties: { experiment: { type: "object" }, property_patches: { type: "array", minItems: 1, items: { type: "object", required: ["path", "value"], properties: { path: { type: "string" }, value: {} } } } } },
  },
  {
    name: "parse_experiment_content",
    description: "Uses LabNote's existing AI extraction pipeline, dynamic template prompt, response parser, and sensitivity sanitizer to turn text or CSV content into unsaved ExperimentDoc drafts. Input is never stored.",
    inputSchema: { type: "object", required: ["content", "file_name"], properties: { content: { type: "string", minLength: 1, maxLength: 12000 }, file_name: { type: "string", minLength: 1 }, mode: { type: "string", enum: ["text", "csv"], default: "text" }, template_id: { type: "string", default: "tpl_generic_dry_experiment" } } },
  },
];

export async function callMcpTool(name: string, args: unknown): Promise<ToolResult> {
  const input = args === undefined ? {} : object(args, "arguments");

  switch (name) {
    case "list_labnote_templates": {
      const domain = typeof input.domain === "string" ? input.domain : undefined;
      const experimentType = typeof input.experiment_type === "string" ? input.experiment_type : undefined;
      const includeFields = input.include_fields !== false;
      const templates = ALL_PRESET_TEMPLATES
        .filter((template) => (!domain || template.domain === domain) && (!experimentType || template.experimentType === experimentType))
        .map((template) => includeFields ? templateSummary(template) : {
          id: template.id, name: template.name, domain: template.domain, experimentType: template.experimentType, version: template.version,
        });
      return { count: templates.length, defaultTemplateId: DEFAULT_TEMPLATE.id, templates };
    }
    case "match_labnote_template": {
      const text = stringValue(input.text, "text");
      const template = matchTemplate(text) ?? DEFAULT_TEMPLATE;
      return { matched: template !== DEFAULT_TEMPLATE || Boolean(matchTemplate(text)), fallback: template.id === DEFAULT_TEMPLATE.id && !matchTemplate(text), template: templateSummary(template) };
    }
    case "create_experiment_card_draft": {
      const template = findTemplate(input.template_id);
      const draft = createBlankDoc(template);
      const propertiesPatch = input.properties_patch === undefined ? {} : asProperties(input.properties_patch);
      const mergedProperties = applyPropertyPatches(mergeProperties(draft.properties, propertiesPatch), input.property_patches);
      return {
        saved: false,
        experiment: {
          ...draft,
          name: typeof input.name === "string" && input.name.trim() ? input.name.trim() : draft.name,
          date: typeof input.date === "string" && input.date.trim() ? input.date.trim() : draft.date,
          operator: typeof input.operator === "string" ? input.operator : draft.operator,
          experimentType: typeof input.experiment_type === "string" && input.experiment_type.trim() ? input.experiment_type : draft.experimentType,
          properties: mergedProperties,
        },
      };
    }
    case "validate_experiment_properties": {
      const template = findTemplate(input.template_id);
      const properties = asProperties(input.properties);
      const missingRequiredFields = requiredPaths(template).filter((path) => {
        const value = getProperty(properties, path);
        return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
      });
      const constraints = validateProperties(properties, template);
      return { valid: constraints.passed && missingRequiredFields.length === 0, missingRequiredFields, ...constraints };
    }
    case "build_experiment_rag_chunks": {
      const template = input.template_id === undefined ? undefined : findTemplate(input.template_id);
      const experiment = normalizeExperiment(object(input.experiment, "experiment") as Partial<ExperimentDoc>);
      return { chunks: splitExperimentIntoChunks(experiment, template ?? getTemplate(((experiment.properties._meta as JsonObject | undefined)?.templateId as string) || "")) };
    }
    case "build_experiment_graph": {
      if (!Array.isArray(input.experiments)) throw new Error("experiments must be an array");
      const experiments = input.experiments.map((experiment, index) => normalizeExperiment(object(experiment, `experiments[${index}]`) as Partial<ExperimentDoc>));
      return buildGraphData(experiments);
    }
    case "apply_experiment_property_patches": {
      const experiment = normalizeExperiment(object(input.experiment, "experiment") as Partial<ExperimentDoc>);
      return { saved: false, experiment: { ...experiment, properties: applyPropertyPatches(experiment.properties, input.property_patches) } };
    }
    case "parse_experiment_content": {
      const content = stringValue(input.content, "content");
      if (content.length > 12000) throw new Error("content must not exceed 12000 characters");
      const fileName = stringValue(input.file_name, "file_name");
      const template = findTemplate(input.template_id);
      const scan = scanSensitivity(content);
      const sanitizedContent = scan.hasSensitive
        ? applySanitization(content, scan.matches).sanitized
        : content;
      const { parseCSV, parseTextFile } = await import("./deepseek");
      const rawOutput = input.mode === "csv"
        ? await parseCSV(sanitizedContent, fileName, template)
        : await parseTextFile(sanitizedContent, fileName, template);
      const experiments = parseAPIResponse(rawOutput, fileName, template)
        .map((item) => normalizeExperiment(item, { properties: { _meta: { templateId: template.id, templateVersion: template.version } } }));
      return {
        saved: false,
        templateId: template.id,
        sanitized: scan.hasSensitive,
        sensitivitySummary: scan.hasSensitive ? scan.summary : undefined,
        rawOutput,
        experiments,
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
