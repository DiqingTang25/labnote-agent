-- ============================================================
-- LabNote Agent — 团队模式补丁：成果/项目/公告仅管理员可写
-- 运行方式: Supabase SQL Editor → New Query → 粘贴全部 → Run
-- 日期: 2026-08-16
-- 变更: team_achievements / team_projects / team_announcements
--       查看=全成员；新增/修改/删除=仅 owner/admin
-- ============================================================

-- 成果墙
DROP POLICY IF EXISTS ta_insert ON team_achievements;
CREATE POLICY ta_insert ON team_achievements FOR INSERT WITH CHECK (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
DROP POLICY IF EXISTS ta_update ON team_achievements;
CREATE POLICY ta_update ON team_achievements FOR UPDATE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
DROP POLICY IF EXISTS ta_delete ON team_achievements;
CREATE POLICY ta_delete ON team_achievements FOR DELETE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);

-- 科研项目
DROP POLICY IF EXISTS tp_insert ON team_projects;
CREATE POLICY tp_insert ON team_projects FOR INSERT WITH CHECK (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
DROP POLICY IF EXISTS tp_update ON team_projects;
CREATE POLICY tp_update ON team_projects FOR UPDATE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
DROP POLICY IF EXISTS tp_delete ON team_projects;
CREATE POLICY tp_delete ON team_projects FOR DELETE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);

-- 公告
DROP POLICY IF EXISTS tn_insert ON team_announcements;
CREATE POLICY tn_insert ON team_announcements FOR INSERT WITH CHECK (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
DROP POLICY IF EXISTS tn_update ON team_announcements;
CREATE POLICY tn_update ON team_announcements FOR UPDATE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
DROP POLICY IF EXISTS tn_delete ON team_announcements;
CREATE POLICY tn_delete ON team_announcements FOR DELETE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);

-- ═══════════════════════════════════════════════════════
-- 附：hybrid_search_experiments 加团队过滤参数（团队问答混合搜索）
-- ═══════════════════════════════════════════════════════
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
