import { test, expect } from "@playwright/test";

test("capture dark mode pagination", async ({ browser }) => {
  const page = await browser.newPage({
    baseURL: process.env.TENANT_BASE_URL ?? "http://demo.wufud.localhost:3000",
    colorScheme: "dark",
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@demo.local");
  await page.getByLabel("Password", { exact: true }).fill(process.env.DEMO_PASSWORD ?? "WufudDemo!2026");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20000 });

  await page.goto("/dashboard/accounts");
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(1000);

  const pagination = page.getByRole("navigation", { name: "Table pagination" }).first();
  await expect(pagination).toBeVisible();

  await page.screenshot({
    path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/e69d4a45-aaa4-47e2-b466-500b5741db31/dark_mode_after.png",
    fullPage: true,
  });

  await pagination.screenshot({
    path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/e69d4a45-aaa4-47e2-b466-500b5741db31/pagination_dark_after.png",
  });

  await page.close();
});
