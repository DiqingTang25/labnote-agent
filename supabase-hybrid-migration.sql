-- ============================================================
-- LabNote Agent — P2-2 混合检索 Migration
-- 运行方式: Supabase SQL Editor → New Query → 粘贴全部 → Run
-- 作用: 添加 search_text 列 + GIN 全文索引，支持 BM25+向量混合检索
-- 日期: 2026-06-28
-- ============================================================

-- 1. 添加 search_text 列
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS search_text TEXT;

-- 2. GIN 全文索引（simple 配置支持中英文混合）
CREATE INDEX IF NOT EXISTS idx_experiments_search_text
  ON experiments USING GIN(to_tsvector('simple', COALESCE(search_text, '')));

-- 3. 回填已有实验的 search_text
UPDATE experiments
SET search_text =
  COALESCE(name, '') || ' ' ||
  COALESCE(purpose, '') || ' ' ||
  COALESCE(results, '') || ' ' ||
  COALESCE(notes, '') || ' ' ||
  COALESCE(device_name, '') || ' ' ||
  COALESCE(device_model, '') || ' ' ||
  COALESCE(sample_id, '') || ' ' ||
  COALESCE(operator, '') || ' ' ||
  COALESCE(discipline, '')
WHERE search_text IS NULL;

-- 4. 混合搜索 RPC
CREATE OR REPLACE FUNCTION hybrid_search_experiments(
  query_text TEXT,
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  semantic_weight FLOAT DEFAULT 0.7,
  keyword_weight FLOAT DEFAULT 0.3,
  filter_user_id UUID DEFAULT NULL,
  filter_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  similarity FLOAT,
  keyword_score FLOAT,
  hybrid_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    CASE
      WHEN e.embedding IS NOT NULL
      THEN 1 - (e.embedding <=> query_embedding)
      ELSE 0
    END AS similarity,
    COALESCE(
      ts_rank(
        to_tsvector('simple', COALESCE(e.search_text, '')),
        plainto_tsquery('simple', query_text)
      ),
      0
    ) AS keyword_score,
    -- 混合分数 = 语义权重 * 语义相似度 + 关键词权重 * 关键词分数
    (
      semantic_weight * CASE WHEN e.embedding IS NOT NULL THEN 1 - (e.embedding <=> query_embedding) ELSE 0 END
      +
      keyword_weight * COALESCE(
        ts_rank(
          to_tsvector('simple', COALESCE(e.search_text, '')),
          plainto_tsquery('simple', query_text)
        ),
        0
      )
    ) AS hybrid_score
  FROM experiments e
  WHERE (filter_user_id IS NULL OR e.user_id = filter_user_id)
    AND (filter_ids IS NULL OR e.id = ANY(filter_ids))
    -- 至少语义或关键词有一个匹配
    AND (
      (e.embedding IS NOT NULL AND 1 - (e.embedding <=> query_embedding) > match_threshold)
      OR
      (e.search_text IS NOT NULL AND to_tsvector('simple', e.search_text) @@ plainto_tsquery('simple', query_text))
    )
  ORDER BY hybrid_score DESC
  LIMIT match_count;
END;
$$;
