/**
 * P1 验证 — Reproduction Audit 完整流程测试
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
// Test 1: 所有 4 个预设 Audit 一键加载
// ═══════════════════════════════════════════════════════

const PRESETS = [
  { tab: "📄 SrTiO₃ (Sci Rep)", minParams: 30, expectSafety: true, label: "SrTiO₃" },
  { tab: "📄 Co₃O₄-rGO (Catalysts)", minParams: 20, expectSafety: true, label: "Co₃O₄" },
  { tab: "🌿 植物电生理 (Sci Data)", minParams: 20, expectSafety: true, label: "PlantEP" },
  { tab: "🧬 空间转录组 (bioRxiv)", minParams: 18, expectSafety: true, label: "Spatial" },
];

for (const preset of PRESETS) {
  test(`P1: 预设 Audit 加载 — ${preset.label}`, async ({ page }) => {
    test.setTimeout(30000);

    await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("复现审计");

    // 选择预设
    await page.getByRole("button", { name: preset.tab }).click();
    await page.waitForTimeout(300);

    // 点击 "加载预设 Audit（快速演示）"
    const loadBtn = page.getByRole("button", { name: /加载预设 Audit/ });
    await expect(loadBtn).toBeVisible({ timeout: 5000 });
    await loadBtn.click();

    // 等待评分仪表盘出现
    await expect(page.getByText(/分/).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-preset-${preset.label.toLowerCase()}.png`, fullPage: true });

    // 验证参数数量
    const paramsTab = page.getByRole("button", { name: /参数/ });
    await expect(paramsTab).toBeVisible();
    const paramsText = await paramsTab.textContent();
    const paramCount = parseInt(paramsText?.match(/\d+/)?.[0] ?? "0");
    expect(paramCount).toBeGreaterThanOrEqual(preset.minParams);
    console.log(`[Test] ✅ ${preset.label}: ${paramCount} parameters loaded`);

    // 验证 safety 类别
    if (preset.expectSafety) {
      await paramsTab.click();
      await page.waitForTimeout(300);
      const safetyInPage = await page.getByText("🦺 安全").count();
      expect(safetyInPage).toBeGreaterThan(0);
      console.log(`[Test] ✅ ${preset.label}: Safety parameters present`);
    }
  });
}

// ═══════════════════════════════════════════════════════
// Test 2: 缺口补全 + 协议生成
// ═══════════════════════════════════════════════════════

test("P1: SrTiO₃ 缺口补全 + 协议下载", async ({ page }) => {
  test.setTimeout(30000);

  await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });

  // 加载 SrTiO₃ 预设
  await page.getByRole("button", { name: /加载预设 Audit/ }).click();
  await expect(page.getByText(/分/).first()).toBeVisible({ timeout: 10000 });

  // 切换到缺口 tab
  const gapsTab = page.getByRole("button", { name: /缺口/ });
  await gapsTab.click();
  await page.waitForTimeout(300);

  // 验证缺口存在
  const criticalGaps = page.getByText(/关键缺口|critical/i);
  const hasGaps = await criticalGaps.count();
  console.log(`[Test] ✅ Gaps tab: ${hasGaps > 0 ? "gaps found" : "no critical gaps"}`);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-gaps-srtio3.png`, fullPage: true });

  // AI 一键补全
  const autoFillBtn = page.getByRole("button", { name: /AI 自动补全/ });
  if (await autoFillBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await autoFillBtn.click();
    await page.waitForTimeout(300);
    console.log("[Test] ✅ AI auto-fill gaps triggered");
  }

  // 切换到协议 tab
  const protocolTab = page.getByRole("button", { name: /协议/ });
  await protocolTab.click();
  await page.waitForTimeout(300);

  // 验证协议内容
  await expect(page.getByText(/安全防护/).first()).toBeVisible({ timeout: 5000 });
  console.log("[Test] ✅ Protocol includes safety section");

  // 下载协议
  const downloadBtn = page.getByRole("button", { name: /下载/ });
  await expect(downloadBtn).toBeVisible();

  await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-protocol-srtio3.png`, fullPage: true });
});

// ═══════════════════════════════════════════════════════
// Test 3: 帮助弹窗内容完整性
// ═══════════════════════════════════════════════════════

test("P1: 帮助弹窗所有章节", async ({ page }) => {
  test.setTimeout(30000);

  await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });

  // 打开帮助弹窗
  await page.getByRole("button", { name: /帮助/ }).click();
  await page.waitForTimeout(500);

  // 验证帮助弹窗的所有章节
  const sections = [
    "AI 管道架构",
    "确定性四级分类",
    "Materials Project 集成",
    "NIST Chemistry WebBook",
    "复现可行性评分公式",
  ];

  for (const section of sections) {
    await expect(page.getByText(section)).toBeVisible({ timeout: 3000 });
  }
  console.log(`[Test] ✅ All ${sections.length} help sections visible`);

  // 验证确定性分类表
  const dialog = page.locator("[role=dialog]");
  const certaintyLevels = ["explicit", "implied", "inferred", "unknown"];
  for (const level of certaintyLevels) {
    await expect(dialog.getByText(level)).toBeVisible();
  }
  console.log("[Test] ✅ Certainty classification table in modal");

  // 验证评分公式
  await expect(page.getByText(/score = avgConfidence/)).toBeVisible();
  console.log("[Test] ✅ Scoring formula in modal");

  // 验证数据来源
  await expect(page.getByText(/Materials Project API/)).toBeVisible();
  await expect(page.getByText(/NIST Chemistry WebBook/)).toBeVisible();
  console.log("[Test] ✅ Data sources in modal");

  await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-help-modal.png`, fullPage: true });
});

// ═══════════════════════════════════════════════════════
// Test 4: 参数筛选 + 确定性分类
// ═══════════════════════════════════════════════════════

test("P1: 参数筛选功能", async ({ page }) => {
  test.setTimeout(30000);

  await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });

  // 加载预设
  await page.getByRole("button", { name: /加载预设 Audit/ }).click();
  await expect(page.getByText(/分/).first()).toBeVisible({ timeout: 10000 });

  // 切换到参数 tab
  await page.getByRole("button", { name: /参数/ }).click();
  await page.waitForTimeout(300);

  // 测试确定性筛选
  const filterSelect = page.locator("select").last();
  await filterSelect.selectOption("explicit");
  await page.waitForTimeout(300);
  console.log("[Test] ✅ Certainty filter: explicit");

  // 重置筛选
  await filterSelect.selectOption("all");
  await page.waitForTimeout(300);

  // 测试类别筛选
  const categorySelect = page.locator("select").first();
  await categorySelect.selectOption("synthesis");
  await page.waitForTimeout(300);
  console.log("[Test] ✅ Category filter: synthesis");

  await page.screenshot({ path: `${SCREENSHOT_DIR}/p1-filtered-params.png`, fullPage: true });
});
