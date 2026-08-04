/**
 * 竞赛截图脚本 — 登录后对 Vercel 部署的所有页面截图
 * npx playwright test test-harness/competition-screenshots.spec.ts --headed
 */
import { test } from "@playwright/test";
import path from "path";

const BASE = "https://labnote-vault-main.vercel.app";
const SCREENSHOT_DIR = path.resolve("D:/labnote/screenshots-competition");
const EMAIL = "Diqing.Tang25@student.xjtlu.edu.cn";
const PASSWORD = "123456";

async function stableScreenshot(page: any, name: string, fullPage = false) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, name),
    fullPage,
  });
}

test.describe("LabNote Agent 竞赛截图", () => {

  test.beforeEach(async ({ page }) => {
    // 每个测试前确保已登录
    await page.goto(BASE);
    await page.waitForTimeout(500);

    // 如果被重定向到 login，先登录
    if (page.url().includes("/login")) {
      await page.fill("input[type=\"email\"]", EMAIL);
      await page.fill("input[type=\"password\"]", PASSWORD);
      await page.click("button[type=\"submit\"]");
      await page.waitForURL("**/workbench", { timeout: 15000 });
      await page.waitForTimeout(1000);
    }
  });

  test("01-首页Hero", async ({ page }) => {
    await page.goto(BASE);
    await page.setViewportSize({ width: 1440, height: 900 });
    await stableScreenshot(page, "01-hero.png");
  });

  test("02-首页Dashboard数据", async ({ page }) => {
    await page.goto(BASE);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 650));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02-dashboard.png") });
  });

  test("03-首页三大能力", async ({ page }) => {
    await page.goto(BASE);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 1300));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03-capabilities.png") });
  });

  test("04-工作台三栏", async ({ page }) => {
    await page.goto(`${BASE}/workbench`);
    await page.setViewportSize({ width: 1500, height: 950 });
    await stableScreenshot(page, "04-workbench.png");
  });

  test("05-工作台左侧上传区", async ({ page }) => {
    await page.goto(`${BASE}/workbench`);
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "05-workbench-left.png"),
      clip: { x: 0, y: 0, width: 420, height: 950 },
    });
  });

  test("06-工作台中栏卡片编辑", async ({ page }) => {
    await page.goto(`${BASE}/workbench`);
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "06-workbench-center.png"),
      clip: { x: 420, y: 0, width: 660, height: 950 },
    });
  });

  test("07-工作台右栏RAG问答", async ({ page }) => {
    await page.goto(`${BASE}/workbench`);
    await page.setViewportSize({ width: 1500, height: 950 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "07-workbench-right.png"),
      clip: { x: 1080, y: 0, width: 420, height: 950 },
    });
  });

  test("08-复现审计预设加载", async ({ page }) => {
    await page.goto(`${BASE}/checklist`);
    await page.setViewportSize({ width: 1440, height: 900 });
    // 选择 SrTiO3 预设并加载
    const presetSelect = page.locator("select, [role=\"combobox\"]").first();
    const loadBtn = page.locator("button", { hasText: /加载|Load/i }).first();
    if (await loadBtn.isVisible()) {
      await loadBtn.click();
      await page.waitForTimeout(3000);
    }
    await stableScreenshot(page, "08-audit-loaded.png");
  });

  test("09-复现审计参数表", async ({ page }) => {
    await page.goto(`${BASE}/checklist`);
    await page.setViewportSize({ width: 1440, height: 900 });
    const loadBtn = page.locator("button", { hasText: /加载|Load/i }).first();
    if (await loadBtn.isVisible()) {
      await loadBtn.click();
      await page.waitForTimeout(3000);
    }
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09-params.png") });
  });

  test("10-复现审计缺口", async ({ page }) => {
    await page.goto(`${BASE}/checklist`);
    await page.setViewportSize({ width: 1440, height: 900 });
    const loadBtn = page.locator("button", { hasText: /加载|Load/i }).first();
    if (await loadBtn.isVisible()) {
      await loadBtn.click();
      await page.waitForTimeout(3000);
    }
    const gapsTab = page.locator("button", { hasText: /缺口|Gap/i }).first();
    if (await gapsTab.isVisible()) {
      await gapsTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "10-gaps.png") });
  });

  test("11-复现审计协议", async ({ page }) => {
    await page.goto(`${BASE}/checklist`);
    await page.setViewportSize({ width: 1440, height: 900 });
    const loadBtn = page.locator("button", { hasText: /加载|Load/i }).first();
    if (await loadBtn.isVisible()) {
      await loadBtn.click();
      await page.waitForTimeout(3000);
    }
    const protocolTab = page.locator("button", { hasText: /协议|Protocol/i }).first();
    if (await protocolTab.isVisible()) {
      await protocolTab.click();
      await page.waitForTimeout(500);
    }
    await stableScreenshot(page, "11-protocol.png", true);
  });

  test("12-AI治理对比", async ({ page }) => {
    await page.goto(`${BASE}/compare`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await stableScreenshot(page, "12-compare.png", true);
  });

  test("13-知识图谱", async ({ page }) => {
    await page.goto(`${BASE}/graph`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await stableScreenshot(page, "13-graph.png");
  });

  test("14-论文辅助", async ({ page }) => {
    await page.goto(`${BASE}/paper`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await stableScreenshot(page, "14-paper.png");
  });

  test("15-项目交接", async ({ page }) => {
    await page.goto(`${BASE}/handoff`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await stableScreenshot(page, "15-handoff.png");
  });

  test("16-实验资产包", async ({ page }) => {
    await page.goto(`${BASE}/assets`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await stableScreenshot(page, "16-assets.png");
  });

  test("17-个人设置", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await stableScreenshot(page, "17-settings.png");
  });

  test("18-完整首页", async ({ page }) => {
    await page.goto(BASE);
    await page.setViewportSize({ width: 1440, height: 900 });
    await stableScreenshot(page, "18-homepage-full.png", true);
  });
});
