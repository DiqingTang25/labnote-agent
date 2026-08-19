-- ============================================================
-- LabNote Agent — RAG 函数重载清理 + hybrid 类型修复
-- 运行方式: Supabase SQL Editor → New Query → 粘贴全部 → Run
-- 日期: 2026-08-17
-- ============================================================
-- 背景（已通过 API 实测确认）：
-- 1. 20260816_teams.sql 用 CREATE OR REPLACE 修改了三个 RAG 函数的
--    参数签名。Postgres 里不同签名 = 不同函数（重载），旧函数没被替换，
--    导致同名函数同时存在多个版本：
--      match_experiments            → 4参(旧) + 6参(旧) + 7参(新) 并存
--      match_experiment_chunks      → 5参(旧) + 6参(新) 并存
--      hybrid_search_experiments    → 8参(旧) + 9参(新) 并存
--    按旧参数调用时 PostgREST 无法选函数 → PGRST203 歧义错误
--    → 线上 RAG 向量搜索（chunk 级 + 混合）自 teams.sql 执行后即失效，
--      只剩关键词兜底在工作
-- 2. hybrid_search_experiments 的 keyword_score 表达式是
--    COALESCE(ts_rank(...), 0)，ts_rank 返回 real，与 RETURNS TABLE
--    声明的 FLOAT 不符 → 42804 运行时错误 → 即使消除歧义也会失败
-- ============================================================

-- 1. 删除旧签名重载（最新签名是 teams.sql 版，已实测可用）
DROP FUNCTION IF EXISTS match_experiments(VECTOR, FLOAT, INT, UUID);
DROP FUNCTION IF EXISTS match_experiments(VECTOR, FLOAT, INT, UUID, TEXT[]);
DROP FUNCTION IF EXISTS match_experiments(VECTOR, FLOAT, INT, UUID, TEXT[], TEXT[]);
DROP FUNCTION IF EXISTS match_experiment_chunks(VECTOR, FLOAT, INT, UUID, TEXT[]);
DROP FUNCTION IF EXISTS hybrid_search_experiments(TEXT, VECTOR, FLOAT, INT, FLOAT, FLOAT, UUID, TEXT[]);

-- 2. 重建 hybrid_search_experiments（显式 ::FLOAT 修复 42804）
CREATE OR REPLACE FUNCTION hybrid_search_experiments(
  query_text TEXT,
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  semantic_weight FLOAT DEFAULT 0.7,
  keyword_weight FLOAT DEFAULT 0.3,
  filter_user_id UUID DEFAULT NULL,
  filter_team_id UUID DEFAULT NULL,
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
    (
      CASE
        WHEN e.embedding IS NOT NULL
        THEN 1 - (e.embedding <=> query_embedding)
        ELSE 0
      END
    )::FLOAT AS similarity,
    COALESCE(
      ts_rank(
        to_tsvector('simple', COALESCE(e.search_text, '')),
        plainto_tsquery('simple', query_text)
      ),
      0
    )::FLOAT AS keyword_score,
    (
      semantic_weight * (
        CASE WHEN e.embedding IS NOT NULL
        THEN 1 - (e.embedding <=> query_embedding)
        ELSE 0 END
      )::FLOAT
      +
      keyword_weight * COALESCE(
        ts_rank(
          to_tsvector('simple', COALESCE(e.search_text, '')),
          plainto_tsquery('simple', query_text)
        ),
        0
      )::FLOAT
    ) AS hybrid_score
  FROM experiments e
  WHERE (filter_user_id IS NULL OR e.user_id = filter_user_id)
    AND (filter_team_id IS NULL OR e.team_id = filter_team_id)
    AND (filter_ids IS NULL OR e.id = ANY(filter_ids))
    AND (
      (e.embedding IS NOT NULL AND 1 - (e.embedding <=> query_embedding) > match_threshold)
      OR
      (e.search_text IS NOT NULL AND to_tsvector('simple', e.search_text) @@ plainto_tsquery('simple', query_text))
    )
  ORDER BY hybrid_score DESC
  LIMIT match_count;
END;
$$;

-- ═══════════════════════════════════════════════════════
-- 3. 验证（执行完上面的语句后，选中以下部分再 Run 一次）
-- ═══════════════════════════════════════════════════════
-- 3a. 确认每个 RPC 只剩一个签名（每个函数应该只出现 1 行）
SELECT proname, oid::regprocedure AS signature
FROM pg_proc
WHERE proname IN ('hybrid_search_experiments','match_experiments','match_experiment_chunks')
ORDER BY proname;

-- 3b. 确认团队表 RLS 策略齐全（admin_write 补丁是否已生效）
-- 期望：team_achievements / team_projects / team_announcements
-- 都有 select+insert+update+delete 四条策略；teams 有 3 条；
-- team_members 有 4 条；team_invites 有 3 条；experiments 含
-- experiments_team_* 三条；templates 含 templates_read + templates_team_admin
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN (
  'teams','team_members','team_invites','team_achievements',
  'team_projects','team_announcements','experiments','templates',
  'experiment_chunks','experiment_relations'
)
ORDER BY tablename, policyname, cmd;
