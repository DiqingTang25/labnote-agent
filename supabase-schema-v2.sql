-- ============================================================
-- LabNote Agent Schema v2 — 知识图谱 + 向量检索基础
-- 在 Supabase SQL Editor 中运行（https://kwwjdrwcvgjbjxtewbnk.supabase.co）
-- ============================================================

-- 1. 向 experiments 添加缺失列
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS ai_insights TEXT;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS last_parsed_at TIMESTAMPTZ;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS knowledge_tags TEXT[] DEFAULT '{}';

-- 2. 知识标签 GIN 索引（数组包含查询）
CREATE INDEX IF NOT EXISTS idx_experiments_knowledge_tags ON experiments USING GIN (knowledge_tags);

-- 3. pgvector HNSW 索引（加速 1024 维余弦相似度搜索 ~100x）
-- 需要 pgvector >= 0.5.0；如果报错则跳过，match_experiments 仍可用顺序扫描
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_experiments_embedding_hnsw ON experiments
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'HNSW index skipped: %', SQLERRM;
END $$;

-- 4. 实验关系表（知识图谱边）
CREATE TABLE IF NOT EXISTS experiment_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_exp_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  target_exp_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'sample_shared', 'device_shared', 'semantic_similar', 'temporal', 'operator_shared', 'custom'
  )),
  metadata JSONB DEFAULT '{}',
  similarity FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_exp_id, target_exp_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_er_source ON experiment_relations(source_exp_id);
CREATE INDEX IF NOT EXISTS idx_er_target ON experiment_relations(target_exp_id);
CREATE INDEX IF NOT EXISTS idx_er_type ON experiment_relations(relation_type);

-- 5. experiment_relations RLS
ALTER TABLE experiment_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY er_user_isolation ON experiment_relations
  FOR ALL
  USING (
    source_exp_id IN (SELECT id FROM experiments WHERE user_id = auth.uid())
    AND target_exp_id IN (SELECT id FROM experiments WHERE user_id = auth.uid())
  )
  WITH CHECK (
    source_exp_id IN (SELECT id FROM experiments WHERE user_id = auth.uid())
    AND target_exp_id IN (SELECT id FROM experiments WHERE user_id = auth.uid())
  );

-- 6. 更新 match_experiments 函数（加 filter_tags + knowledge_tags 输出）
CREATE OR REPLACE FUNCTION match_experiments(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL,
  filter_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  similarity FLOAT,
  knowledge_tags TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    1 - (e.embedding <=> query_embedding) AS similarity,
    e.knowledge_tags
  FROM experiments e
  WHERE e.embedding IS NOT NULL
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
    AND (filter_user_id IS NULL OR e.user_id = filter_user_id)
    AND (filter_tags IS NULL OR e.knowledge_tags && filter_tags)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 7. 删除匿名读取策略（所有实验现在都应有 user_id）
-- 如果已运行 auth migration 且有遗留 NULL user_id 的数据，先确认后再执行
-- DROP POLICY IF EXISTS experiments_anonymous_read ON experiments;
