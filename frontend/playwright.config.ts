import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://wufud.localhost:3000" },
  webServer: process.env.CI
    ? undefined
    : {
        command: "pnpm --filter frontend dev",
        port: 3000,
        reuseExistingServer: true,
      },
});
