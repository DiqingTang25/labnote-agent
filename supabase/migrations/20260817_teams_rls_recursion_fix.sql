-- ============================================================
-- LabNote Agent — 团队 RLS 无限递归修复
-- 运行方式: Supabase SQL Editor → New Query → 粘贴全部 → Run
-- 日期: 2026-08-17
-- ============================================================
-- 背景（E2E 实测确认）：
-- 20260816_teams.sql 的策略在 team_members 表上自引用（tm_select 的
-- EXISTS 子查询再次查询 team_members），Postgres 对策略内子查询会
-- 再次应用 RLS → 42P17 infinite recursion。所有引用 team_members 的
-- 策略（teams/invites/成果/项目/公告/experiments/relations/chunks/
-- templates）全部连带失效，团队功能在用户上下文完全不可用
-- （service_role 绕过 RLS，所以管理员探测看不出来）。
--
-- 修复方案：SECURITY DEFINER 辅助函数（owner 为 postgres，内部查询
-- 绕过 RLS，无递归），所有策略改为调用函数。
-- ============================================================

-- 1. 辅助函数：成员 / 管理员 / 创建者 判定
CREATE OR REPLACE FUNCTION public.is_team_member(target_team UUID, target_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = target_team AND tm.user_id = target_user
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_admin(target_team UUID, target_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = target_team AND tm.user_id = target_user
      AND tm.role IN ('owner','admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner(target_team UUID, target_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = target_team AND tm.user_id = target_user
      AND tm.role = 'owner'
  );
$$;

-- 2. teams（成员可见 / 管理员改 / 创建者删）
DROP POLICY IF EXISTS teams_select ON teams;
CREATE POLICY teams_select ON teams FOR SELECT USING (
  public.is_team_member(teams.id, auth.uid())
);
DROP POLICY IF EXISTS teams_update ON teams;
CREATE POLICY teams_update ON teams FOR UPDATE USING (
  public.is_team_admin(teams.id, auth.uid())
);
DROP POLICY IF EXISTS teams_delete ON teams;
CREATE POLICY teams_delete ON teams FOR DELETE USING (
  public.is_team_owner(teams.id, auth.uid())
);

-- 3. team_members（成员可见本团队名单；管理员管理）
DROP POLICY IF EXISTS tm_select ON team_members;
CREATE POLICY tm_select ON team_members FOR SELECT USING (
  public.is_team_member(team_members.team_id, auth.uid())
);
DROP POLICY IF EXISTS tm_insert ON team_members;
CREATE POLICY tm_insert ON team_members FOR INSERT WITH CHECK (
  public.is_team_admin(team_members.team_id, auth.uid())
);
DROP POLICY IF EXISTS tm_update ON team_members;
CREATE POLICY tm_update ON team_members FOR UPDATE USING (
  public.is_team_admin(team_members.team_id, auth.uid())
);
DROP POLICY IF EXISTS tm_delete ON team_members;
CREATE POLICY tm_delete ON team_members FOR DELETE USING (
  public.is_team_admin(team_members.team_id, auth.uid())
);

-- 4. team_invites（管理员生成/删除；成员可见）
DROP POLICY IF EXISTS ti_select ON team_invites;
CREATE POLICY ti_select ON team_invites FOR SELECT USING (
  public.is_team_member(team_invites.team_id, auth.uid())
);
DROP POLICY IF EXISTS ti_insert ON team_invites;
CREATE POLICY ti_insert ON team_invites FOR INSERT WITH CHECK (
  public.is_team_admin(team_invites.team_id, auth.uid())
);
DROP POLICY IF EXISTS ti_delete ON team_invites;
CREATE POLICY ti_delete ON team_invites FOR DELETE USING (
  public.is_team_admin(team_invites.team_id, auth.uid())
);

-- 5. 成果墙（查看=全成员；写=管理员）
DROP POLICY IF EXISTS ta_select ON team_achievements;
CREATE POLICY ta_select ON team_achievements FOR SELECT USING (
  public.is_team_member(team_achievements.team_id, auth.uid())
);
DROP POLICY IF EXISTS ta_insert ON team_achievements;
CREATE POLICY ta_insert ON team_achievements FOR INSERT WITH CHECK (
  public.is_team_admin(team_achievements.team_id, auth.uid())
);
DROP POLICY IF EXISTS ta_update ON team_achievements;
CREATE POLICY ta_update ON team_achievements FOR UPDATE USING (
  public.is_team_admin(team_achievements.team_id, auth.uid())
);
DROP POLICY IF EXISTS ta_delete ON team_achievements;
CREATE POLICY ta_delete ON team_achievements FOR DELETE USING (
  public.is_team_admin(team_achievements.team_id, auth.uid())
);

-- 6. 科研项目
DROP POLICY IF EXISTS tp_select ON team_projects;
CREATE POLICY tp_select ON team_projects FOR SELECT USING (
  public.is_team_member(team_projects.team_id, auth.uid())
);
DROP POLICY IF EXISTS tp_insert ON team_projects;
CREATE POLICY tp_insert ON team_projects FOR INSERT WITH CHECK (
  public.is_team_admin(team_projects.team_id, auth.uid())
);
DROP POLICY IF EXISTS tp_update ON team_projects;
CREATE POLICY tp_update ON team_projects FOR UPDATE USING (
  public.is_team_admin(team_projects.team_id, auth.uid())
);
DROP POLICY IF EXISTS tp_delete ON team_projects;
CREATE POLICY tp_delete ON team_projects FOR DELETE USING (
  public.is_team_admin(team_projects.team_id, auth.uid())
);

-- 7. 公告
DROP POLICY IF EXISTS tn_select ON team_announcements;
CREATE POLICY tn_select ON team_announcements FOR SELECT USING (
  public.is_team_member(team_announcements.team_id, auth.uid())
);
DROP POLICY IF EXISTS tn_insert ON team_announcements;
CREATE POLICY tn_insert ON team_announcements FOR INSERT WITH CHECK (
  public.is_team_admin(team_announcements.team_id, auth.uid())
);
DROP POLICY IF EXISTS tn_update ON team_announcements;
CREATE POLICY tn_update ON team_announcements FOR UPDATE USING (
  public.is_team_admin(team_announcements.team_id, auth.uid())
);
DROP POLICY IF EXISTS tn_delete ON team_announcements;
CREATE POLICY tn_delete ON team_announcements FOR DELETE USING (
  public.is_team_admin(team_announcements.team_id, auth.uid())
);

-- 8. experiments 团队策略（叠加在 experiments_user_isolation 之上）
DROP POLICY IF EXISTS experiments_team_select ON experiments;
CREATE POLICY experiments_team_select ON experiments FOR SELECT USING (
  team_id IS NOT NULL AND public.is_team_member(team_id, auth.uid())
);
DROP POLICY IF EXISTS experiments_team_update ON experiments;
CREATE POLICY experiments_team_update ON experiments FOR UPDATE USING (
  team_id IS NOT NULL AND public.is_team_admin(team_id, auth.uid())
);
DROP POLICY IF EXISTS experiments_team_delete ON experiments;
CREATE POLICY experiments_team_delete ON experiments FOR DELETE USING (
  team_id IS NOT NULL AND public.is_team_admin(team_id, auth.uid())
);

-- 9. experiment_relations：团队内可见
DROP POLICY IF EXISTS er_team_select ON experiment_relations;
CREATE POLICY er_team_select ON experiment_relations FOR SELECT USING (
  (
    source_exp_id IN (SELECT id FROM experiments WHERE user_id = auth.uid())
    OR source_exp_id IN (
      SELECT e.id FROM experiments e
      WHERE e.team_id IS NOT NULL AND public.is_team_member(e.team_id, auth.uid())
    )
  )
  AND
  (
    target_exp_id IN (SELECT id FROM experiments WHERE user_id = auth.uid())
    OR target_exp_id IN (
      SELECT e.id FROM experiments e
      WHERE e.team_id IS NOT NULL AND public.is_team_member(e.team_id, auth.uid())
    )
  )
);

-- 10. experiment_chunks：团队内可读
DROP POLICY IF EXISTS chunks_team_select ON experiment_chunks;
CREATE POLICY chunks_team_select ON experiment_chunks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM experiments e
    WHERE e.id = experiment_chunks.experiment_id
      AND e.team_id IS NOT NULL
      AND public.is_team_member(e.team_id, auth.uid())
  )
);

