# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demo-background-task.spec.ts >> 后台任务：持久化 + 切换页面验证
- Location: test-harness\demo-background-task.spec.ts:12:1

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.fill: Test timeout of 120000ms exceeded.
Call log:
  - waiting for getByPlaceholder(/researcher@lab/)

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "LabNote Agent 科研数据治理 · 实验复现" [ref=e5] [cursor=pointer]:
          - /url: /
          - img [ref=e7]
          - generic [ref=e9]:
            - generic [ref=e10]: LabNote Agent
            - generic [ref=e11]: 科研数据治理 · 实验复现
        - navigation [ref=e12]:
          - link "首页" [ref=e13] [cursor=pointer]:
            - /url: /
            - img [ref=e14]
            - text: 首页
          - link "工作台" [ref=e17] [cursor=pointer]:
            - /url: /workbench
            - img [ref=e18]
            - text: 工作台
          - link "治理对比" [ref=e20] [cursor=pointer]:
            - /url: /compare
            - img [ref=e21]
            - text: 治理对比
          - link "Checklist" [ref=e25] [cursor=pointer]:
            - /url: /checklist
            - img [ref=e26]
            - text: Checklist
          - link "知识图谱" [ref=e29] [cursor=pointer]:
            - /url: /graph
            - img [ref=e30]
            - text: 知识图谱
          - link "资产包" [ref=e35] [cursor=pointer]:
            - /url: /assets
            - img [ref=e36]
            - text: 资产包
          - link "论文辅助" [ref=e40] [cursor=pointer]:
            - /url: /paper
            - img [ref=e41]
            - text: 论文辅助
          - link "项目交接" [ref=e43] [cursor=pointer]:
            - /url: /handoff
            - img [ref=e44]
            - text: 项目交接
          - link "帮助" [ref=e48] [cursor=pointer]:
            - /url: /help
            - img [ref=e49]
            - text: 帮助
        - generic [ref=e52]:
          - button "全局搜索…" [ref=e53]:
            - img [ref=e54]
            - text: 全局搜索…
          - link "设置" [ref=e57] [cursor=pointer]:
            - /url: /settings
            - img [ref=e58]
    - main [ref=e61]:
      - generic [ref=e63]:
        - heading "404" [level=1] [ref=e64]
        - paragraph [ref=e65]: 页面未找到
        - link "返回首页" [ref=e66] [cursor=pointer]:
          - /url: /
    - contentinfo [ref=e67]:
      - generic [ref=e68]:
        - paragraph [ref=e70]: 欢迎科研团队、实验课程及创新创业团队与我们交流合作
        - generic [ref=e71]:
          - generic [ref=e72]:
            - generic [ref=e73]:
              - img [ref=e75]
              - generic [ref=e77]: LabNote Agent
            - paragraph [ref=e78]:
              - text: 科研数据治理与实验复现 AI Agent
              - text: 让每一次实验都成为可复用的科研资产
            - generic [ref=e79]: 技术生态伙伴：思必驰（AISpeech）智能终端 · 多模态大模型
          - generic [ref=e80]:
            - heading "Resources" [level=4] [ref=e81]:
              - img [ref=e82]
              - text: Resources
            - list [ref=e84]:
              - listitem [ref=e85]:
                - link "📘 使用指南（Getting Started）" [ref=e86] [cursor=pointer]:
                  - /url: /help
                  - img [ref=e87]
                  - text: 📘 使用指南（Getting Started）
              - listitem [ref=e90]:
                - link "📄 产品白皮书（White Paper）" [ref=e91] [cursor=pointer]:
                  - /url: "#"
                  - img [ref=e92]
                  - text: 📄 产品白皮书（White Paper）
              - listitem [ref=e95]:
                - link "🔗 API Documentation（预留）" [ref=e96] [cursor=pointer]:
                  - /url: "#"
                  - img [ref=e97]
                  - text: 🔗 API Documentation（预留）
              - listitem [ref=e100]:
                - generic [ref=e101]:
                  - img [ref=e102]
                  - text: 📝 更新日志（Changelog）
                - list [ref=e105]:
                  - listitem [ref=e106]: v1.0 实验记录管理
                  - listitem [ref=e107]: v1.1 AI科研问答
                  - listitem [ref=e108]: v1.2 Checklist生成
          - generic [ref=e109]:
            - heading "Contact" [level=4] [ref=e110]:
              - img [ref=e111]
              - text: Contact
            - list [ref=e114]:
              - listitem [ref=e115]:
                - img [ref=e116]
                - text: 📧 官方邮箱：contact@labnote-agent.com
              - listitem [ref=e119]:
                - link "💬 Feedback（Bug反馈/功能建议）" [ref=e120] [cursor=pointer]:
                  - /url: "#"
                  - img [ref=e121]
                  - text: 💬 Feedback（Bug反馈/功能建议）
              - listitem [ref=e123]:
                - img [ref=e124]
                - text: 👥 用户交流群（二维码预留）
        - generic [ref=e129]: © 2026 LabNote Agent. All rights reserved.
  - region "Notifications alt+T"
  - button [ref=e130]:
    - img [ref=e131]
