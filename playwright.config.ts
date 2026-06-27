import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test-harness",
  timeout: 120000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://localhost:5173",
    headless: false, // 用户想看完整 UI 流程
    viewport: { width: 1440, height: 900 },
    screenshot: "on",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
