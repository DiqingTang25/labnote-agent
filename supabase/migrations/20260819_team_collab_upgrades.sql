-- ============================================================
-- LabNote Agent — 团队协作升级（2026-08-19）
-- 内容：① 通知系统 ② 实验评论 ③ 成员上传审核工作流 ④ 邀请记录
-- 运行方式: Supabase SQL Editor → 粘贴全部 → Run（幂等）
-- ============================================================

-- 1. 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'team',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY ntf_select ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY ntf_update ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY ntf_delete ON notifications FOR DELETE USING (user_id = auth.uid());

-- 2. 实验评论表
CREATE TABLE IF NOT EXISTS experiment_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_experiment ON experiment_comments(experiment_id, created_at);
ALTER TABLE experiment_comments ENABLE ROW LEVEL SECURITY;
-- 查看：能看实验就能看评论（个人=自己的；团队=成员）
CREATE POLICY cmt_select ON experiment_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM experiments e
    WHERE e.id = experiment_comments.experiment_id
      AND (e.user_id = auth.uid() OR (e.team_id IS NOT NULL AND public.is_team_member(e.team_id, auth.uid())))
  )
);
-- 发表：实验上传者本人或团队成员
CREATE POLICY cmt_insert ON experiment_comments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM experiments e
    WHERE e.id = experiment_comments.experiment_id
      AND (e.user_id = auth.uid() OR (e.team_id IS NOT NULL AND public.is_team_member(e.team_id, auth.uid())))
  )
);
-- 删除：自己的评论，或团队管理员
CREATE POLICY cmt_delete ON experiment_comments FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM experiments e
    WHERE e.id = experiment_comments.experiment_id
      AND e.team_id IS NOT NULL AND public.is_team_admin(e.team_id, auth.uid())
  )
);

-- 3. 审核工作流：experiments 加 approval_status
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved';
CREATE INDEX IF NOT EXISTS idx_experiments_approval ON experiments(team_id, approval_status);

-- 团队可见性策略重写：非管理员成员只看到已通过 + 自己上传的；管理员/创建者看到全部
DROP POLICY IF EXISTS experiments_team_select ON experiments;
CREATE POLICY experiments_team_select ON experiments FOR SELECT USING (
  team_id IS NOT NULL AND public.is_team_member(team_id, auth.uid())
  AND (
    approval_status = 'approved'
    OR user_id = auth.uid()
    OR public.is_team_admin(team_id, auth.uid())
  )
);
