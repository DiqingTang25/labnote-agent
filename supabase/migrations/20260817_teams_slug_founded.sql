-- ============================================================
-- LabNote Agent — 团队唯一标识 + 成立年份（2026-08-17）
-- 运行方式: Supabase SQL Editor → 粘贴全部 → Run
-- 背景：团队名称改为可重复的展示名，唯一性由 slug 承担
--       （GitHub 组织 login 机制：wang-lab / guotf-lab）；
--       成立年份为课题组主页惯例信息（教技司[2015]155号概况要求）
-- 幂等：teams 表当前为空，无回填风险
-- ============================================================

ALTER TABLE teams ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS teams_slug_unique ON teams(slug) WHERE slug IS NOT NULL;

ALTER TABLE teams ADD COLUMN IF NOT EXISTS founded_year INT;
