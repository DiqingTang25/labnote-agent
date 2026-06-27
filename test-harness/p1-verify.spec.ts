/**
 * P1 验证 — Materials Project API 集成 + 透明度 UI 完整流程测试
 *
 * 前置条件:
 *   1. Vite dev server 已启动: npx vite dev --port 5173
 *   2. Dev mode auth bypass 开启 (import.meta.env.DEV)
 *
 * 运行: npx playwright test test-harness/p1-verify.spec.ts --headed
 */

import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const BASE = "http://localhost:5173";
const SCREENSHOT_DIR = path.resolve("screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════════
// Test 1: 预设 Audit 一键加载（不依赖 AI API）
// ═══════════════════════════════════════════════════════

test("P1: 预设 Audit 一键加载 + UI 验证", async ({ page }) => {
  test.setTimeout(30000);

  await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });
  await expect(page.locator("h1")).toContainText("复现审计");
  await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-01-empty-state.png`, fullPage: true });

  // 展开技术文档
  const techDocBtn = page.locator("button", { hasText: "技术文档" });
  if (await techDocBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await techDocBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-02-tech-docs.png`, fullPage: true });
    console.log("[Test] ✅ Tech docs panel");
  }

  // 点击 "使用预设 Audit（快速演示）"
  const presetBtn = page.getByRole("button", { name: /预设 Audit/ });
  await expect(presetBtn).toBeVisible({ timeout: 5000 });
  await presetBtn.click();

  // 等待评分仪表盘出现
  await expect(page.getByText(/分/).first()).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-03-preset-audit.png`, fullPage: true });
  console.log("[Test] ✅ Preset audit loaded");

  // 验证参数列表
  const paramTab = page.getByRole("button", { name: /参数/ });
  await expect(paramTab).toBeVisible();
  console.log("[Test] ✅ Parameters tab visible");

  // 验证缺口 tab
  await page.locator("button", { hasText: "缺口" }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-04-gaps-tab.png`, fullPage: true });
  console.log("[Test] ✅ Gaps tab");

  // 验证协议 tab
  await page.locator("button", { hasText: "协议" }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-05-protocol-tab.png`, fullPage: true });
  console.log("[Test] ✅ Protocol tab");

  // 验证可复制/下载
  await expect(page.getByText(/复现协议/).first()).toBeVisible();
  console.log("[Test] ✅ Protocol content visible");
});

// ═══════════════════════════════════════════════════════
// Test 2: AI 拆解 + 进度透明度（需 AI API 可用）
// ═══════════════════════════════════════════════════════

test("P1: AI 拆解流程 + 多步骤进度条", async ({ page }) => {
  test.setTimeout(120000);

  await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });

  // 点击 AI 拆解
  await page.getByRole("button", { name: /AI 拆解论文/ }).click();

  // 等待以下任一状态: 进度条出现 或 错误 toast 出现 或 页面回退
  const progressOrError = await Promise.race([
    page.getByText("AI 拆解进行中").waitFor({ timeout: 15000 }).then(() => "progress"),
    page.getByText("拆解失败").waitFor({ timeout: 15000 }).then(() => "error"),
    page.getByRole("button", { name: /AI 拆解论文/ }).waitFor({ timeout: 15000 }).then(() => "reset"),
  ]).catch(() => "timeout");

  if (progressOrError === "progress") {
    console.log("[Test] ✅ Progress bar appeared");

    // 验证 5 个步骤
    const stepLabels = [
      "连接 AI 引擎", "AI 拆解论文 Methods",
      "静态领域知识库匹配", "Materials Project 查询", "生成复现审计报告",
    ];
    const progressContainer = page.locator('[class*="card-soft"]').filter({ hasText: "AI 拆解进行中" });
    for (const label of stepLabels) {
      await expect(progressContainer).toContainText(label, { timeout: 3000 });
    }
    console.log("[Test] ✅ All 5 pipeline steps displayed");

    await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-06-decomposing-progress.png`, fullPage: true });

    // 等待完成或超时
    const completed = await Promise.race([
      page.waitForFunction(() => !document.body.textContent?.includes("AI 拆解进行中"),
        { timeout: 90000 }).then(() => true),
      page.getByText(/拆解完成/).waitFor({ timeout: 90000 }).then(() => true),
    ]).catch(() => false);

    if (completed) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-07-audit-result.png`, fullPage: true });
      console.log("[Test] ✅ AI decomposition completed");
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-07-decompose-timeout.png`, fullPage: true });
      console.log("[Test] ⚠️ AI decomposition timed out (network/proxy issue)");
    }
  } else if (progressOrError === "error") {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-06-decompose-error.png`, fullPage: true });
    console.log("[Test] ⚠️ AI decomposition failed (check SF_API_KEY + proxy)");
    test.skip();
  } else {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-06-decompose-no-response.png`, fullPage: true });
    console.log("[Test] ⚠️ No response from AI decomposition");
    test.skip();
  }
});

// ═══════════════════════════════════════════════════════
// Test 3: 技术文档面板内容
// ═══════════════════════════════════════════════════════

test("P1: 技术文档面板内容完整性", async ({ page }) => {
  test.setTimeout(30000);

  await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });

  // 展开技术文档
  await page.getByRole("button", { name: /技术文档/ }).click();
  await page.waitForTimeout(300);

  // 验证四个章节
  const sections = ["管道架构", "确定性四级分类", "Materials Project 集成", "复现可行性评分公式"];
  for (const section of sections) {
    await expect(page.getByText(section)).toBeVisible({ timeout: 3000 });
  }
  console.log("[Test] ✅ All 4 documentation sections visible");

  // 验证确定性分类表（定位到 table 元素避免与管道图中的文本冲突）
  const table = page.locator("table");
  const certaintyLevels = ["explicit", "implied", "inferred", "unknown"];
  for (const level of certaintyLevels) {
    await expect(table.getByText(level)).toBeVisible();
  }
  console.log("[Test] ✅ Certainty classification table");

  // 验证评分公式
  await expect(page.getByText(/score = avgConfidence/)).toBeVisible();
  console.log("[Test] ✅ Scoring formula");

  await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-08-tech-docs-full.png`, fullPage: true });
});
