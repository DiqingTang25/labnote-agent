/**
 * 验证：后台任务 + 切换页面不丢失 + 历史持久化
 */
import { test, expect } from "@playwright/test";
import path from "path";

const BASE = "https://labnote-vault-main.vercel.app";
const SCREENSHOT_DIR = path.resolve("test-harness/demo-screenshots");
const EMAIL = "diqing.tang25@student.xjtlu.edu.cn";
const PASSWORD = "123456";

test("后台任务：持久化 + 切换页面验证", async ({ page }) => {
  test.setTimeout(120000);

  // ════════════════════════════════════════
  // Step 1: 登录
  // ════════════════════════════════════════
  console.log("📍 登录中...");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.getByPlaceholder(/researcher@lab/).fill(EMAIL);
  await page.getByPlaceholder(/输入密码/).fill(PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForTimeout(3000);
  console.log(`📍 登录后 URL: ${page.url()}`);

  // ════════════════════════════════════════
  // Step 2: 导航到复现审计
  // ════════════════════════════════════════
  console.log("📍 导航到 /checklist...");
  await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bg-step1-page.png`, fullPage: true });
  console.log(`📍 /checklist URL: ${page.url()}`);

  // 检查当前页面状态
  const pageText = await page.textContent("body");
  console.log(`📍 页面包含 "复现审计": ${pageText?.includes("复现审计")}`);
  console.log(`📍 页面包含 "论文输入": ${pageText?.includes("论文输入")}`);
  console.log(`📍 页面包含 "登录": ${pageText?.includes("登录")}`);
  console.log(`📍 页面包含 "LabNote": ${pageText?.includes("LabNote")}`);
  // 打印 body 前500字符
  console.log(`📍 Body 开头: ${pageText?.slice(0, 500)}`);

  // 如果是 audit 视图，先重置
  const hasReset = await page.getByRole("button", { name: /重新开始/ }).count();
  if (hasReset > 0) {
    console.log("📍 当前在 audit 视图，点击重新开始...");
    await page.getByRole("button", { name: /重新开始/ }).click();
    await page.waitForTimeout(500);
  }

  // 展开历史
  const historyBtn = page.getByText("历史审计记录");
  if (await historyBtn.count() > 0) {
    await historyBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/bg-step2-history.png`, fullPage: true });
    console.log("📸 历史记录已展开");
  }

  // ════════════════════════════════════════
  // Step 3: 加载预设 Audit
  // ════════════════════════════════════════
  const presetBtn = page.getByRole("button", { name: /使用预设 Audit/ });
  const presetCount = await presetBtn.count();
  console.log(`📍 "使用预设 Audit" 按钮数: ${presetCount}`);

  if (presetCount > 0) {
    await presetBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/bg-step3-audit-loaded.png`, fullPage: true });
    console.log("📸 预设 Audit 已加载");
  }

  // ════════════════════════════════════════
  // Step 4: 切到工作台再回来
  // ════════════════════════════════════════
  await page.goto(`${BASE}/workbench`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  console.log("📍 已切换到工作台");

  await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bg-step4-returned.png`, fullPage: true });
  console.log("📍 返回复现审计");

  // 展开历史
  const historyBtn2 = page.getByText("历史审计记录");
  if (await historyBtn2.count() > 0) {
    await historyBtn2.click();
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/bg-step5-final-history.png`, fullPage: true });

  console.log("\n🎉 验证完成！");
});
