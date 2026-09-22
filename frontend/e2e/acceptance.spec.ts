import { test, expect } from "@playwright/test";

const password = process.env.DEMO_PASSWORD ?? "WufudDemo!2026";

test("platform admin can sign in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@wufud.local");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: /Platform overview/i })).toBeVisible({ timeout: 15000 });
});

test("tenant admin can open reports", async ({ browser }) => {
  const page = await browser.newPage({ baseURL: process.env.TENANT_BASE_URL ?? "http://demo.wufud.localhost:3009" });
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@demo.local");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 15000 });
  await page.goto("/dashboard/reports");
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible({ timeout: 15000 });
  await page.close();
});
