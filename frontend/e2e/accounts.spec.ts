import { test, expect } from "@playwright/test";

test("account overview features stats, charts, ledger and cursor pagination", async ({ browser }) => {
  test.setTimeout(60000);
  const page = await browser.newPage({ baseURL: process.env.TENANT_BASE_URL ?? "http://demo.wufud.localhost:3000" });
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@demo.local");
  await page.getByLabel("Password", { exact: true }).fill(process.env.DEMO_PASSWORD ?? "WufudDemo!2026");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20000 });

  // 1. Visit Account Overview
  await page.goto("/dashboard/accounts");
  await expect(page.getByRole("heading", { name: "Account Overview", exact: true })).toBeVisible();

  // Verify KPI stats are rendered
  await expect(page.getByText("Gross Collections").first()).toBeVisible();
  await expect(page.getByText("Vendor Outflows").first()).toBeVisible();
  await expect(page.getByText("Operating Expenses").first()).toBeVisible();
  await expect(page.getByText("Net Operating Cashflow").first()).toBeVisible();

  // Verify Charts & Analytics sections
  await expect(page.getByText("Cashflow Dynamics (Inflows vs. Outflows)")).toBeVisible();
  await expect(page.getByText("Outflows Allocation")).toBeVisible();
  await expect(page.getByText("Collection Efficiency")).toBeVisible();

  // Verify Recent Financial Activity & Ledger table
  await expect(page.getByRole("heading", { name: "Recent Financial Activity & Ledger" })).toBeVisible();
  const table = page.getByRole("table");
  await expect(table).toBeVisible();

  // Verify pagination navigation bar
  const paginationNav = page.getByRole("navigation", { name: "Table pagination" });
  await expect(paginationNav).toBeVisible();
  await expect(paginationNav.getByRole("button", { name: "Next page" })).toBeVisible();
  await expect(paginationNav.getByRole("button", { name: "Previous page" })).toBeVisible();

  // Save screenshot of the Account Overview page
  await page.screenshot({
    path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/e69d4a45-aaa4-47e2-b466-500b5741db31/account_overview.png",
    fullPage: true,
  });

  // 2. Test Accounts subpages have independent tables with pagination
  for (const name of ["Vendors", "Disbursements", "Stock", "Expenses", "Settlements"]) {
    await page.goto(`/dashboard/accounts/${name.toLowerCase()}`);
    await expect(page.getByText("Opening your workspace…")).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByRole("heading", { name, exact: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("You don't have access", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Loading…", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Could not load this page.", { exact: true })).toHaveCount(0);

    // Each sub-page now has a ManagedTable with pagination
    await expect(page.getByRole("navigation", { name: "Table pagination" }).first()).toBeVisible();

    if (name === "Disbursements") {
      await page.screenshot({
        path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/e69d4a45-aaa4-47e2-b466-500b5741db31/paginated_table.png",
        fullPage: true,
      });
    }
  }

  // 3. Test POS Counter operations
  await page.goto("/dashboard/pos");
  await expect(page.getByRole("heading", { name: "Point of Sale (POS)", exact: true })).toBeVisible();
  await expect(page.getByText("Loading catalog…", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Could not load catalog.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Product or Service" })).toBeVisible();

  await page.close();
});
