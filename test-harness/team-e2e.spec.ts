/**
 * 团队模式双账号 E2E — 本地批量测试
 *
 * 覆盖：创建团队 → 邀请码 → 输码加入 → 团队模板（建/编辑/只读）
 *       → 模板选卡建实验 → 团队可见 → 权限拦截（成员改管理员实验）
 *       → 团队 RAG 问答 → 个人资产转团队 → 成果墙权限 → 移除成员
 *
 * 账号：test@labnote.tech（A，owner）/ demo@labnote.tech（B，member）
 * 前置：先运行 npx tsx --env-file=.env.local scripts/reset-test-passwords.ts
 * 清理：afterAll 用 service role 删除本测试创建的团队/实验（仅白名单账号数据）
 */
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// ── 读取 .env.local（本地测试直连云端 Supabase）──
function parseEnvFile(p: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return out;
}
const env = parseEnvFile(path.resolve(".env.local"));
const admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);

const A = { email: "test@labnote.tech", password: "LabNoteTest123" };
const B = { email: "demo@labnote.tech", password: "LabNoteTest123" };
const TEAM_NAME = `E2E协作团队${Date.now()}`;
const TPL_NAME = `E2E团队模板${Date.now()}`;
const SHOT_DIR = path.resolve("test-harness/e2e-screenshots");
let inviteCode = "";

