-- ============================================================
-- LabNote Agent — api_send_logs 审计日志表权限修复
-- 在 Supabase SQL Editor 中运行
-- 背景：表已存在但 anon/authenticated 角色无权限，
--       浏览器查询返回 404（usage-dashboard 审计日志不显示）
-- ============================================================

-- 1. 确保表存在（与 audit-log.ts insert 字段一致）
CREATE TABLE IF NOT EXISTS api_send_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_type TEXT NOT NULL DEFAULT '',
  target_api TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  sanitized BOOLEAN NOT NULL DEFAULT false,
  sanitize_strategies JSONB NOT NULL DEFAULT '[]',
  content_hash TEXT NOT NULL DEFAULT '',
  content_length INT NOT NULL DEFAULT 0,
  sensitivity_match_count INT NOT NULL DEFAULT 0,
  user_confirmation TEXT NOT NULL DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 行级安全：用户只能读写自己的日志
ALTER TABLE api_send_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_logs_user_isolation ON api_send_logs;
CREATE POLICY api_logs_user_isolation ON api_send_logs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. 授权：登录用户可插入/查询（匿名用户无权访问，保护数据）
GRANT SELECT, INSERT, UPDATE, DELETE ON api_send_logs TO authenticated;

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_send_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_send_logs(user_id);
