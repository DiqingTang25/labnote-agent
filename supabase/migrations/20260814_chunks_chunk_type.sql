-- ============================================================
-- 修复 experiment_chunks chunk_type CHECK 约束过窄
-- 背景：代码 chunkType 联合类型含 'group' | 'extra'（模板自定义分组），
--       旧约束只允许 5 种 → 每次实验保存时 chunk 插入报
--       "violates check constraint experiment_chunks_chunk_type_check" (400)
-- 在 Supabase SQL Editor 中运行（表当前为空，纯 schema 变更，安全）
-- ============================================================

ALTER TABLE experiment_chunks DROP CONSTRAINT IF EXISTS experiment_chunks_chunk_type_check;

ALTER TABLE experiment_chunks ADD CONSTRAINT experiment_chunks_chunk_type_check
  CHECK (chunk_type IN (
    'meta', 'purpose', 'device_sample', 'params_steps', 'results', 'group', 'extra'
  ));