-- 11. templates：团队模板读/写
DROP POLICY IF EXISTS templates_read ON templates;
CREATE POLICY templates_read ON templates FOR SELECT USING (
  auth.role() = 'authenticated'
  AND (
    team_id IS NULL
    OR public.is_team_member(team_id, auth.uid())
  )
);
DROP POLICY IF EXISTS templates_team_admin ON templates;
CREATE POLICY templates_team_admin ON templates
  FOR ALL
  USING (
    team_id IS NOT NULL AND public.is_team_admin(team_id, auth.uid())
  )
  WITH CHECK (
    team_id IS NOT NULL AND public.is_team_admin(team_id, auth.uid())
  );

-- ═══════════════════════════════════════════════════════
-- 12. 验证（选中以下部分再 Run 一次）
-- ═══════════════════════════════════════════════════════
-- 12a. 策略清单应全部存在且引用辅助函数（不再有 FROM team_members 子查询）
SELECT tablename, policyname, cmd, qual IS NOT NULL AS has_using, with_check IS NOT NULL AS has_check
FROM pg_policies
WHERE tablename IN (
  'teams','team_members','team_invites','team_achievements',
  'team_projects','team_announcements','experiments','templates',
  'experiment_chunks','experiment_relations'
)
ORDER BY tablename, policyname, cmd;

-- 12b. 辅助函数应返回 t（用任意存在团队测试；无团队时先建一个）
SELECT public.is_team_member(
  (SELECT id FROM teams LIMIT 1),
  (SELECT user_id FROM team_members LIMIT 1)
) AS member_check;
