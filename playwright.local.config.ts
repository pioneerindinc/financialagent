import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/local-browser",
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: "https://127.0.0.1:3445",
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
