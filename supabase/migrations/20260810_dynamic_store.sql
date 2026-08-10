-- ============================================================
-- LabNote Agent — Dynamic Document Store Migration
-- Adds properties JSONB + files JSONB to experiments,
-- creates field_patterns + templates tables,
-- backfills existing data.
-- ============================================================

-- ═══════════════════════════════════════════════════════
-- 1. Add new columns to experiments
-- ═══════════════════════════════════════════════════════

ALTER TABLE experiments ADD COLUMN IF NOT EXISTS properties JSONB NOT NULL DEFAULT '{}';
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS files JSONB NOT NULL DEFAULT '[]';

-- GIN index for JSONB path queries
CREATE INDEX IF NOT EXISTS idx_experiments_properties_gin
  ON experiments USING GIN (properties jsonb_path_ops);

-- ═══════════════════════════════════════════════════════
-- 2. Backfill properties from legacy columns
-- ═══════════════════════════════════════════════════════

-- Helper: remove null values from a JSONB object
CREATE OR REPLACE FUNCTION jsonb_strip_nulls(obj JSONB) RETURNS JSONB AS $$
  SELECT COALESCE(
    jsonb_object_agg(key, value) FILTER (WHERE value IS NOT NULL AND value <> 'null'::jsonb),
    '{}'::jsonb
  )
  FROM jsonb_each(obj)
  WHERE obj IS NOT NULL
$$ LANGUAGE sql IMMUTABLE;

-- Helper: build empty object if all values are empty strings / null
CREATE OR REPLACE FUNCTION jsonb_strip_empty(obj JSONB) RETURNS JSONB AS $$
  SELECT jsonb_strip_nulls(
    (SELECT jsonb_object_agg(key,
      CASE WHEN value IS NOT NULL AND value <> '""'::jsonb AND value <> '""'::jsonb
           THEN value ELSE NULL END)
     FROM jsonb_each(obj))
  )
$$ LANGUAGE sql IMMUTABLE;

-- Backfill properties for all experiments that have empty properties
UPDATE experiments SET
  properties = COALESCE(
    NULLIF(properties, '{}'::jsonb),
    jsonb_strip_empty(jsonb_build_object(
      '_meta', jsonb_build_object('templateId', 'tpl_generic', 'templateVersion', 1, 'migratedFrom', 'legacy_columns'),

      -- Meta group
      'purpose', COALESCE(to_jsonb(purpose), '""'::jsonb),
      'hypothesis', COALESCE(to_jsonb(hypothesis), '""'::jsonb),
      'background', COALESCE(to_jsonb(background), '""'::jsonb),
      'conclusion', COALESCE(to_jsonb(conclusion), '""'::jsonb),
      'discipline', COALESCE(to_jsonb(discipline), '""'::jsonb),
      'supervisor', COALESCE(to_jsonb(supervisor), '""'::jsonb),
      'projectId', COALESCE(to_jsonb(project_id), '""'::jsonb),

      -- Equipment group
      'device', jsonb_strip_empty(jsonb_build_object(
        'name', COALESCE(to_jsonb(device_name), '""'::jsonb),
        'model', COALESCE(to_jsonb(device_model), '""'::jsonb),
        'vendor', COALESCE(to_jsonb(device_vendor), '""'::jsonb)
      )),
      'instruments', COALESCE(instruments, '[]'::jsonb),

      -- Materials group
      'materials', COALESCE(materials, '[]'::jsonb),
      'sample', jsonb_strip_empty(jsonb_build_object(
        'id', COALESCE(to_jsonb(sample_id), '""'::jsonb),
        'batch', COALESCE(to_jsonb(sample_batch), '""'::jsonb),
        'source', COALESCE(to_jsonb(sample_source), '""'::jsonb),
        'preparationDate', COALESCE(to_jsonb(sample_preparation_date), '""'::jsonb),
        'parentSampleId', COALESCE(to_jsonb(sample_parent_id), '""'::jsonb)
      )),

      -- Params group
      'params', COALESCE(params, '[]'::jsonb),
      'environment', COALESCE(environment, '{}'::jsonb),
      'steps', COALESCE(steps, '[]'::jsonb),

      -- Protocol group
      'protocol', COALESCE(protocol, '{}'::jsonb),

      -- Results group
      'observations', COALESCE(observations, '[]'::jsonb),
      'results', COALESCE(to_jsonb(results), '""'::jsonb),
      'notes', COALESCE(to_jsonb(notes), '""'::jsonb),
      'aiInsights', COALESCE(to_jsonb(ai_insights), '""'::jsonb),

      -- QC group
      'replicates', COALESCE(to_jsonb(replicates), '1'::jsonb),
      'qcStatus', COALESCE(to_jsonb(qc_status), '"na"'::jsonb),
      'controls', COALESCE(controls, '[]'::jsonb),

      -- FAIR group
      'license', COALESCE(to_jsonb(license), '"CC BY-NC 4.0"'::jsonb),
      'ontologyTerms', COALESCE(ontology_terms, '[]'::jsonb),
      'derivedFrom', COALESCE(derived_from, '[]'::jsonb),

      -- Integrity group
      'auditTrail', COALESCE(audit_trail, '[]'::jsonb),
      'signatures', COALESCE(signatures, '[]'::jsonb),

      -- Source
      'source', COALESCE(to_jsonb(source), '""'::jsonb)
    ))
  )
