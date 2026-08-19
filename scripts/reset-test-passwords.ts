/**
 * 重置白名单测试账号密码（团队双账号 E2E 测试用）
 *
 * 权限铁律：只操作 test@labnote.tech / demo@labnote.tech 两个白名单账号，
 * 其他账号一律不碰（与 cleanup-test-account.ts 同一护栏范围）。
 *
 * 运行： npx tsx --env-file=.env.local scripts/reset-test-passwords.ts
 */
import { createClient } from "@supabase/supabase-js";

const TARGETS = [
  { email: "test@labnote.tech", password: "LabNoteTest123" },
  { email: "demo@labnote.tech", password: "LabNoteTest123" },
];

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

for (const t of TARGETS) {
  const { data: users, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) {
    console.error(`❌ 列出用户失败: ${listErr.message}`);
    process.exit(1);
  }
  const existing = users.users.find((u) => u.email === t.email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: t.password,
      email_confirm: true,
    });
    if (error) {
      console.error(`❌ ${t.email} 密码重置失败: ${error.message}`);
      process.exit(1);
    }
    console.log(`✅ ${t.email} 密码已重置为 ${t.password}`);
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: t.email,
      password: t.password,
      email_confirm: true,
    });
    if (error) {
      console.error(`❌ ${t.email} 账号创建失败: ${error.message}`);
      process.exit(1);
    }
    console.log(`✅ ${t.email} 账号已创建（密码 ${t.password}）`);
  }
}
console.log("完成。E2E 测试后可用 cleanup 脚本清理这两个账号的数据。");
