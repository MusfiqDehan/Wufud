import { test, expect } from "@playwright/test";

test("platform landing renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Hajj/i })).toBeVisible();
});

test("login page has sign-in controls", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
});
