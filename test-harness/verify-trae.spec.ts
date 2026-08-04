import { test } from "@playwright/test";
import path from "path";

const BASE = "http://localhost:5173";
const DIR = "D:/labnote/screenshots-competition";

test("01-agent页面", async ({ page }) => {
  await page.goto(`${BASE}/agent`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(DIR, "trae-agent-page.png"), fullPage: true });
});

test("02-首页动画效果", async ({ page }) => {
  await page.goto(BASE);
  await page.waitForTimeout(2000); // 等动画完成
  await page.screenshot({ path: path.join(DIR, "trae-homepage-animation.png"), fullPage: true });
});
