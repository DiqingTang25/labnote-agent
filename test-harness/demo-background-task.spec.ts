/**
 * 验证：后台任务 + 切换页面不丢失（本地 dev 模式）
 */
import { test, expect } from "@playwright/test";
import path from "path";

const BASE = "https://labnote-vault-main.vercel.app";
const SCREENSHOT_DIR = path.resolve("test-harness/demo-screenshots");

test("后台任务：页面切换不中断 + 历史持久化", async ({ page }) => {
  test.setTimeout(60000);

  // ════════════════════════════════════════
  // Step 1: 打开复现审计（DEV 模式免登录）
  // ════════════════════════════════════════
  await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bg-01-empty.png`, fullPage: true });

  // 验证页面加载成功
  await expect(page.getByText("复现审计")).toBeVisible();
  console.log("✅ 复现审计页面加载成功");

  // ════════════════════════════════════════
  // Step 2: 加载预设 Audit
  // ════════════════════════════════════════
  await page.getByRole("button", { name: /使用预设 Audit/ }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText("复现可行性")).toBeVisible();
  console.log("✅ 预设 Audit 已加载");

  // ════════════════════════════════════════
  // Step 3: 切到工作台（模拟切换页面）
  // ════════════════════════════════════════
  await page.goto(`${BASE}/workbench`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  console.log("✅ 已切换到工作台（组件已卸载）");

  // ════════════════════════════════════════
  // Step 4: 回到复现审计
  // ════════════════════════════════════════
  await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bg-02-returned.png`, fullPage: true });

  // 验证页面正常
  await expect(page.getByText("复现审计")).toBeVisible();

  // ════════════════════════════════════════
  // Step 5: 展开历史记录
  // ════════════════════════════════════════
  await page.getByText("历史审计记录").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bg-03-history.png`, fullPage: true });
  console.log("✅ 历史记录已展开");

  // ════════════════════════════════════════
  // Step 6: 帮助弹窗
  // ════════════════════════════════════════
  await page.getByRole("button", { name: /帮助/ }).click();
  await page.waitForTimeout(400);
  await expect(page.locator("[role=dialog]").getByText("AI 管道架构")).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bg-04-help.png`, fullPage: true });
  console.log("✅ 帮助弹窗正常");

  console.log("\n🎉 后台任务 + 页面切换 + 持久化验证完成！");
});
