-- ============================================================
-- LabNote Agent — 修复 experiments 表缺列（数据丢失根因）
-- 在 Supabase SQL Editor 中运行（30 秒）
-- 背景：新数据模型(ExperimentDoc)写入 experiment_type/version/
--       ai_insights/last_parsed_at，但动态存储迁移(20260810)漏加
--       这些列 → 所有新实验 INSERT 失败（错误：Could not find
--       the 'experiment_type' column）→ 文件已传云端、记录全丢
-- ============================================================

ALTER TABLE experiments ADD COLUMN IF NOT EXISTS experiment_type TEXT NOT NULL DEFAULT 'other';
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS ai_insights TEXT;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS last_parsed_at TIMESTAMPTZ;

-- 为模板匹配/按类型筛选建索引
CREATE INDEX IF NOT EXISTS idx_experiments_experiment_type ON experiments(experiment_type);