WHERE properties = '{}'::jsonb;

-- Backfill files from attached_files
UPDATE experiments SET
  files = COALESCE(attached_files, '[]'::jsonb)
WHERE files = '[]'::jsonb AND attached_files IS NOT NULL;

-- ═══════════════════════════════════════════════════════
-- 3. field_patterns table
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS field_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_type TEXT NOT NULL,
  field_path TEXT NOT NULL,
  occurrence_count INT NOT NULL DEFAULT 1,
  occurrence_rate FLOAT NOT NULL DEFAULT 0.0,
  value_type TEXT NOT NULL DEFAULT 'string',
  value_stats JSONB NOT NULL DEFAULT '{}',
  co_occurring TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(experiment_type, field_path)
);

CREATE INDEX IF NOT EXISTS idx_field_patterns_type
  ON field_patterns(experiment_type);

-- RLS: authenticated users can read field_patterns (cross-user statistics), only service_role can write
ALTER TABLE field_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS field_patterns_read ON field_patterns;
CREATE POLICY field_patterns_read ON field_patterns
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════
-- 4. templates table
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  experiment_type TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT '',
  version INT NOT NULL DEFAULT 1,
  field_groups JSONB NOT NULL DEFAULT '[]',
  is_preset BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_experiment_type
  ON templates(experiment_type);

-- RLS: all authenticated can read templates; only owner can update/delete their non-preset templates
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS templates_read ON templates;
CREATE POLICY templates_read ON templates
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS templates_insert ON templates;
CREATE POLICY templates_insert ON templates
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS templates_update ON templates;
CREATE POLICY templates_update ON templates
  FOR UPDATE
  USING (auth.uid() = created_by OR is_preset = false)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS templates_delete ON templates;
CREATE POLICY templates_delete ON templates
  FOR DELETE
  USING (auth.uid() = created_by AND is_preset = false);

-- ═══════════════════════════════════════════════════════
-- 5. Relax experiment_chunks CHECK constraint (Phase 7 prep)
-- ═══════════════════════════════════════════════════════

-- Allow 'group' and 'extra' chunk types for dynamic field groups
ALTER TABLE experiment_chunks
  DROP CONSTRAINT IF EXISTS experiment_chunks_chunk_type_check;

ALTER TABLE experiment_chunks
  ADD CONSTRAINT experiment_chunks_chunk_type_check
  CHECK (chunk_type IN ('meta', 'purpose', 'device_sample', 'params_steps', 'results', 'group', 'extra'));

-- ═══════════════════════════════════════════════════════
-- 6. Verify
-- ═══════════════════════════════════════════════════════

-- Check: all experiments have properties
-- SELECT count(*) AS total, count(*) FILTER (WHERE properties::text <> '{}') AS with_props FROM experiments;
