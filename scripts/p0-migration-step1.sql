-- ==============================
-- P0-Step 1/3: 加 properties + files + 回填（只填存在的列）
-- ==============================

ALTER TABLE experiments ADD COLUMN IF NOT EXISTS properties JSONB NOT NULL DEFAULT '{}';
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS files JSONB NOT NULL DEFAULT '[]';
CREATE INDEX IF NOT EXISTS idx_experiments_properties_gin ON experiments USING GIN (properties jsonb_path_ops);

-- 回填：只编组数据库中实际存在的列
UPDATE experiments SET
  properties = jsonb_strip_empty(jsonb_build_object(
    '_meta', jsonb_build_object('templateId', 'tpl_generic', 'templateVersion', 1),
    'purpose', to_jsonb(purpose),
    'background', to_jsonb(background),
    'discipline', to_jsonb(discipline),
    'device', jsonb_build_object('name', to_jsonb(device_name), 'model', to_jsonb(device_model), 'vendor', to_jsonb(device_vendor)),
    'sample', jsonb_build_object('id', to_jsonb(sample_id), 'batch', to_jsonb(sample_batch), 'source', to_jsonb(sample_source)),
    'params', coalesce(params, '[]'::jsonb),
    'environment', coalesce(environment, '{}'::jsonb),
    'steps', coalesce(steps, '[]'::jsonb),
    'results', to_jsonb(results),
    'notes', to_jsonb(notes),
    'aiInsights', to_jsonb(ai_insights)
  )),
  files = coalesce(attached_files, '[]'::jsonb)
WHERE properties = '{}'::jsonb;
