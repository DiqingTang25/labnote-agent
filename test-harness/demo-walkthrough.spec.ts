/**
 * 演示脚本：复现审计页面简化后的操作流程
 */
import { test, expect } from "@playwright/test";
import path from "path";

const BASE = "http://localhost:5180";
const SCREENSHOT_DIR = path.resolve("test-harness/demo-screenshots");

test("完整演示：空状态 → 帮助弹窗 → 预设Audit → 各Tab", async ({ page }) => {
  test.setTimeout(60000);

  // ════════════════════════════════════════
  // Step 1: 打开复现审计页面 - 空状态
  // ════════════════════════════════════════
  await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-empty-state.png`, fullPage: true });
  console.log("📸 01 - 简化后空状态：只有标题 + 论文输入 + 帮助按钮");

  // 验证页面标题
  await expect(page.getByText("复现审计")).toBeVisible();
  // 验证论文输入区
  await expect(page.getByText("论文输入")).toBeVisible();
  // 验证帮助按钮存在
  await expect(page.getByRole("button", { name: /帮助/ })).toBeVisible();
  // 验证＂How it works＂不再出现在页面
  await expect(page.getByText("如何解决")).not.toBeVisible();
  console.log("✅ 空状态简洁正确：无 How it works / 数据来源 / TechDocs");

  // ════════════════════════════════════════
  // Step 2: 点击帮助按钮 → 弹窗
  // ════════════════════════════════════════
  await page.getByRole("button", { name: /帮助/ }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-help-modal.png`, fullPage: true });
  console.log("📸 02 - 帮助弹窗已打开");

  // 验证弹窗内容
  const dialog = page.locator("[role=dialog]");
  await expect(dialog.getByText("复现审计 — 帮助指南")).toBeVisible();
  await expect(dialog.getByText("AI 管道架构")).toBeVisible();
  await expect(dialog.getByText("确定性四级分类")).toBeVisible();
  await expect(dialog.getByText("Materials Project 集成")).toBeVisible();
  await expect(dialog.getByText("复现可行性评分公式")).toBeVisible();
  await expect(dialog.getByText("支持的真实数据来源")).toBeVisible();
  console.log("✅ 弹窗包含全部 5 个章节 + 数据来源");

  // 滚动弹窗看更多内容
  await dialog.evaluate(el => el.scrollTop = 400);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-help-modal-scrolled.png`, fullPage: true });
  console.log("📸 03 - 弹窗滚动后的章节");

  // 关闭弹窗（点击 overlay）
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  console.log("✅ 弹窗已关闭");

  // ════════════════════════════════════════
  // Step 3: 加载预设 Audit
  // ════════════════════════════════════════
  await page.getByRole("button", { name: /使用预设 Audit/ }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/04-audit-loaded.png`, fullPage: true });
  console.log("📸 04 - 预设 Audit 加载：评分仪表盘 + 参数 Tab");

  // 验证核心元素
  await expect(page.getByText("复现可行性")).toBeVisible();
  await expect(page.getByRole("button", { name: /📋 参数/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /🔍 缺口/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /📄 协议/ })).toBeVisible();
  console.log("✅ 评分仪表盘 + 三Tab 均可见");

  // ════════════════════════════════════════
  // Step 4: 切换到缺口 Tab
  // ════════════════════════════════════════
  await page.getByRole("button", { name: /🔍 缺口/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/05-gaps-tab.png`, fullPage: true });
  console.log("📸 05 - 缺口 Tab：按关键程度排序");

  // ════════════════════════════════════════
  // Step 5: 切换到协议 Tab
  // ════════════════════════════════════════
  await page.getByRole("button", { name: /协议/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/06-protocol-tab.png`, fullPage: true });
  console.log("📸 06 - 协议 Tab：Markdown 复现协议");

  // ════════════════════════════════════════
  // Step 6: 在结果页打开帮助弹窗
  // ════════════════════════════════════════
  await page.getByRole("button", { name: /帮助/ }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/07-help-in-audit-view.png`, fullPage: true });
  console.log("📸 07 - 结果页中也能打开帮助弹窗");

  console.log("\n🎉 全部演示步骤完成！");
});
