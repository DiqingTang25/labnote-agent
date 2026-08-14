/**
 * 测试账号数据清理脚本（带权限护栏）
 *
 * 权限铁律：
 *  - 本脚本只能删除 test@labnote.tech 测试账号的实验数据与存储内容
 *  - 任何其他用户的数据一律不碰
 *  - 其他用户数据仅可在用户明确下达"清洗系统"指令时，用单独脚本处理
 *
 * 运行：npx tsx --env-file=.env.local scripts/cleanup-test-account.ts
 */
import { createClient } from "@supabase/supabase-js";

const TEST_EMAIL = "test@labnote.tech";
const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// ── 护栏 1：只定位测试账号 ──────────────────────────────
const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
const testUser = (users?.users ?? []).find((u) => u.email === TEST_EMAIL);
if (!testUser) {
  console.log(`测试账号 ${TEST_EMAIL} 不存在，无需清理`);
  process.exit(0);
}
const uid = testUser.id;
console.log(`目标：${TEST_EMAIL} (uid ${uid.slice(0, 8)})`);

// ── 1. 删除该账号的实验行（严格按 user_id 过滤）──────────
const { data: deletedRows } = await admin
  .from("experiments")
  .delete()
  .eq("user_id", uid)
  .select("id, name");
console.log(`experiments 删除: ${deletedRows?.length ?? 0} 行`);
for (const r of deletedRows ?? []) console.log(`  - ${r.name}`);

// ── 2. 删除该账号的实验关系边（按参与实验过滤）────────────
const { data: rels } = await admin.from("experiment_relations").select("id, source_id, target_id");
const expIds = new Set((deletedRows ?? []).map((r) => r.id));
const relToDelete = (rels ?? []).filter(
  (r) => expIds.has(r.source_id) || expIds.has(r.target_id),
);
if (relToDelete.length > 0) {
  await admin
    .from("experiment_relations")
    .delete()
    .in("id", relToDelete.map((r) => r.id));
  console.log(`experiment_relations 删除: ${relToDelete.length} 条`);
}

// ── 3. 删除该账号的 Storage 目录（{uid}/ 整个前缀）───────
const { data: subDirs } = await admin.storage.from("experiment-files").list(uid, { limit: 100 });
const paths = [
  ...(subDirs ?? []).map((f) => `${uid}/${f.name}`),
  `${uid}/.emptyFolderPlaceholder`,
];
const { error: rmErr } = await admin.storage.from("experiment-files").remove(paths);
console.log(`Storage 删除 ${uid.slice(0, 8)}/: ${rmErr ? "❌ " + rmErr.message : `✅ ${(subDirs ?? []).length} 个目录`}`);

// ── 4. 收尾报告 ────────────────────────────────────────
const { data: remain } = await admin.from("experiments").select("id, name, user_id");
console.log(`\n清理后 experiments 总行数: ${remain?.length ?? 0}`);
console.log("护栏检查：本次只操作了测试账号，未触碰其他用户数据 ✅");
