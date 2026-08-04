-- ============================================================
-- LabNote Agent — P0 知识边界修复 Migration
-- 运行方式: Supabase SQL Editor → New Query → 粘贴全部 → Run
-- 作用: 为 match_experiments 函数添加 filter_ids 参数，
--       使 AIAgent 的卡片选择（全部/自选/单卡片）真正生效
-- 日期: 2026-06-28
-- ============================================================

-- 更新 match_experiments 函数（加 filter_ids 参数）
CREATE OR REPLACE FUNCTION match_experiments(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL,
  filter_tags TEXT[] DEFAULT NULL,
  filter_ids TEXT[] DEFAULT NULL
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
    AND (filter_ids IS NULL OR e.id = ANY(filter_ids))
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
