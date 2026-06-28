-- ============================================================
-- LabNote Agent — 复现审计存档表
-- 在 Supabase SQL Editor 中运行（https://kwwjdrwcvgjbjxtewbnk.supabase.co）
-- ============================================================

-- 1. 创建 reproduction_audits 表
CREATE TABLE IF NOT EXISTS reproduction_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_title TEXT NOT NULL DEFAULT '',
  paper_source TEXT NOT NULL DEFAULT '',
  discipline TEXT NOT NULL DEFAULT '材料科学',
  parameters JSONB NOT NULL DEFAULT '[]',
  gaps JSONB NOT NULL DEFAULT '[]',
  reproducibility_score INT NOT NULL DEFAULT 0,
  score_breakdown TEXT NOT NULL DEFAULT '',
  ai_assessment TEXT NOT NULL DEFAULT '',
  critical_risks TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 索引
CREATE INDEX IF NOT EXISTS idx_audits_user_id ON reproduction_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON reproduction_audits(created_at DESC);

-- 3. 更新时间触发器
CREATE OR REPLACE FUNCTION update_audit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_updated_at ON reproduction_audits;
CREATE TRIGGER trg_audit_updated_at
  BEFORE UPDATE ON reproduction_audits
  FOR EACH ROW EXECUTE FUNCTION update_audit_updated_at();

-- 4. Row Level Security
ALTER TABLE reproduction_audits ENABLE ROW LEVEL SECURITY;

-- 先删除可能存在的旧策略，再创建新的
DROP POLICY IF EXISTS audits_user_isolation ON reproduction_audits;
CREATE POLICY audits_user_isolation ON reproduction_audits
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
