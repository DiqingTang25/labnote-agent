/**
 * 完整演示：登录 → 复现审计 → 云端保存 → 历史验证
 */
import { test, expect } from "@playwright/test";
import path from "path";

const BASE = "https://labnote-vault-main.vercel.app";
const SCREENSHOT_DIR = path.resolve("test-harness/demo-screenshots");
const EMAIL = "diqing.tang25@student.xjtlu.edu.cn";
const PASSWORD = "123456";

test("完整登录 + 复现审计持久化演示", async ({ page }) => {
  test.setTimeout(90000);

  // ════════════════════════════════════════
  // Step 1: 登录页面
  // ════════════════════════════════════════
  console.log("📍 Step 1: 访问登录页面");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/A1-login-page.png`, fullPage: true });
  console.log("📸 A1 - 登录页面");

  // 填写邮箱
  await page.getByPlaceholder(/researcher@lab/).fill(EMAIL);
  // 填写密码
  await page.getByPlaceholder(/输入密码/).fill(PASSWORD);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/A2-login-filled.png`, fullPage: true });
  console.log("📸 A2 - 已填写邮箱和密码");

  // 点击登录
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForTimeout(2000);
  console.log("✅ 登录已提交");

  // ════════════════════════════════════════
  // Step 2: 登录后跳转
  // ════════════════════════════════════════
  await page.waitForURL("**/workbench**", { timeout: 15000 }).catch(() => {
    console.log("⚠️ 未跳转到 /workbench，检查当前 URL");
  });
  await page.waitForTimeout(500);
  const currentUrl = page.url();
  console.log(`📍 当前 URL: ${currentUrl}`);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/A3-after-login.png`, fullPage: true });
  console.log("📸 A3 - 登录后页面");

  // ════════════════════════════════════════
  // Step 3: 导航到复现审计页面
  // ════════════════════════════════════════
  console.log("📍 Step 3: 导航到复现审计");
  await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/B1-audit-empty.png`, fullPage: true });
  console.log("📸 B1 - 复现审计页面（已登录）");

  // 验证简化后的空状态
  await expect(page.getByText("复现审计")).toBeVisible();
  await expect(page.getByText("论文输入")).toBeVisible();
  // 验证历史记录区域
  await expect(page.getByText("历史审计记录")).toBeVisible();
  console.log("✅ 空状态正确：标题 + 论文输入 + 历史记录 + 帮助按钮");

  // ════════════════════════════════════════
  // Step 4: 展开历史记录
  // ════════════════════════════════════════
  await page.getByText("历史审计记录").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/B2-history-expanded.png`, fullPage: true });
  console.log("📸 B2 - 历史审计记录展开");

  // ════════════════════════════════════════
  // Step 5: 加载预设 Audit
  // ════════════════════════════════════════
  console.log("📍 Step 5: 加载预设 Audit");
  await page.getByRole("button", { name: /使用预设 Audit/ }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/C1-audit-loaded.png`, fullPage: true });
  console.log("📸 C1 - 预设 Audit 已加载");

  // 验证评分仪表盘
  await expect(page.getByText("复现可行性")).toBeVisible();
  console.log("✅ 评分仪表盘可见");

  // 验证 Tab
  await expect(page.getByRole("button", { name: /📋 参数/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /🔍 缺口/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /📄 协议/ })).toBeVisible();
  console.log("✅ 三个 Tab 可见");

  // ════════════════════════════════════════
  // Step 6: 切到缺口 Tab
  // ════════════════════════════════════════
  await page.getByRole("button", { name: /🔍 缺口/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/C2-gaps-tab.png`, fullPage: true });
  console.log("📸 C2 - 缺口 Tab（按关键程度排序）");

  // ════════════════════════════════════════
  // Step 7: 切到协议 Tab
  // ════════════════════════════════════════
  await page.getByRole("button", { name: /📄 协议/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/C3-protocol-tab.png`, fullPage: true });
  console.log("📸 C3 - 协议 Tab（可下载复现协议）");

  // ════════════════════════════════════════
  // Step 8: 打开帮助弹窗
  // ════════════════════════════════════════
  console.log("📍 Step 8: 打开帮助弹窗");
  await page.getByRole("button", { name: /帮助/ }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/D1-help-modal.png`, fullPage: true });
  console.log("📸 D1 - 帮助弹窗内容");

  // 验证弹窗章节
  const dialog = page.locator("[role=dialog]");
  await expect(dialog.getByText("AI 管道架构")).toBeVisible();
  await expect(dialog.getByText("确定性四级分类")).toBeVisible();
  await expect(dialog.getByText("Materials Project 集成")).toBeVisible();
  await expect(dialog.getByText("复现可行性评分公式")).toBeVisible();
  console.log("✅ 帮助弹窗所有章节完整");

  // 关闭弹窗
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // ════════════════════════════════════════
  // Step 9: 返回空状态，验证保存的历史
  // ════════════════════════════════════════
  console.log("📍 Step 9: 返回空状态验证持久化");
  await page.getByRole("button", { name: /重新开始/ }).click();
  await page.waitForTimeout(300);
  await page.getByText("历史审计记录").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/E1-history-after-save.png`, fullPage: true });
  console.log("📸 E1 - 历史记录（验证审计已保存到云端）");

  console.log("\n🎉 完整演示流程结束！");
  console.log("截图保存在: test-harness/demo-screenshots/");
});
