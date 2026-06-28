-- ============================================================
-- LabNote Agent — P2-1 语义分块 Migration
-- 运行方式: Supabase SQL Editor → New Query → 粘贴全部 → Run
-- 作用: 创建 experiment_chunks 表，支持按语义字段精确检索
-- 日期: 2026-06-28
-- ============================================================

-- 1. 创建分块表
CREATE TABLE IF NOT EXISTS experiment_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  chunk_type TEXT NOT NULL CHECK (chunk_type IN (
    'meta', 'purpose', 'device_sample', 'params_steps', 'results'
  )),
  content TEXT NOT NULL,
  embedding VECTOR(1024),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS (与 experiments 表策略一致)
ALTER TABLE experiment_chunks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can view own experiment chunks'
      AND tablename = 'experiment_chunks'
  ) THEN
    EXECUTE format(
      'CREATE POLICY "Users can view own experiment chunks" ON experiment_chunks FOR SELECT USING (auth.uid() = user_id)'
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can insert own experiment chunks'
      AND tablename = 'experiment_chunks'
  ) THEN
    EXECUTE format(
      'CREATE POLICY "Users can insert own experiment chunks" ON experiment_chunks FOR INSERT WITH CHECK (auth.uid() = user_id)'
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can delete own experiment chunks'
      AND tablename = 'experiment_chunks'
  ) THEN
    EXECUTE format(
      'CREATE POLICY "Users can delete own experiment chunks" ON experiment_chunks FOR DELETE USING (auth.uid() = user_id)'
    );
  END IF;
END $$;

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_chunks_experiment ON experiment_chunks(experiment_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user ON experiment_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_type ON experiment_chunks(chunk_type);

-- 4. pgvector HNSW 索引（加速 1024 维余弦相似度搜索）
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw ON experiment_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'HNSW index for chunks skipped: %', SQLERRM;
END $$;

-- 5. match_experiment_chunks RPC — 在 chunks 表上做向量搜索
CREATE OR REPLACE FUNCTION match_experiment_chunks(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 10,
  filter_user_id UUID DEFAULT NULL,
  filter_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  experiment_id TEXT,
  experiment_name TEXT,
  chunk_type TEXT,
  chunk_content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.experiment_id,
    e.name AS experiment_name,
    ec.chunk_type,
    ec.content AS chunk_content,
    1 - (ec.embedding <=> query_embedding) AS similarity
  FROM experiment_chunks ec
  JOIN experiments e ON e.id = ec.experiment_id
  WHERE ec.embedding IS NOT NULL
    AND 1 - (ec.embedding <=> query_embedding) > match_threshold
    AND (filter_user_id IS NULL OR ec.user_id = filter_user_id)
    AND (filter_ids IS NULL OR ec.experiment_id = ANY(filter_ids))
  ORDER BY ec.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
