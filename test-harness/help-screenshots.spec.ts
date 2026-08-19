/**
 * 帮助页 14 张截图自动化（精准状态版）
 * 依据：D:\labnote\帮助页截图指南.md + help.tsx FIGURES 规格
 * 规范：视口 1440×900、视口截图（含左侧导航栏）、账号 test@labnote.tech
 * 每张图：先断言目标状态标记可见，再截图——标记不满足即失败（不产出错误截图）
 * 运行：E2E_BASE_URL=<dev> bunx playwright test test-harness/help-screenshots.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path";

const OUT = path.resolve("public/help");
const CARD_A = "Fe3O4光催化降解亚甲基蓝实验"; // test 账号现有卡片
const CARD_B = "Si能带结构与弹性性质第一性原理计算";
const SANITIZE_TEXT = "本实验由张三操作，联系电话 13812345678，联系邮箱 zhang@lab.edu.cn。\n水热反应温度 200°C，反应时间 4 小时。";

async function login(page: Page) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByPlaceholder(/researcher@lab/).fill("test@labnote.tech");
  await page.getByPlaceholder(/输入密码/).fill("LabNoteTest123");
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL("**/workbench**", { timeout: 30000 }).catch(() => {});
  await page.getByText("选择工作空间").waitFor({ timeout: 15000 }).catch(() => {});
  if (await page.getByText("选择工作空间").isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "个人模式" }).click();
    await page.getByText("选择工作空间").waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  }
}

