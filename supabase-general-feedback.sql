-- ============================================================
-- LabNote Agent — 通用用户反馈表
-- 在 Supabase SQL Editor 中运行
-- ============================================================

CREATE TABLE IF NOT EXISTS general_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE general_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY gf_user_insert ON general_feedback
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY gf_user_select ON general_feedback
  FOR SELECT
  USING (user_id = auth.uid());
