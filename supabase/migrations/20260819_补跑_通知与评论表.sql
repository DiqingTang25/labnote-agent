-- ============================================================
-- 补跑：通知表 + 实验评论表（团队协作升级中未执行的部分）
-- 运行方式: Supabase SQL Editor → 粘贴全部 → Run（幂等，可重复执行）
-- ============================================================

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

CREATE TABLE IF NOT EXISTS experiment_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_experiment ON experiment_comments(experiment_id, created_at);
ALTER TABLE experiment_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY cmt_select ON experiment_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM experiments e
    WHERE e.id = experiment_comments.experiment_id
      AND (e.user_id = auth.uid() OR (e.team_id IS NOT NULL AND public.is_team_member(e.team_id, auth.uid())))
  )
);
CREATE POLICY cmt_insert ON experiment_comments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM experiments e
    WHERE e.id = experiment_comments.experiment_id
      AND (e.user_id = auth.uid() OR (e.team_id IS NOT NULL AND public.is_team_member(e.team_id, auth.uid())))
  )
);
CREATE POLICY cmt_delete ON experiment_comments FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM experiments e
    WHERE e.id = experiment_comments.experiment_id
      AND e.team_id IS NOT NULL AND public.is_team_admin(e.team_id, auth.uid())
  )
);
