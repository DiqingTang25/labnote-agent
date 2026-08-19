import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test-harness",
  timeout: 120000,
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    headless: process.env.E2E_HEADLESS === "1" ? true : false, // 默认有头方便人工观看；E2E_HEADLESS=1 静默回归
    viewport: { width: 1440, height: 900 },
    screenshot: "on",
    actionTimeout: 30000, // 动作超时（默认 0 = 无限等待，元素被遮挡会挂死整个测试）
    launchOptions: {
      // Chromium 默认读系统代理；系统代理（Clash）挂掉时会是死路 → 强制直连
      args: ["--proxy-server=direct://"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
