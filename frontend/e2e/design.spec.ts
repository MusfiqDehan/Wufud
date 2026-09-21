import { test, expect } from "@playwright/test";

test("public pages fit mobile and registration fields are labelled", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/login", "/register", "/packages"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto("/register");
  await expect(page.getByLabel("Full name", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
});

test("workspace mobile navigation opens, closes with Escape, and changes pages", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/**", async route => {
    const data = new URL(route.request().url()).pathname.endsWith("/access/me")
      ? { user_id: "test", full_name: "Test Admin", email: "admin@example.com", is_platform_admin: true, is_tenant_admin: false, role_slugs: [], permissions: {}, enabled_features: [], package_gated_features: [] }
      : { items: [] };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/admin");
  const opener = page.getByRole("button", { name: "Open navigation", exact: true });
  const nav = page.getByRole("navigation", { name: "Workspace navigation" });
  await expect(nav).toBeHidden();
  await opener.click();
  await expect(nav).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await nav.getByRole("link", { name: "Tenants", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tenants", exact: true })).toBeVisible();
  await expect(nav).toBeHidden();
});

test("package search filters results and explains no matches", async ({ page }) => {
  await page.route("**/api/**/packages", route => route.fulfill({ json: { success: true, data: { items: [{ id: "one", name: "Ramadan Journey", kind: "umrah", departureDate: "2027-02-01" }] } } }));
  await page.goto("/packages");
  await expect(page.getByRole("heading", { name: "Ramadan Journey" })).toBeVisible();
  await page.getByRole("textbox", { name: "Search packages" }).fill("nonexistent");
  await expect(page.getByRole("heading", { name: "No matching journeys" })).toBeVisible();
  await page.getByRole("textbox", { name: "Search packages" }).fill("umrah");
  await expect(page.getByRole("heading", { name: "Ramadan Journey" })).toBeVisible();
});
