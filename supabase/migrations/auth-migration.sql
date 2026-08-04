-- ============================================================
-- LabNote Agent Auth 迁移脚本
-- 在 Supabase SQL Editor 中运行
-- ============================================================

-- 1. 向 experiments 添加 user_id 列
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_experiments_user_id ON experiments(user_id);

-- 2. 向 profiles 添加 user_id 列
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- 3. 更新 match_experiments 函数，添加 user_id 过滤参数
CREATE OR REPLACE FUNCTION match_experiments(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM experiments e
  WHERE e.embedding IS NOT NULL
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
    AND (filter_user_id IS NULL OR e.user_id = filter_user_id)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. 启用 Row Level Security
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. RLS 策略 — 用户只能访问自己的数据
-- 注意：使用 service_role key 的服务端函数绕过 RLS，不受此限制
CREATE POLICY experiments_user_isolation ON experiments
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY profiles_user_isolation ON profiles
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. 允许匿名读取 user_id 为 NULL 的历史数据（迁移前）
-- 迁移完成后可删除此策略
CREATE POLICY experiments_anonymous_read ON experiments
  FOR SELECT
  USING (user_id IS NULL);