```

# Test source

```ts
  1  | /**
  2  |  * 验证：后台任务 + 切换页面不丢失 + 历史持久化
  3  |  */
  4  | import { test, expect } from "@playwright/test";
  5  | import path from "path";
  6  | 
  7  | const BASE = "http://localhost:4180";
  8  | const SCREENSHOT_DIR = path.resolve("test-harness/demo-screenshots");
  9  | const EMAIL = "diqing.tang25@student.xjtlu.edu.cn";
  10 | const PASSWORD = "123456";
  11 | 
  12 | test("后台任务：持久化 + 切换页面验证", async ({ page }) => {
  13 |   test.setTimeout(120000);
  14 | 
  15 |   // ════════════════════════════════════════
  16 |   // Step 1: 登录
  17 |   // ════════════════════════════════════════
  18 |   console.log("📍 登录中...");
  19 |   await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  20 |   await page.waitForTimeout(1000);
> 21 |   await page.getByPlaceholder(/researcher@lab/).fill(EMAIL);
     |                                                 ^ Error: locator.fill: Test timeout of 120000ms exceeded.
  22 |   await page.getByPlaceholder(/输入密码/).fill(PASSWORD);
  23 |   await page.getByRole("button", { name: "登录" }).click();
  24 |   await page.waitForTimeout(3000);
  25 |   console.log(`📍 登录后 URL: ${page.url()}`);
  26 | 
  27 |   // ════════════════════════════════════════
  28 |   // Step 2: 导航到复现审计
  29 |   // ════════════════════════════════════════
  30 |   console.log("📍 导航到 /checklist...");
  31 |   await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });
  32 |   await page.waitForTimeout(2000);
  33 |   await page.screenshot({ path: `${SCREENSHOT_DIR}/bg-step1-page.png`, fullPage: true });
  34 |   console.log(`📍 /checklist URL: ${page.url()}`);
  35 | 
  36 |   // 检查当前页面状态
  37 |   const pageText = await page.textContent("body");
  38 |   console.log(`📍 页面包含 "复现审计": ${pageText?.includes("复现审计")}`);
  39 |   console.log(`📍 页面包含 "论文输入": ${pageText?.includes("论文输入")}`);
  40 |   console.log(`📍 页面包含 "登录": ${pageText?.includes("登录")}`);
  41 |   console.log(`📍 页面包含 "LabNote": ${pageText?.includes("LabNote")}`);
  42 |   // 打印 body 前500字符
  43 |   console.log(`📍 Body 开头: ${pageText?.slice(0, 500)}`);
  44 | 
  45 |   // 如果是 audit 视图，先重置
  46 |   const hasReset = await page.getByRole("button", { name: /重新开始/ }).count();
  47 |   if (hasReset > 0) {
  48 |     console.log("📍 当前在 audit 视图，点击重新开始...");
  49 |     await page.getByRole("button", { name: /重新开始/ }).click();
  50 |     await page.waitForTimeout(500);
  51 |   }
  52 | 
  53 |   // 展开历史
  54 |   const historyBtn = page.getByText("历史审计记录");
  55 |   if (await historyBtn.count() > 0) {
  56 |     await historyBtn.click();
  57 |     await page.waitForTimeout(300);
  58 |     await page.screenshot({ path: `${SCREENSHOT_DIR}/bg-step2-history.png`, fullPage: true });
  59 |     console.log("📸 历史记录已展开");
  60 |   }
  61 | 
  62 |   // ════════════════════════════════════════
  63 |   // Step 3: 加载预设 Audit
  64 |   // ════════════════════════════════════════
  65 |   const presetBtn = page.getByRole("button", { name: /使用预设 Audit/ });
  66 |   const presetCount = await presetBtn.count();
  67 |   console.log(`📍 "使用预设 Audit" 按钮数: ${presetCount}`);
  68 | 
  69 |   if (presetCount > 0) {
  70 |     await presetBtn.click();
  71 |     await page.waitForTimeout(800);
  72 |     await page.screenshot({ path: `${SCREENSHOT_DIR}/bg-step3-audit-loaded.png`, fullPage: true });
  73 |     console.log("📸 预设 Audit 已加载");
  74 |   }
  75 | 
  76 |   // ════════════════════════════════════════
  77 |   // Step 4: 切到工作台再回来
  78 |   // ════════════════════════════════════════
  79 |   await page.goto(`${BASE}/workbench`, { waitUntil: "networkidle" });
  80 |   await page.waitForTimeout(500);
  81 |   console.log("📍 已切换到工作台");
  82 | 
  83 |   await page.goto(`${BASE}/checklist`, { waitUntil: "networkidle" });
  84 |   await page.waitForTimeout(1000);
  85 |   await page.screenshot({ path: `${SCREENSHOT_DIR}/bg-step4-returned.png`, fullPage: true });
  86 |   console.log("📍 返回复现审计");
  87 | 
  88 |   // 展开历史
  89 |   const historyBtn2 = page.getByText("历史审计记录");
  90 |   if (await historyBtn2.count() > 0) {
  91 |     await historyBtn2.click();
  92 |     await page.waitForTimeout(300);
  93 |   }
  94 |   await page.screenshot({ path: `${SCREENSHOT_DIR}/bg-step5-final-history.png`, fullPage: true });
  95 | 
  96 |   console.log("\n🎉 验证完成！");
  97 | });
  98 | 
```