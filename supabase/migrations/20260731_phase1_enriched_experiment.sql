-- Phase 1: 实验卡片数据模型升级 — 四大国际规范
-- ISA-TAB / FAIR / Allotrope ADF / ISO 17025 + GLP
-- 日期: 2026-07-31

BEGIN;

-- ═══════════════════════════════════════════════════════
-- 1. ISA-TAB 层级 + 元数据
-- ═══════════════════════════════════════════════════════
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS project_id TEXT,
  ADD COLUMN IF NOT EXISTS study_id TEXT,
  ADD COLUMN IF NOT EXISTS experiment_type TEXT NOT NULL DEFAULT 'synthesis',
  ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_modified_by TEXT;

-- ═══════════════════════════════════════════════════════
-- 2. 人员 (GLP 职责分离)
-- ═══════════════════════════════════════════════════════
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS reviewer TEXT,
  ADD COLUMN IF NOT EXISTS approver TEXT,
  ADD COLUMN IF NOT EXISTS supervisor TEXT;

-- ═══════════════════════════════════════════════════════
-- 3. 目的/假设/结论
-- ═══════════════════════════════════════════════════════
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS hypothesis TEXT,
  ADD COLUMN IF NOT EXISTS conclusion TEXT;

-- ═══════════════════════════════════════════════════════
-- 4. 协议/SOP (ISA-TAB Protocol) — JSONB
-- ═══════════════════════════════════════════════════════
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS protocol JSONB;

-- ═══════════════════════════════════════════════════════
-- 5. 仪器列表 (Allotrade ADF Equipment) — JSONB
-- ═══════════════════════════════════════════════════════
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS instruments JSONB;

-- ═══════════════════════════════════════════════════════
-- 6. 材料 (ISA-TAB Source/Sample) — JSONB
-- ═══════════════════════════════════════════════════════
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS materials JSONB;

-- ═══════════════════════════════════════════════════════
-- 7. 样品扩展字段
-- ═══════════════════════════════════════════════════════
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS sample_preparation_date TEXT,
  ADD COLUMN IF NOT EXISTS sample_parent_id TEXT;

-- ═══════════════════════════════════════════════════════
-- 8. 观察记录 — JSONB
-- ═══════════════════════════════════════════════════════
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS observations JSONB;

-- ═══════════════════════════════════════════════════════
-- 9. 数据文件引用 (Allotrope Data Package) — JSONB
-- ═══════════════════════════════════════════════════════
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS raw_data_refs JSONB,
  ADD COLUMN IF NOT EXISTS processed_data_refs JSONB;

-- ═══════════════════════════════════════════════════════
-- 10. 质控 (ISO 17025 §7.7) — JSONB + scalar
-- ═══════════════════════════════════════════════════════
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS controls JSONB,
  ADD COLUMN IF NOT EXISTS replicates INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS qc_status TEXT NOT NULL DEFAULT 'na';

-- ═══════════════════════════════════════════════════════
-- 11. FAIR 元数据
-- ═══════════════════════════════════════════════════════
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS license TEXT NOT NULL DEFAULT 'CC BY-NC 4.0',
  ADD COLUMN IF NOT EXISTS ontology_terms TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS derived_from TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ═══════════════════════════════════════════════════════
-- 12. 数据完整性 (21 CFR Part 11 + ALCOA+) — JSONB
-- ═══════════════════════════════════════════════════════
ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS audit_trail JSONB,
  ADD COLUMN IF NOT EXISTS signatures JSONB;

-- ═══════════════════════════════════════════════════════
-- 12. 索引
-- ═══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_experiments_project_id ON experiments(project_id);
CREATE INDEX IF NOT EXISTS idx_experiments_experiment_type ON experiments(experiment_type);
CREATE INDEX IF NOT EXISTS idx_experiments_qc_status ON experiments(qc_status);
CREATE INDEX IF NOT EXISTS idx_experiments_version ON experiments(version);
CREATE INDEX IF NOT EXISTS idx_experiments_derived_from ON experiments USING GIN(derived_from);
CREATE INDEX IF NOT EXISTS idx_experiments_audit_trail ON experiments USING GIN(audit_trail);

COMMIT;
