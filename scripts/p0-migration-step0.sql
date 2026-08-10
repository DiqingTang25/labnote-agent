-- ==============================
-- P0-Step 0/3: 创建辅助函数（先跑这个）
-- 此函数用于 Step1 回填时自动去除空值
-- ==============================

CREATE OR REPLACE FUNCTION jsonb_strip_empty(obj JSONB) RETURNS JSONB AS $$
  SELECT COALESCE(
    (SELECT jsonb_object_agg(key, value)
     FROM jsonb_each(obj)
     WHERE value IS NOT NULL
       AND value <> 'null'::jsonb
       AND value <> '""'::jsonb
       AND value <> '[]'::jsonb
       AND value <> '{}'::jsonb
    ),
    '{}'::jsonb
  )
$$ LANGUAGE sql IMMUTABLE;
