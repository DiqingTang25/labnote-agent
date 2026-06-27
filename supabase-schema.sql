-- ============================================================
-- LabNote Agent — Supabase 数据库 Schema
-- 在 Supabase SQL Editor 中运行此文件
-- ============================================================

-- 1. 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 实验卡片表
CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT,
  operator TEXT,
  purpose TEXT,
  background TEXT,
  discipline TEXT,
  device_name TEXT,
  device_model TEXT,
  device_vendor TEXT,
  sample_id TEXT,
  sample_batch TEXT,
  sample_source TEXT,
  params JSONB DEFAULT '[]',
  environment JSONB DEFAULT '{}',
  steps JSONB DEFAULT '[]',
  results TEXT,
  notes TEXT,
  source TEXT,
  attached_files JSONB DEFAULT '[]',
  embedding VECTOR(1024),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 用户配置表
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT,
  org TEXT,
  discipline TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. pgvector 相似度检索函数
CREATE OR REPLACE FUNCTION match_experiments(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 5
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
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_experiments_created_at ON experiments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_experiments_sample_id ON experiments(sample_id);
CREATE INDEX IF NOT EXISTS idx_experiments_device_name ON experiments(device_name);
