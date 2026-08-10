-- ==============================
-- P0-Step 2/3: 建新表 + 删旧数据列
-- 前提：Step1 回填完成，已验证 properties 有数据
-- ==============================

-- 1. field_patterns 表
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
CREATE INDEX IF NOT EXISTS idx_field_patterns_type ON field_patterns(experiment_type);
ALTER TABLE field_patterns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS field_patterns_read ON field_patterns;
CREATE POLICY field_patterns_read ON field_patterns FOR SELECT USING (auth.role() = 'authenticated');

-- 2. templates 表
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
CREATE INDEX IF NOT EXISTS idx_templates_experiment_type ON templates(experiment_type);
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS templates_read ON templates;
CREATE POLICY templates_read ON templates FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS templates_insert ON templates;
CREATE POLICY templates_insert ON templates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS templates_update ON templates;
CREATE POLICY templates_update ON templates FOR UPDATE USING (auth.uid() = created_by OR is_preset = false) WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS templates_delete ON templates;
CREATE POLICY templates_delete ON templates FOR DELETE USING (auth.uid() = created_by AND is_preset = false);

-- 3. 删旧数据列（IF EXISTS 保证幂等）
ALTER TABLE experiments DROP COLUMN IF EXISTS purpose;
ALTER TABLE experiments DROP COLUMN IF EXISTS background;
ALTER TABLE experiments DROP COLUMN IF EXISTS discipline;
ALTER TABLE experiments DROP COLUMN IF EXISTS device_name;
ALTER TABLE experiments DROP COLUMN IF EXISTS device_model;
ALTER TABLE experiments DROP COLUMN IF EXISTS device_vendor;
ALTER TABLE experiments DROP COLUMN IF EXISTS sample_id;
ALTER TABLE experiments DROP COLUMN IF EXISTS sample_batch;
ALTER TABLE experiments DROP COLUMN IF EXISTS sample_source;
ALTER TABLE experiments DROP COLUMN IF EXISTS params;
ALTER TABLE experiments DROP COLUMN IF EXISTS environment;
ALTER TABLE experiments DROP COLUMN IF EXISTS steps;
ALTER TABLE experiments DROP COLUMN IF EXISTS results;
ALTER TABLE experiments DROP COLUMN IF EXISTS notes;
ALTER TABLE experiments DROP COLUMN IF EXISTS attached_files;
ALTER TABLE experiments DROP COLUMN IF EXISTS ai_insights;
ALTER TABLE experiments DROP COLUMN IF EXISTS last_parsed_at;

-- 4. 验证：列出剩余列
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'experiments' ORDER BY ordinal_position;