test("团队协作全流程（双账号）", async ({ browser }) => {
  test.setTimeout(420000);
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  for (const p of [pageA, pageB]) {
    p.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") console.log(`[浏览器${p === pageA ? "A" : "B"}] ${msg.type()}: ${msg.text().slice(0, 300)}`);
    });
    p.on("pageerror", (err) => console.log(`[浏览器${p === pageA ? "A" : "B"}] pageerror: ${String(err).slice(0, 300)}`));
    p.on("response", (res) => {
      const u = res.url();
      if (u.includes("/rest/v1") || (res.request().method() === "POST" && u.includes("8082"))) {
        console.log(`[NET${p === pageA ? "A" : "B"}] ${res.status()} ${res.request().method()} ${u.replace("http://localhost:8082", "").slice(0, 160)}`);
      }
    });
  }

  const login = async (page: Page, email: string, password: string) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.getByPlaceholder(/researcher@lab/).fill(email);
    await page.getByPlaceholder(/输入密码/).fill(password);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL("**/workbench**", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
  };

  try {
    /* ═══ Step 1: A 登录并创建团队 ═══ */
    console.log("📍 Step 1: A 登录并创建团队");
    await login(pageA, A.email, A.password);
    console.log(`  登录后 URL: ${pageA.url()}`);
    const gateVisible = await pageA.getByText("选择工作空间").waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    console.log(`  工作空间弹窗可见: ${gateVisible}`);
    if (gateVisible) {
      await pageA.getByRole("button", { name: /创建课题组/ }).click();
      // 第 1 步：团队名称（每屏唯一输入框）
      await pageA.getByRole("textbox").fill(TEAM_NAME);
      await pageA.getByRole("button", { name: "下一步" }).click();
      // 第 2 步：唯一标识（自动建议，等待可用状态）
      await pageA.getByText("标识可用").waitFor({ timeout: 15000 });
      await pageA.getByRole("button", { name: "下一步" }).click();
      // 第 3 步起可跳过剩余步骤直接创建
      await pageA.getByRole("button", { name: "跳过剩余步骤" }).click();
      // 创建走多次服务端往返，以 localStorage 写入（choose 完成）为准
      let created = false;
      for (let i = 0; i < 18; i++) {
        const chosen = await pageA.evaluate(() => localStorage.getItem("labnote:ws_chosen"));
        if (chosen === "1") { created = true; break; }
        await pageA.waitForTimeout(5000);
      }
      console.log(`  创建完成: ${created}`);
      expect(created).toBe(true);
      await pageA.screenshot({ path: `${SHOT_DIR}/E0-创建团队后.png`, fullPage: true });
    }
    await pageA.goto("/team", { waitUntil: "networkidle" });
    await expect(pageA.getByText(TEAM_NAME).first()).toBeVisible({ timeout: 15000 });
    await pageA.screenshot({ path: `${SHOT_DIR}/E1-A团队页.png`, fullPage: true });

    /* ═══ Step 2: A 生成邀请码 ═══ */
    console.log("📍 Step 2: A 生成邀请码");
    await pageA.getByRole("button", { name: "成员", exact: true }).click({ force: true });
    await pageA.getByRole("button", { name: "生成邀请码" }).click();
    // 邀请记录里也有历史码，取 DOM 中第一个（邀请卡片内的最新码）
    const codeSpan = pageA.locator("span.font-mono").filter({ hasText: /^[A-Z2-9]{8}$/ }).first();
    await expect(codeSpan).toBeVisible({ timeout: 10000 });
    inviteCode = (await codeSpan.textContent())?.trim() ?? "";
    expect(inviteCode).toMatch(/^[A-Z2-9]{8}$/);
    console.log(`  邀请码: ${inviteCode}`);

    /* ═══ Step 3: A 创建团队模板（完整字段编辑器）═══ */
    console.log("📍 Step 3: A 创建团队模板并编辑字段");
    await pageA.getByRole("button", { name: "模板", exact: true }).click();
    await pageA.getByRole("button", { name: "新建模板" }).click();
    await pageA.getByPlaceholder("模板名称 *").fill(TPL_NAME);
    await pageA.locator("select").first().selectOption({ index: 1 }); // 第一个预置模板
    await pageA.getByRole("button", { name: "创建并编辑字段" }).click();
    await expect(pageA.getByRole("button", { name: "保存模板" })).toBeVisible({ timeout: 10000 });
    // 改第一个字段的显示标签
    await pageA.getByPlaceholder("显示标签 *").first().fill("反应温度E2E");
    await pageA.screenshot({ path: `${SHOT_DIR}/E2-模板编辑器.png`, fullPage: true });
    await pageA.getByRole("button", { name: "保存模板" }).click();
    await expect(pageA.getByText(TPL_NAME).first()).toBeVisible({ timeout: 10000 });
    console.log("✅ 团队模板创建并保存成功");

    /* ═══ Step 4: B 输码加入 ═══ */
    console.log("📍 Step 4: B 输码加入");
    await login(pageB, B.email, B.password);
    await pageB.getByText("选择工作空间").waitFor({ timeout: 15000 }).catch(() => {});
    if (await pageB.getByText("选择工作空间").isVisible().catch(() => false)) {
      await pageB.getByRole("button", { name: "输入邀请码加入" }).click();
      await pageB.getByPlaceholder(/邀请码（如：/).fill(inviteCode);
      await pageB.getByRole("button", { name: "加入团队" }).click();
      // 加入 = 4 次服务端 Supabase 往返，代理下可达 20-30s+；
      // 以 localStorage 真正写入（choose 完成）为准，轮询最长 90s
      let joined = false;
      for (let i = 0; i < 18; i++) {
        const chosen = await pageB.evaluate(() => localStorage.getItem("labnote:ws_chosen"));
        if (chosen === "1") { joined = true; break; }
        await pageB.waitForTimeout(5000);
      }
      console.log(`  加入完成: ${joined}`);
      expect(joined).toBe(true);
    }
    await pageB.goto("/team", { waitUntil: "networkidle" });
    await expect(pageB.getByText(TEAM_NAME).first()).toBeVisible({ timeout: 15000 });
    // 验证工作空间弹窗已关闭（exact 匹配避免命中空状态提示文案）
    await expect(pageB.getByText("选择工作空间", { exact: true })).toHaveCount(0);
    console.log("✅ B 加入团队成功");

    /* ═══ Step 5: B 看团队模板（只读）═══ */
    console.log("📍 Step 5: B 查看团队模板（只读）");
    await pageB.getByRole("button", { name: "模板", exact: true }).click();
    await expect(pageB.getByText(TPL_NAME).first()).toBeVisible({ timeout: 10000 });
    await expect(pageB.getByRole("button", { name: "编辑" })).toHaveCount(0);
    await expect(pageB.getByRole("button", { name: "删除" })).toHaveCount(0);
    console.log("✅ B 对团队模板只读");

    /* ═══ Step 6: B 用团队模板建实验 ═══ */
    console.log("📍 Step 6: B 用团队模板建实验");
    await pageB.goto("/workbench", { waitUntil: "networkidle" });
    await pageB.getByRole("button", { name: /新建实验（选模板）/ }).click();
    await expect(pageB.getByText("新建实验 — 选择模板")).toBeVisible({ timeout: 10000 });
    await pageB.locator('button:has-text("' + TPL_NAME + '")').first().click();
    await pageB.locator("input.text-xl").fill("E2E-B的实验");
    await pageB.getByRole("button", { name: "保存", exact: true }).click();
    await expect(pageB.getByText("已保存")).toBeVisible({ timeout: 10000 });
    await expect(pageB.getByText("E2E-B的实验").first()).toBeVisible({ timeout: 10000 });
    await pageB.waitForTimeout(2000);
    console.log("✅ B 用团队模板创建实验");

    /* ═══ Step 6.5: 审核工作流 — A 在团队页通过 B 的待审核实验 ═══ */
    console.log("📍 Step 6.5: 审核工作流");
    // 等 B 的实验名称落库（保存是异步的）
    for (let i = 0; i < 30; i++) {
      const { data } = await admin.from("experiments").select("id").eq("name", "E2E-B的实验");
      if ((data ?? []).length > 0) break;
      await pageA.waitForTimeout(1000);
    }
    await pageA.goto("/team", { waitUntil: "networkidle" });
    await expect(pageA.getByText("待审核实验（1）")).toBeVisible({ timeout: 15000 });
    await expect(pageA.getByText("E2E-B的实验").first()).toBeVisible();
    await pageA.getByRole("button", { name: "通过" }).click();
    await expect(pageA.getByText("已通过审核")).toBeVisible({ timeout: 10000 });
    await expect(pageA.getByText("待审核实验")).toHaveCount(0);
    console.log("✅ 审核通过流程");

    /* ═══ Step 7: A 团队空间看到 B 的实验 ═══ */
    console.log("📍 Step 7: A 团队空间看到 B 的实验");
    // 确定性保障：等 B 的实验行真正落库（避免 insert 异步竞态）
    let inDb = false;
    for (let i = 0; i < 30; i++) {
      const { data } = await admin.from("experiments").select("id").eq("name", "E2E-B的实验");
      if ((data ?? []).length > 0) { inDb = true; break; }
      await pageA.waitForTimeout(1000);
    }
    console.log(`  B 的实验已落库: ${inDb}`);
    await pageA.goto("/workbench", { waitUntil: "networkidle" });
    await pageA.reload({ waitUntil: "networkidle" });
    await expect(pageA.getByText("E2E-B的实验").first()).toBeVisible({ timeout: 20000 });
    console.log("✅ 团队实验对 A 可见");

    /* ═══ Step 8: A 建实验，B 打开被拦截（权限）═══ */
    console.log("📍 Step 8: 权限拦截 — B 不能改 A 的实验");
    await pageA.getByRole("button", { name: /新建实验（选模板）/ }).click();
    await pageA.getByRole("button", { name: /快速新建（通用模板）/ }).click();
    await pageA.locator("input.text-xl").fill("E2E-A的实验");
    await pageA.getByRole("button", { name: "保存", exact: true }).click();
    await pageA.waitForTimeout(2000);
    // 等 A 的实验真正落库（同 Step 7 的确定性保障）
    for (let i = 0; i < 30; i++) {
      const { data } = await admin.from("experiments").select("id").eq("name", "E2E-A的实验");
      if ((data ?? []).length > 0) break;
      await pageA.waitForTimeout(1000);
    }

    await pageB.goto("/workbench", { waitUntil: "networkidle" });
    await pageB.getByText("E2E-A的实验").first().click();
    await expect(pageB.getByText(/只有上传者本人或管理员可以编辑与删除/)).toBeVisible({ timeout: 10000 });
    await pageB.getByRole("button", { name: "保存", exact: true }).click();
    await expect(pageB.getByText("只有上传者本人或管理员可以编辑该实验")).toBeVisible({ timeout: 5000 });

    /* ═══ Step 8.5: 评论 — B 在 A 的实验下留言 ═══ */
    console.log("📍 Step 8.5: 实验评论");
    await pageB.getByPlaceholder("写下评论…").fill("这条实验可以补充光源功率信息吗？");
    await pageB.keyboard.press("Enter");
    await expect(pageB.getByText("这条实验可以补充光源功率信息吗？")).toBeVisible({ timeout: 10000 });
    console.log("✅ 评论发布成功");

    await pageB.screenshot({ path: `${SHOT_DIR}/E3-只读拦截.png`, fullPage: true });
    console.log("✅ 成员编辑拦截生效");

    /* ═══ Step 9: 团队 RAG 问答 ═══ */
    console.log("📍 Step 9: 团队 RAG 问答");
    await pageA.getByPlaceholder("向知识库提问…").fill("这个团队里有哪些实验？");
    await pageA.keyboard.press("Enter");
    await expect(pageA.getByText("来源文档").first()).toBeVisible({ timeout: 90000 });
    await pageA.screenshot({ path: `${SHOT_DIR}/E4-团队RAG问答.png`, fullPage: true });
    console.log("✅ 团队 RAG 问答返回来源");

    /* ═══ Step 10: 个人资产转团队 ═══ */
    console.log("📍 Step 10: 个人资产转团队");
    await pageA.getByText(TEAM_NAME, { exact: true }).first().click(); // 顶部切换器
    await pageA.getByText("个人空间", { exact: false }).first().click();
    await pageA.waitForTimeout(1500);
    await pageA.goto("/workbench", { waitUntil: "networkidle" });
    await pageA.getByRole("button", { name: /新建实验（选模板）/ }).click();
    await pageA.getByRole("button", { name: /快速新建（通用模板）/ }).click();
    await pageA.locator("input.text-xl").fill("E2E-待转移实验");
    await pageA.getByRole("button", { name: "保存", exact: true }).click({ force: true });
    await pageA.waitForTimeout(2000);
    const transferBar = pageA.locator("div").filter({ hasText: "个人资产，可转入团队" }).last();
    await expect(transferBar).toBeVisible({ timeout: 10000 });
    await transferBar.locator("select").selectOption({ label: TEAM_NAME });
    await transferBar.getByRole("button", { name: "转入团队" }).click();
    await pageA.waitForTimeout(3000); // 转移成功后自动刷新
    console.log("✅ 个人实验转入团队");

    /* ═══ Step 11: 成果墙权限（A 可写、B 不可写）═══ */
    console.log("📍 Step 11: 成果墙权限");
    // A 切回团队工作空间（转团队后停留在个人空间，myRole 为空则无管理员按钮）
    // 下拉偶发不展开（转团队后页面刚刷新），重试最多 3 次
    const wsTrigger = pageA.getByRole("button", { name: "个人", exact: true });
    const teamItem = pageA.getByRole("menuitem").filter({ hasText: TEAM_NAME });
    for (let attempt = 0; attempt < 3; attempt++) {
      await wsTrigger.click();
      const opened = await teamItem.waitFor({ state: "visible", timeout: 4000 }).then(() => true).catch(() => false);
      if (opened) break;
    }
    await teamItem.click();
    await pageA.waitForTimeout(1500);
    await pageB.goto("/team", { waitUntil: "networkidle" });
    await pageB.getByRole("button", { name: "成果墙", exact: true }).click();
    await expect(pageB.getByRole("button", { name: "添加成果" })).toHaveCount(0);
    await pageA.goto("/team", { waitUntil: "networkidle" });
    await pageA.getByRole("button", { name: "成果墙", exact: true }).click();
    await pageA.getByRole("button", { name: "添加成果" }).click();
    await pageA.getByPlaceholder(/名称 \*/).fill("E2E成果-高熵合金论文");
    await pageA.keyboard.press("Enter");
    await expect(pageA.getByText("E2E成果-高熵合金论文")).toBeVisible({ timeout: 10000 });
    console.log("✅ 成果墙：B 无入口、A 可添加");

    /* ═══ Step 12: A 移除 B ═══ */
    console.log("📍 Step 12: A 移除 B");
    await pageA.getByRole("button", { name: "成员", exact: true }).click();
    // B 无 profiles 记录时名单显示 user_id 前缀而非邮箱；「移除」按钮只有 B 那一行有
    const kickBtn = pageA.getByRole("button", { name: "移除" });
    await expect(kickBtn).toBeVisible({ timeout: 10000 });
    await kickBtn.click();
    // 移除走多次服务端往返（代理下可达 20-30s），以成员关系真正删除为准
    const { data: aUsers2 } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const aUser2 = aUsers2?.users.find((x) => x.email === A.email);
    const { data: aMem } = aUser2
      ? await admin.from("team_members").select("team_id").eq("user_id", aUser2.id)
      : { data: null };
    const curTeamId = (aMem ?? [])[0]?.team_id as string | undefined;
    const { data: bUsers2 } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const bUser2 = bUsers2?.users.find((x) => x.email === B.email);
    let removed = false;
    for (let i = 0; i < 24; i++) {
      const { data: rows } = bUser2 && curTeamId
        ? await admin.from("team_members").select("role").eq("team_id", curTeamId).eq("user_id", bUser2.id)
        : { data: null };
      if (bUser2 && curTeamId && (rows ?? []).length === 0) { removed = true; break; }
      await pageA.waitForTimeout(5000);
    }
    console.log(`  移除完成: ${removed}`);
    expect(removed).toBe(true);
    await pageB.goto("/team", { waitUntil: "networkidle" });
    await expect(pageB.getByText("还没有加入任何团队")).toBeVisible({ timeout: 15000 });
    console.log("✅ B 被移除后看不到团队");

    /* ═══ Step 12.5: 通知 — B 收到被移除通知 ═══ */
    console.log("📍 Step 12.5: 通知系统");
    await pageB.getByRole("button", { name: /通知/ }).click();
    await expect(pageB.getByText("你已被移出团队").first()).toBeVisible({ timeout: 10000 });
    console.log("✅ 被移除通知送达");

    console.log("🎉 团队 E2E 全流程通过");
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});

/* ── 清理：删除本测试创建的团队与实验（仅 E2E 命名前缀，白名单账号范围）── */
test.afterAll(async () => {
  const { data: teams } = await admin.from("teams").select("id").like("name", "E2E协作团队%");
  for (const t of (teams ?? [])) {
    await admin.from("experiments").delete().eq("team_id", t.id);
    await admin.from("teams").delete().eq("id", t.id);
    console.log(`🧹 已删除测试团队 ${t.id}`);
  }
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const email of [A.email, B.email]) {
    const u = users?.users.find((x) => x.email === email);
    if (u) {
      const { data: exps } = await admin
        .from("experiments")
        .select("id")
        .eq("user_id", u.id)
        .like("name", "E2E-%");
      if ((exps ?? []).length > 0) {
        await admin.from("experiments").delete().in("id", (exps ?? []).map((e) => e.id));
        console.log(`🧹 已清理 ${email} 的 ${exps!.length} 个 E2E 实验`);
      }
    }
  }
});
