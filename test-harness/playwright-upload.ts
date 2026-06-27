/**
 * Playwright 自动上传脚本 — 真实网页交互
 *
 * 流程: 登录 → 逐个上传4组实验 → 等待管道完成 → 截图验证
 *
 * 用法:
 *   npm run dev                              (先启动开发服务器)
 *   npx tsx test-harness/playwright-upload.ts
 */

import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = "http://localhost:3000";
const EMAIL = "Diqing.Tang25@student.xjtlu.edu.cn";
const PASSWORD = "123456";

const EXPERIMENTS = [
  { name: "exp1-plant-electrophysiology", label: "植物电生理", files: 5 },
  { name: "exp2-tcell-migration", label: "T细胞迁移", files: 4 },
  { name: "exp3-spatial-transcriptomics", label: "空间转录组", files: 5 },
  { name: "exp4-materials-characterization", label: "纳米材料表征", files: 3 },
];

async function main() {
  console.log("🚀 Playwright 自动上传脚本启动\n");

  const screenshotDir = path.resolve(__dirname, "playwright-screenshots");
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    proxy: { server: "http://127.0.0.1:7897" },
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "zh-CN",
  });

  const page = await context.newPage();

  // 捕获浏览器控制台日志（调试用）
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.text().includes("Supabase") || msg.text().includes("insertExperiment") || msg.text().includes("fetchExperiment")) {
      console.log(`  [Browser ${msg.type()}] ${msg.text().slice(0, 200)}`);
    }
  });

  try {
    // ====== Step 1: 登录 ======
    console.log("📝 Step 1: 登录...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.fill("#email", EMAIL);
    await page.fill("#password", PASSWORD);
    await page.click("button[type='submit']");

    // 等待登录完成并跳转到 /workbench
    await page.waitForURL("**/workbench", { timeout: 15000 });
    console.log("  ✅ 登录成功，已跳转到工作台\n");

    // 等待 LabProvider 初始化
    await page.waitForTimeout(2000);

    // ====== Step 2: 逐实验上传 ======
    for (let ei = 0; ei < EXPERIMENTS.length; ei++) {
      const exp = EXPERIMENTS[ei];
      console.log(`📦 Step 2.${ei + 1}: 上传 ${exp.label} (${exp.files} 个文件)...`);

      const dataDir = path.resolve(__dirname, "..", "test-data", exp.name);
      const fileNames = fs.readdirSync(dataDir).filter(f => !f.startsWith("."));
      const filePaths = fileNames.map(f => path.join(dataDir, f));

      console.log(`  文件: ${fileNames.join(", ")}`);

      // 获取当前实验数量（上传后对比）
      const beforeCount = await page.locator("ul li button").count();
      console.log(`  当前实验数: ${beforeCount}`);

      // 设置文件到隐藏的 file input
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePaths);

      console.log(`  ⏳ 等待管道处理...`);

      // 等待新实验卡片出现（最多 3 分钟）
      try {
        await page.waitForFunction(
          (count: number) => {
            const items = document.querySelectorAll("ul li button");
            return items.length > count;
          },
          beforeCount,
          { timeout: 180000, polling: 2000 },
        );
        const afterCount = await page.locator("ul li button").count();
        console.log(`  ✅ 管道完成: ${beforeCount} → ${afterCount} 个实验`);
      } catch {
        console.log(`  ⚠️  超时: 未检测到新实验卡片，继续下一步`);
      }

      // 截图
      await page.screenshot({
        path: path.join(screenshotDir, `upload-${exp.name}.png`),
        fullPage: true,
      });
      console.log(`  📸 截图: upload-${exp.name}.png`);

      // 短暂等待避免 API 限流
      await page.waitForTimeout(3000);
    }

    // ====== Step 3: 截图知识图谱 ======
    console.log(`\n📊 Step 3: 知识图谱页面...`);
    await page.goto(`${BASE_URL}/graph`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(screenshotDir, "graph.png"),
      fullPage: true,
    });
    console.log(`  📸 截图: graph.png`);

    // ====== Step 4: 汇总 ======
    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ 全部完成！`);
    console.log(`截图目录: ${screenshotDir}`);
    console.log(`Supabase Dashboard: https://kwwjdrwcvgjbjxtewbnk.supabase.co`);
    console.log(`${"=".repeat(60)}`);

  } catch (err: any) {
    console.error(`\n❌ 失败:`, err.message);
    await page.screenshot({
      path: path.join(screenshotDir, "error.png"),
      fullPage: true,
    });
    console.log(`错误截图: error.png`);
  } finally {
    await browser.close();
  }
}

main();
