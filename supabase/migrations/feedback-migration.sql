-- ============================================================
-- LabNote Agent — 反馈闭环 Migration
-- 运行方式: Supabase SQL Editor → New Query → 粘贴全部 → Run
-- 作用: 创建 rag_feedback 表，收集 👍👎 反馈用于持续优化
-- 日期: 2026-06-28
-- ============================================================

CREATE TABLE IF NOT EXISTS rag_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rag_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can insert own feedback'
      AND tablename = 'rag_feedback'
  ) THEN
    EXECUTE format(
      'CREATE POLICY "Users can insert own feedback" ON rag_feedback FOR INSERT WITH CHECK (auth.uid() = user_id)'
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can view own feedback'
      AND tablename = 'rag_feedback'
  ) THEN
    EXECUTE format(
      'CREATE POLICY "Users can view own feedback" ON rag_feedback FOR SELECT USING (auth.uid() = user_id)'
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_feedback_user ON rag_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON rag_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON rag_feedback(created_at);
