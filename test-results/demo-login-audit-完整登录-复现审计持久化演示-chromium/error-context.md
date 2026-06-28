# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demo-login-audit.spec.ts >> 完整登录 + 复现审计持久化演示
- Location: test-harness\demo-login-audit.spec.ts:12:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('复现审计')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('复现审计')

```

```yaml
- banner:
  - link "LabNote Agent 科研数据治理 · 实验复现":
    - /url: /
  - navigation:
    - link "首页":
      - /url: /
    - link "工作台":
      - /url: /workbench
    - link "治理对比":
      - /url: /compare
    - link "Checklist":
      - /url: /checklist
    - link "知识图谱":
      - /url: /graph
    - link "资产包":
      - /url: /assets
    - link "论文辅助":
      - /url: /paper
    - link "项目交接":
      - /url: /handoff
    - link "帮助":
      - /url: /help
  - button "全局搜索…"
  - link "登录":
    - /url: /login
  - link "设置":
    - /url: /settings
- main:
  - text: 登录 LabNote Agent 使用邮箱和密码登录 邮箱
  - textbox "邮箱":
    - /placeholder: researcher@lab.edu.cn
  - text: 密码
  - textbox "密码":
    - /placeholder: 输入密码
  - button
  - button "登录"
  - paragraph:
    - text: 还没有账号？
    - link "注册":
      - /url: /signup
- contentinfo:
  - paragraph: 欢迎科研团队、实验课程及创新创业团队与我们交流合作
  - text: LabNote Agent
  - paragraph: 科研数据治理与实验复现 AI Agent 让每一次实验都成为可复用的科研资产
  - text: 技术生态伙伴：思必驰（AISpeech）智能终端 · 多模态大模型
  - heading "Resources" [level=4]
  - list:
    - listitem:
      - link "📘 使用指南（Getting Started）":
        - /url: /help
    - listitem:
      - link "📄 产品白皮书（White Paper）":
        - /url: "#"
    - listitem:
      - link "🔗 API Documentation（预留）":
        - /url: "#"
    - listitem:
      - text: 📝 更新日志（Changelog）
      - list:
        - listitem: v1.0 实验记录管理
        - listitem: v1.1 AI科研问答
        - listitem: v1.2 Checklist生成
  - heading "Contact" [level=4]
  - list:
    - listitem: 📧 官方邮箱：contact@labnote-agent.com
    - listitem:
      - link "💬 Feedback（Bug反馈/功能建议）":
        - /url: "#"
    - listitem: 👥 用户交流群（二维码预留）
  - text: © 2026 LabNote Agent. All rights reserved.
- region "Notifications alt+T"
- button
```

# Test source

```ts
  1   | /**
  2   |  * 完整演示：登录 → 复现审计 → 云端保存 → 历史验证
  3   |  */
  4   | import { test, expect } from "@playwright/test";
  5   | import path from "path";
  6   | 
  7   | const BASE = "https://labnote-vault-main.vercel.app";
  8   | const SCREENSHOT_DIR = path.resolve("test-harness/demo-screenshots");
  9   | const EMAIL = "Diqing.Tang25@student.xjtlu.edu.cn";
  10  | const PASSWORD = "Cici070628";
  11  | 
  12  | test("完整登录 + 复现审计持久化演示", async ({ page }) => {
  13  |   test.setTimeout(90000);
  14  | 
  15  |   // ════════════════════════════════════════
  16  |   // Step 1: 登录页面
  17  |   // ════════════════════════════════════════
  18  |   console.log("📍 Step 1: 访问登录页面");
  19  |   await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  20  |   await page.waitForTimeout(500);
  21  |   await page.screenshot({ path: `${SCREENSHOT_DIR}/A1-login-page.png`, fullPage: true });
  22  |   console.log("📸 A1 - 登录页面");
  23  | 
  24  |   // 填写邮箱
  25  |   await page.getByPlaceholder(/researcher@lab/).fill(EMAIL);
  26  |   // 填写密码
  27  |   await page.getByPlaceholder(/输入密码/).fill(PASSWORD);
  28  |   await page.screenshot({ path: `${SCREENSHOT_DIR}/A2-login-filled.png`, fullPage: true });
  29  |   console.log("📸 A2 - 已填写邮箱和密码");
  30  | 
  31  |   // 点击登录
  32  |   await page.getByRole("button", { name: "登录" }).click();
  33  |   await page.waitForTimeout(2000);
  34  |   console.log("✅ 登录已提交");
  35  | 
  36  |   // ════════════════════════════════════════
  37  |   // Step 2: 登录后跳转
  38  |   // ════════════════════════════════════════
  39  |   await page.waitForURL("**/workbench**", { timeout: 15000 }).catch(() => {
  40  |     console.log("⚠️ 未跳转到 /workbench，检查当前 URL");
  41  |   });
  42  |   await page.waitForTimeout(500);
  43  |   const currentUrl = page.url();
  44  |   console.log(`📍 当前 URL: ${currentUrl}`);
  45  |   await page.screenshot({ path: `${SCREENSHOT_DIR}/A3-after-login.png`, fullPage: true });
  46  |   console.log("📸 A3 - 登录后页面");
  47  | 
  48  |   // ════════════════════════════════════════
  49  |   // Step 3: 导航到复现审计页面
  50  |   // ════════════════════════════════════════
  51  |   console.log("📍 Step 3: 导航到复现审计");
  52  |   await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });
  53  |   await page.waitForTimeout(500);
  54  |   await page.screenshot({ path: `${SCREENSHOT_DIR}/B1-audit-empty.png`, fullPage: true });
  55  |   console.log("📸 B1 - 复现审计页面（已登录）");
  56  | 
  57  |   // 验证简化后的空状态
