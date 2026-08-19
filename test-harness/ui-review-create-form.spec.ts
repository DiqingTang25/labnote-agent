/**
 * 创建团队表单 UI 审阅截图（一次性脚本）
 * 产出: test-harness/ui-review/（9 步向导：名称→唯一标识→机构→学院→学科→方向→年份→简介→邮箱）
 */
import { test } from "@playwright/test";
import fs from "fs";
import path from "path";

const SHOT_DIR = path.resolve("test-harness/ui-review");

test("创建团队表单 UI 截图", async ({ page }) => {
  test.setTimeout(180000);
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByPlaceholder(/researcher@lab/).fill("test@labnote.tech");
  await page.getByPlaceholder(/输入密码/).fill("LabNoteTest123");
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL("**/workbench**", { timeout: 20000 }).catch(() => {});
  await page.getByText("选择工作空间").waitFor({ timeout: 15000 }).catch(() => {});

  // 1. 选择视图
  await page.screenshot({ path: `${SHOT_DIR}/U1-选择工作空间.png`, fullPage: true });

  // 2. 第 1 步：团队名称（空态）
  await page.getByRole("button", { name: /创建课题组/ }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOT_DIR}/U2-第1步-名称.png`, fullPage: true });

  // 3. 第 1 步：填写名称（自动建议唯一标识）
  await page.getByRole("textbox").fill("王老师智能材料课题组");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOT_DIR}/U3-第1步-名称填写.png`, fullPage: true });
  await page.getByRole("button", { name: "下一步" }).click();

  // 4. 第 2 步：唯一标识（自动建议 + 可用状态）
  await page.getByText("标识可用").waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${SHOT_DIR}/U4-第2步-唯一标识.png`, fullPage: true });
  await page.getByRole("button", { name: "下一步" }).click();

  // 5. 第 3 步：所属机构
  await page.getByRole("textbox").fill("西交利物浦大学");
  await page.screenshot({ path: `${SHOT_DIR}/U5-第3步-机构.png`, fullPage: true });
  await page.getByRole("button", { name: "下一步" }).click();

  // 6. 第 4 步：挂靠学院
  await page.getByRole("textbox").fill("理学院");
  await page.getByRole("button", { name: "下一步" }).click();

  // 7. 第 5 步：学科（24 个常用学科可点选，可自由输入）
  await page.getByRole("textbox").fill("材料");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOT_DIR}/U6-第5步-学科.png`, fullPage: true });
  await page.getByRole("button", { name: "材料科学与工程" }).click();
  await page.getByRole("button", { name: "下一步" }).click();

  // 8. 第 6 步：研究方向
  await page.getByRole("textbox").fill("钙钛矿太阳能电池");
  await page.keyboard.press("Enter");
  await page.screenshot({ path: `${SHOT_DIR}/U7-第6步-研究方向.png`, fullPage: true });
  await page.getByRole("button", { name: "下一步" }).click();

  // 9. 第 7 步：成立年份
  await page.getByRole("textbox").fill("2024");
  await page.getByRole("button", { name: "下一步" }).click();

  // 10. 第 8 步：团队简介
  await page.getByRole("textbox").fill("面向钙钛矿光伏材料的合成、表征与数据治理，推动实验室数据资产化。");
  await page.getByRole("button", { name: "下一步" }).click();

  // 11. 第 9 步：联系邮箱
  await page.getByRole("textbox").fill("wanglab@xjtlu.edu.cn");
  await page.screenshot({ path: `${SHOT_DIR}/U8-第9步-邮箱.png`, fullPage: true });

  // 12. 加入视图（重新加载回到选择页）
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("选择工作空间").waitFor({ timeout: 15000 }).catch(() => {});
  await page.getByRole("button", { name: /输入邀请码加入/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOT_DIR}/U9-输码加入.png`, fullPage: true });

  console.log(`📸 UI 截图已保存到 ${SHOT_DIR}`);
});
