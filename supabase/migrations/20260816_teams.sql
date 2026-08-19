-- ============================================================
-- LabNote Agent — 团队模式（课题组/实验室协作）v2
-- 运行方式: Supabase SQL Editor → New Query → 粘贴全部 → Run
-- 日期: 2026-08-16
-- 设计依据: 教育部重点实验室网站规范(教技司[2015]155号) + 高校团队主页平台惯例
-- 信息板块: 概况/成员身份/科研成果(论文·专利·获奖·会议)/科研项目(进行·结项)/通知公告
-- 权限: 全员可看团队资产；编辑自己的；管理员管全部；删除限管理员
-- ============================================================

-- 1. 团队表（概况：简介、机构、挂靠学院、学科、研究方向、官网、联系方式）
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  institution TEXT,
  department TEXT,
  discipline TEXT,
  research_areas TEXT[] NOT NULL DEFAULT '{}',
  intro TEXT,
  homepage TEXT,
  contact_email TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 团队成员表（owner 创建者 / admin 管理员 / member 成员；身份：PI/博士后/博士生…）
CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  role_title TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- 3. 团队邀请码表（7 天有效）
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 科研成果表（论文 / 专利 / 获奖 / 会议，统一结构化，可排序筛选）
CREATE TABLE IF NOT EXISTS team_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('publication','patent','award','conference')),
  title TEXT NOT NULL,
  venue TEXT,
  detail TEXT,
  year INT,
  link TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 科研项目表（正在进行的任务 / 已结项的任务）
CREATE TABLE IF NOT EXISTS team_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing','completed')),
  funding_source TEXT,
  grant_no TEXT,
  lead_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TEXT,
  ended_at TEXT,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. 团队公告表（近期发展 / 通知 / 组会）
CREATE TABLE IF NOT EXISTS team_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. experiments 加 team_id（NULL = 个人资产）
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_experiments_team_id ON experiments(team_id);

-- 8. teams RLS（仅成员可见；管理员可改；创建者可删）
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY teams_select ON teams FOR SELECT USING (
  EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = teams.id AND tm.user_id = auth.uid())
);
CREATE POLICY teams_update ON teams FOR UPDATE USING (
  EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = teams.id AND tm.user_id = auth.uid() AND tm.role IN ('owner','admin'))
);
CREATE POLICY teams_delete ON teams FOR DELETE USING (
  EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = teams.id AND tm.user_id = auth.uid() AND tm.role = 'owner')
);

-- 9. team_members RLS（成员可见本团队名单；管理员管理成员）
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY tm_select ON team_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM team_members mine WHERE mine.team_id = team_members.team_id AND mine.user_id = auth.uid())
);
CREATE POLICY tm_insert ON team_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM team_members mine WHERE mine.team_id = team_members.team_id AND mine.user_id = auth.uid() AND mine.role IN ('owner','admin'))
);
CREATE POLICY tm_update ON team_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM team_members mine WHERE mine.team_id = team_members.team_id AND mine.user_id = auth.uid() AND mine.role IN ('owner','admin'))
);
CREATE POLICY tm_delete ON team_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM team_members mine WHERE mine.team_id = team_members.team_id AND mine.user_id = auth.uid() AND mine.role IN ('owner','admin'))
);

-- 10. team_invites RLS（管理员生成/删除；成员可见）
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY ti_select ON team_invites FOR SELECT USING (
  EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_invites.team_id AND tm.user_id = auth.uid())
);
CREATE POLICY ti_insert ON team_invites FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_invites.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner','admin'))
);
CREATE POLICY ti_delete ON team_invites FOR DELETE USING (
  EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_invites.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner','admin'))
);

-- 11. 成果/项目/公告 RLS（查看=全成员；新增/修改/删除=仅 owner/admin）
ALTER TABLE team_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY ta_select ON team_achievements FOR SELECT USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY ta_insert ON team_achievements FOR INSERT WITH CHECK (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
CREATE POLICY ta_update ON team_achievements FOR UPDATE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
CREATE POLICY ta_delete ON team_achievements FOR DELETE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);

ALTER TABLE team_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY tp_select ON team_projects FOR SELECT USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY tp_insert ON team_projects FOR INSERT WITH CHECK (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
CREATE POLICY tp_update ON team_projects FOR UPDATE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
CREATE POLICY tp_delete ON team_projects FOR DELETE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);

ALTER TABLE team_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY tn_select ON team_announcements FOR SELECT USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);
CREATE POLICY tn_insert ON team_announcements FOR INSERT WITH CHECK (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
CREATE POLICY tn_update ON team_announcements FOR UPDATE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);
CREATE POLICY tn_delete ON team_announcements FOR DELETE USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
);

-- 12. experiments 团队策略（叠加在 experiments_user_isolation 之上）
CREATE POLICY experiments_team_select ON experiments FOR SELECT USING (
  team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.team_id = experiments.team_id AND tm.user_id = auth.uid()
  )
);
CREATE POLICY experiments_team_update ON experiments FOR UPDATE USING (
  team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.team_id = experiments.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner','admin')
  )
);
CREATE POLICY experiments_team_delete ON experiments FOR DELETE USING (
  team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.team_id = experiments.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner','admin')
  )
);

-- 13. experiment_relations：团队内可见（写入仍限本人原策略）
CREATE POLICY er_team_select ON experiment_relations FOR SELECT USING (
  (
    source_exp_id IN (SELECT id FROM experiments WHERE user_id = auth.uid())
    OR source_exp_id IN (
      SELECT e.id FROM experiments e
      WHERE e.team_id IS NOT NULL
        AND e.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  )
  AND
  (
    target_exp_id IN (SELECT id FROM experiments WHERE user_id = auth.uid())
    OR target_exp_id IN (
      SELECT e.id FROM experiments e
      WHERE e.team_id IS NOT NULL
        AND e.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  )
);

-- 14. experiment_chunks：团队内可读（写入仍限本人）
CREATE POLICY chunks_team_select ON experiment_chunks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM experiments e
    WHERE e.id = experiment_chunks.experiment_id
      AND e.team_id IS NOT NULL
      AND e.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  )
);

-- 15. 模板支持团队模板（team_id 为空 = 公共预置/个人模板）
ALTER TABLE templates ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_templates_team_id ON templates(team_id);

DROP POLICY IF EXISTS templates_read ON templates;
CREATE POLICY templates_read ON templates
  F ORSELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      team_id IS NULL
      OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY templates_team_admin ON templates
  FOR ALL
  USING (
    team_id IS NOT NULL
    AND team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  )
  WITH CHECK (
    team_id IS NOT NULL
    AND team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

-- 16. match_experiments 加团队过滤参数（团队问答：向量搜索团队范围）
CREATE OR REPLACE FUNCTION match_experiments(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL,
  filter_team_id UUID DEFAULT NULL,
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
    AND (filter_team_id IS NULL OR e.team_id = filter_team_id)
    AND (filter_tags IS NULL OR e.knowledge_tags && filter_tags)
    AND (filter_ids IS NULL OR e.id = ANY(filter_ids))
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 17. match_experiment_chunks 加团队过滤参数（团队问答：chunk 级向量搜索）
CREATE OR REPLACE FUNCTION match_experiment_chunks(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 10,
  filter_user_id UUID DEFAULT NULL,
  filter_team_id UUID DEFAULT NULL,
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
    AND (filter_team_id IS NULL OR e.team_id = filter_team_id)
    AND (filter_ids IS NULL OR ec.experiment_id = ANY(filter_ids))
  ORDER BY ec.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
