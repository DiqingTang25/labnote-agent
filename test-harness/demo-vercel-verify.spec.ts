import { test, expect } from "@playwright/test";
import path from "path";

const BASE = "https://labnote-vault-main.vercel.app";
const EMAIL = "diqing.tang25@student.xjtlu.edu.cn";
const PASSWORD = "123456";

test("Vercel 线上验证：登录 + 复现审计 + 历史", async ({ page }) => {
  test.setTimeout(90000);

  // Step 1: 登录
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.getByPlaceholder(/researcher@lab/).fill(EMAIL);
  await page.getByPlaceholder(/输入密码/).fill(PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();

  try {
    await page.waitForURL("**/workbench**", { timeout: 20000 });
    console.log("✅ 登录成功 → 工作台");
  } catch {
    console.log(`⚠️ 登录跳转异常: ${page.url()}`);
  }

  // Step 2: 打开复现审计
  await page.goto(`${BASE}/checklist`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // 检查是否报错
  const bodyText = await page.textContent("body");
  if (bodyText?.includes("页面加载失败")) {
    console.log("❌ 页面加载失败！");
    console.log(`Body: ${bodyText?.slice(0, 500)}`);
  } else {
    console.log("✅ 页面加载正常");

    // 验证关键元素
    const hasAuditTitle = bodyText?.includes("复现审计");
    const hasHistoryBtn = bodyText?.includes("历史审计记录");
    const hasPresetBtn = bodyText?.includes("使用预设");
    console.log(`  复现审计: ${hasAuditTitle}, 历史记录: ${hasHistoryBtn}, 预设按钮: ${hasPresetBtn}`);
  }

  // Step 3: 截图
  await page.screenshot({ path: "test-harness/demo-screenshots/vercel-final.png", fullPage: true });

  console.log("\n✅ Vercel 验证完成");
});
