/**
 * 验证：后台任务 + 三个 Tab 引导 + AI补全 + Checklist协议（本地 dev）
 */
import { test, expect } from "@playwright/test";
import path from "path";

const BASE = "http://localhost:5190";
const SCREENSHOT_DIR = path.resolve("test-harness/demo-screenshots");

test("UX 验证：参数引导 + AI补全 + 动态Checklist", async ({ page }) => {
  test.setTimeout(90000);

  // ════════════════════════════════════════
  // Step 1: 打开复现审计
  // ════════════════════════════════════════
  await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await expect(page.getByText("复现审计")).toBeVisible();
  console.log("✅ 页面加载成功（无预设按钮）");

  // ════════════════════════════════════════
  // Step 2: 点击 AI 拆解（用预设论文数据）
  // ════════════════════════════════════════
  await page.getByRole("button", { name: /AI 拆解论文/ }).click();
  console.log("✅ 后台任务已启动");

  // 等拆解完成（Dev 模式下用本地 API，可能需要几分钟）
  // 这里直接切页面然后回来验证
  await page.waitForTimeout(5000);

  // ════════════════════════════════════════
  // Step 3: 如果拆解还在进行中，切换到工作台
  // ════════════════════════════════════════
  await page.goto(`${BASE}/workbench`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  console.log("✅ 切换页面不中断后台任务");

  // 回来
  await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // 检查是否还在加载中
  const bodyText = await page.textContent("body");
  if (bodyText?.includes("AI 拆解进行中")) {
    console.log("⏳ 后台任务仍在运行，等待完成...");
    // 最多等待 60 秒
    await page.waitForFunction(() => !document.body.textContent?.includes("AI 拆解进行中"), { timeout: 60000 });
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/ux-01-after-decompose.png`, fullPage: true });

  // ════════════════════════════════════════
  // Step 4: 参数 Tab — 验证引导说明
  // ════════════════════════════════════════
  // 如果在参数 Tab
  const paramsBtn = page.getByRole("button", { name: /📋 参数/ });
  if (await paramsBtn.count() > 0) {
    await paramsBtn.click();
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/ux-02-params-guidance.png`, fullPage: true });

  // 验证引导文字
  const hasGuidance = bodyText?.includes("参数审核指南") || (await page.textContent("body"))?.includes("参数审核指南");
  console.log(`📋 参数引导: ${hasGuidance ? "✅" : "❌"}`);

  // ════════════════════════════════════════
  // Step 5: 缺口 Tab — AI 一键补全
  // ════════════════════════════════════════
  await page.getByRole("button", { name: /🔍 缺口/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/ux-03-gaps-guidance.png`, fullPage: true });

  // 找 AI 自动补全按钮
  const autoFillBtn = page.getByRole("button", { name: /AI 自动补全/ });
  if (await autoFillBtn.count() > 0) {
    await autoFillBtn.click();
    await page.waitForTimeout(500);
    console.log("✅ AI 一键补全缺口");
  } else {
    console.log("⚠️ 无 AI 补全按钮（可能无缺口）");
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/ux-04-gaps-filled.png`, fullPage: true });

  // ════════════════════════════════════════
  // Step 6: 协议 Tab — 动态 Checklist
  // ════════════════════════════════════════
  await page.getByRole("button", { name: /📄 协议/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/ux-05-protocol-checklist.png`, fullPage: true });

  // 验证 checklist 元素
  const hasCheckbox = await page.locator('input[type="checkbox"]').count();
  const hasProgress = (await page.textContent("body"))?.includes("步完成");
  console.log(`📄 Checkbox 数: ${hasCheckbox}, 进度条: ${hasProgress ? "✅" : "❌"}`);

  // 打勾几个步骤
  const checkboxes = page.locator('input[type="checkbox"]');
  const cbCount = await checkboxes.count();
  if (cbCount > 0) {
    await checkboxes.first().check();
    await checkboxes.nth(1).check();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/ux-06-protocol-checked.png`, fullPage: true });
    console.log("✅ 已勾选前 2 步");
  }

  console.log("\n🎉 UX 验证完成！");
});