test("帮助页 14 张截图", async ({ page }) => {
  test.setTimeout(900000);
  await login(page);

  /* ── 01 工作台总览（三栏同屏）── */
  // 历史列表只显示前 10 条，用深链接直达 Fe3O4 卡片（exp_mssvdltr12q1）
  await page.goto("/workbench?id=exp_mssvdltr12q1", { waitUntil: "networkidle" });
  // 实验列表加载偶有竞态：右栏空态时重载重试（最多 3 次）
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await expect(page.getByText("AI 置信度评估")).toBeVisible({ timeout: 20000 });
      break;
    } catch {
      await page.reload({ waitUntil: "networkidle" });
    }
  }
  await expect(page.getByText("数据输入")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("历史实验")).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/fig-01-workbench-overview.png` });
  console.log("📸 fig-01 工作台总览");

  /* ── 03 卡片编辑（中栏卡片特写；卡片全长 1865px，裁顶部 16:10 保持可读）── */
  await expect(page.getByText("添加自定义字段")).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(500);
  const cardBox = await page
    .getByText("添加自定义字段")
    .first()
    .locator("xpath=ancestor::*[contains(@class,'card-soft')][1]")
    .boundingBox();
  expect(cardBox, "未找到卡片边界").not.toBeNull();
  await page.screenshot({
    path: `${OUT}/fig-03-card-editor.png`,
    clip: {
      x: Math.round(cardBox!.x),
      y: Math.round(cardBox!.y),
      width: Math.round(cardBox!.width),
      height: Math.round((cardBox!.width * 10) / 16),
    },
  });
  console.log("📸 fig-03 卡片编辑");

  /* ── 04 置信度（右栏置信度面板特写）── */
  await expect(page.getByText("综合置信度")).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(500);
  await page
    .getByText("AI 置信度评估")
    .first()
    .locator("xpath=ancestor::*[contains(@class,'card-soft')][1]")
    .screenshot({ path: `${OUT}/fig-04-confidence.png` });
  console.log("📸 fig-04 置信度");

  /* ── 05 知识问答（问答卡片特写：气泡 + 来源）── */
  await page.getByPlaceholder("向知识库提问…").fill("Fe3O4 光催化实验对亚甲基蓝的降解率是多少？");
  await page.keyboard.press("Enter");
  await expect(page.getByText("来源文档").first()).toBeVisible({ timeout: 90000 });
  await page.waitForTimeout(1000);
  await page
    .getByPlaceholder("向知识库提问…")
    .locator("xpath=ancestor::*[contains(@class,'card-soft')][1]")
    .screenshot({ path: `${OUT}/fig-05-rag-qa.png` });
  console.log("📸 fig-05 知识问答");

  /* ── 02 上传解析（左栏数据输入卡片特写：文件列表 + 进度条）── */
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles("D:/labnote/测试材料/03-时间序列预测/airline-passengers.csv");
  // 轮询解析进度标记（读取中/分析中/提取中），抓到进行中状态立即截
  let caught = false;
  for (let i = 0; i < 60; i++) {
    const stage = await page.locator("text=/读取中|分析中|提取中|识别/").first().isVisible().catch(() => false);
    if (stage) {
      await page.waitForTimeout(400);
      await page
        .getByText("数据输入")
        .first()
        .locator("xpath=ancestor::*[contains(@class,'card-soft')][1]")
        .screenshot({ path: `${OUT}/fig-02-upload-parsing.png` });
      caught = true;
      console.log("📸 fig-02 上传解析（进度进行中）");
      break;
    }
    await page.waitForTimeout(500);
  }
  expect(caught, "fig-02 未抓到解析进行中状态").toBe(true);

  /* ── 06 复现-输入 ── */
  await page.goto("/checklist", { waitUntil: "networkidle" });
  await expect(page.getByText("SrTiO₃").first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("自定义输入").first()).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/fig-06-repro-input.png` });
  console.log("📸 fig-06 复现输入");

  /* ── 07 复现-参数（滚动到参数列表，避开评分卡）── */
  await page.getByText("SrTiO₃").first().click();
  await page.getByRole("button", { name: /加载预设 Audit（快速演示）/ }).click();
  await expect(page.getByText("已加载预设 Audit", { exact: false })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("论文明确").first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("AI 推断").first()).toBeVisible();
  // 滚动：Tab 栏（参数 (N)）贴住视口顶部，从「参数」往下截取
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((n) => n.textContent?.startsWith("参数 ("));
    if (!btn) return;
    const top = btn.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, top - 16) });
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/fig-07-repro-params.png` });
  console.log("📸 fig-07 复现参数");

  /* ── 08 复现-缺口（从「缺口」Tab 往下截取）── */
  await page.getByRole("button", { name: /^缺口/ }).click();
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((n) => n.textContent?.startsWith("缺口 ("));
    if (!btn) return;
    const top = btn.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, top - 16) });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/fig-08-repro-gaps.png` });
  console.log("📸 fig-08 复现缺口");

  /* ── 09 复现-协议（滚动到安全防护 + 勾选框同屏）── */
  await page.getByRole("button", { name: "协议", exact: true }).click();
  await expect(page.getByText("安全防护").first()).toBeVisible({ timeout: 10000 });
  // 滚动到第一个勾选框（其上方即安全防护章节）
  await page.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    cb?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/fig-09-repro-protocol.png` });
  console.log("📸 fig-09 复现协议");

  /* ── 10 图谱全貌（七色图例同屏；数据已充实，重新布局后等力导向收敛）── */
  await page.goto("/graph", { waitUntil: "networkidle" });
  await expect(page.getByText("实验").first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("样品").first()).toBeVisible();
  // 重新布局让图谱收敛成网，再等力导向稳定
  await page.getByRole("button", { name: /重新布局/ }).click().catch(() => {});
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/fig-10-graph-overview.png` });
  console.log("📸 fig-10 图谱全貌");

  /* ── 11 图谱 N-hop ── */
  // 用图谱搜索框选中 Fe3O4 节点（比直接点 SVG 节点更稳定）
  await page.getByPlaceholder("搜索节点…").fill("Fe3O4");
  await page.locator('button:has-text("Fe3O4")').first().click();
  await expect(page.getByText("已选中", { exact: false })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "本地图" }).click();
  // 1 跳：只保留核心节点的直接关联（设备/样品/方法/操作人）。
  // 2 跳会经「操作人」枢纽把整张图谱拉进来，退化成紫色实验节点堆叠
  await page.locator("select").selectOption({ label: "1 跳" });
  await expect(page.getByText("（本地图，1 跳）")).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(4000); // 等邻域过滤后的力导向收敛
  await page.screenshot({ path: `${OUT}/fig-11-graph-nhop.png` });
  console.log("📸 fig-11 图谱 N-hop");

  /* ── 12 论文起草（勾选卡片 + Methods 草稿同屏）── */
  await page.goto("/paper", { waitUntil: "networkidle" });
  await page.getByText(CARD_A).first().click();
  await page.getByText(CARD_B).first().click();
  await page.getByRole("button", { name: /AI 生成 Methods 初稿/ }).click();
  await expect(page.getByText("生成中", { exact: false })).toBeVisible({ timeout: 5000 }).catch(() => {});
  // 等待草稿输出完成（textarea 有内容或生成结束）
  await page.waitForFunction(
    () => {
      const ta = document.querySelector("textarea");
      return !!ta && ta.value.length > 50;
    },
    { timeout: 120000 },
  );
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/fig-12-paper-draft.png` });
  console.log("📸 fig-12 论文起草");

  /* ── 13 资产包 ── */
  await page.goto("/assets", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "导出 Markdown" })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: "导出 JSON" })).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/fig-13-assets-grid.png` });
  console.log("📸 fig-13 资产包");

  /* ── 14 脱敏弹窗（截完点取消）── */
  await page.goto("/checklist", { waitUntil: "networkidle" });
  await page.getByText("自定义输入").click();
  await page.locator("textarea").first().fill(SANITIZE_TEXT);
  await page.getByRole("button", { name: /AI 拆解论文/ }).click();
  await expect(page.getByText("数据脱敏提醒")).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: /脱敏后发送（推荐）/ })).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/fig-14-sanitize-dialog.png` });
  console.log("📸 fig-14 脱敏弹窗");
  await page.getByRole("button", { name: "取消" }).click();

  console.log("🎉 14 张截图完成 → public/help/");
});
