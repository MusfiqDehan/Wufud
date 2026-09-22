import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://wufud.localhost:3009" },
  webServer: process.env.CI
    ? undefined
    : {
        command: "pnpm --filter frontend dev",
        port: 3009,
        reuseExistingServer: true,
      },
});