> 58  |   await expect(page.getByText("复现审计")).toBeVisible();
      |                                        ^ Error: expect(locator).toBeVisible() failed
  59  |   await expect(page.getByText("论文输入")).toBeVisible();
  60  |   // 验证历史记录区域
  61  |   await expect(page.getByText("历史审计记录")).toBeVisible();
  62  |   console.log("✅ 空状态正确：标题 + 论文输入 + 历史记录 + 帮助按钮");
  63  | 
  64  |   // ════════════════════════════════════════
  65  |   // Step 4: 展开历史记录
  66  |   // ════════════════════════════════════════
  67  |   await page.getByText("历史审计记录").click();
  68  |   await page.waitForTimeout(300);
  69  |   await page.screenshot({ path: `${SCREENSHOT_DIR}/B2-history-expanded.png`, fullPage: true });
  70  |   console.log("📸 B2 - 历史审计记录展开");
  71  | 
  72  |   // ════════════════════════════════════════
  73  |   // Step 5: 加载预设 Audit
  74  |   // ════════════════════════════════════════
  75  |   console.log("📍 Step 5: 加载预设 Audit");
  76  |   await page.getByRole("button", { name: /使用预设 Audit/ }).click();
  77  |   await page.waitForTimeout(800);
  78  |   await page.screenshot({ path: `${SCREENSHOT_DIR}/C1-audit-loaded.png`, fullPage: true });
  79  |   console.log("📸 C1 - 预设 Audit 已加载");
  80  | 
  81  |   // 验证评分仪表盘
  82  |   await expect(page.getByText("复现可行性")).toBeVisible();
  83  |   console.log("✅ 评分仪表盘可见");
  84  | 
  85  |   // 验证 Tab
  86  |   await expect(page.getByRole("button", { name: /📋 参数/ })).toBeVisible();
  87  |   await expect(page.getByRole("button", { name: /🔍 缺口/ })).toBeVisible();
  88  |   await expect(page.getByRole("button", { name: /📄 协议/ })).toBeVisible();
  89  |   console.log("✅ 三个 Tab 可见");
  90  | 
  91  |   // ════════════════════════════════════════
  92  |   // Step 6: 切到缺口 Tab
  93  |   // ════════════════════════════════════════
  94  |   await page.getByRole("button", { name: /🔍 缺口/ }).click();
  95  |   await page.waitForTimeout(300);
  96  |   await page.screenshot({ path: `${SCREENSHOT_DIR}/C2-gaps-tab.png`, fullPage: true });
  97  |   console.log("📸 C2 - 缺口 Tab（按关键程度排序）");
  98  | 
  99  |   // ════════════════════════════════════════
  100 |   // Step 7: 切到协议 Tab
  101 |   // ════════════════════════════════════════
  102 |   await page.getByRole("button", { name: /📄 协议/ }).click();
  103 |   await page.waitForTimeout(300);
  104 |   await page.screenshot({ path: `${SCREENSHOT_DIR}/C3-protocol-tab.png`, fullPage: true });
  105 |   console.log("📸 C3 - 协议 Tab（可下载复现协议）");
  106 | 
  107 |   // ════════════════════════════════════════
  108 |   // Step 8: 打开帮助弹窗
  109 |   // ════════════════════════════════════════
  110 |   console.log("📍 Step 8: 打开帮助弹窗");
  111 |   await page.getByRole("button", { name: /帮助/ }).first().click();
  112 |   await page.waitForTimeout(500);
  113 |   await page.screenshot({ path: `${SCREENSHOT_DIR}/D1-help-modal.png`, fullPage: true });
  114 |   console.log("📸 D1 - 帮助弹窗内容");
  115 | 
  116 |   // 验证弹窗章节
  117 |   const dialog = page.locator("[role=dialog]");
  118 |   await expect(dialog.getByText("AI 管道架构")).toBeVisible();
  119 |   await expect(dialog.getByText("确定性四级分类")).toBeVisible();
  120 |   await expect(dialog.getByText("Materials Project 集成")).toBeVisible();
  121 |   await expect(dialog.getByText("复现可行性评分公式")).toBeVisible();
  122 |   console.log("✅ 帮助弹窗所有章节完整");
  123 | 
  124 |   // 关闭弹窗
  125 |   await page.keyboard.press("Escape");
  126 |   await page.waitForTimeout(200);
  127 | 
  128 |   // ════════════════════════════════════════
  129 |   // Step 9: 返回空状态，验证保存的历史
  130 |   // ════════════════════════════════════════
  131 |   console.log("📍 Step 9: 返回空状态验证持久化");
  132 |   await page.getByRole("button", { name: /重新开始/ }).click();
  133 |   await page.waitForTimeout(300);
  134 |   await page.getByText("历史审计记录").click();
  135 |   await page.waitForTimeout(300);
  136 |   await page.screenshot({ path: `${SCREENSHOT_DIR}/E1-history-after-save.png`, fullPage: true });
  137 |   console.log("📸 E1 - 历史记录（验证审计已保存到云端）");
  138 | 
  139 |   console.log("\n🎉 完整演示流程结束！");
  140 |   console.log("截图保存在: test-harness/demo-screenshots/");
  141 | });
  142 | 
```