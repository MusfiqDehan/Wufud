import { test, expect } from "@playwright/test";

test("permissions page displays roles, system inspect matrix, and custom role permissions", async ({ browser }) => {
  const page = await browser.newPage({ baseURL: process.env.TENANT_BASE_URL ?? "http://demo.wufud.localhost:3009" });
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@demo.local");
  await page.getByLabel("Password", { exact: true }).fill(process.env.DEMO_PASSWORD ?? "WufudDemo!2026");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20000 });

  // Navigate to permissions page
  await page.goto("/dashboard/permissions");
  await expect(page.getByRole("heading", { name: "Role & Feature Access", exact: true })).toBeVisible();

  // Verify StatCards
  await expect(page.getByText("Total Roles")).toBeVisible();
  await expect(page.getByText("System Roles")).toBeVisible();
  await expect(page.getByText("Custom Roles")).toBeVisible();

  // Verify Accounts section in sidebar has all 8 modules + Accounts Overview
  const sidebar = page.locator("#workspace-navigation");
  await expect(sidebar.getByText("Accounts", { exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Payments" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Refunds" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Vendors" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Disbursements" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Stock" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Expenses" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Reconciliation" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "POS" })).toBeVisible();

  // Inspect System Role Matrix (e.g. Accountant)
  const accountantRow = page.getByRole("row").filter({ hasText: "accountant" });
  await expect(accountantRow).toBeVisible();
  await accountantRow.getByRole("button", { name: "View Matrix" }).click();

  // Verify Dialog opens
  const matrixDialog = page.getByRole("dialog");
  await expect(matrixDialog).toBeVisible();
  await expect(matrixDialog.getByText("System Role Matrix")).toBeVisible();
  await expect(matrixDialog.getByRole("heading", { name: "Accounts" })).toBeVisible();
  await expect(matrixDialog.getByText("Reconciliation", { exact: true })).toBeVisible();
  await expect(matrixDialog.getByText("Duplicate as Custom Role")).toBeVisible();

  // Close matrix
  await matrixDialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(matrixDialog).toBeHidden();

  // Test Create Custom Role Modal with preset
  const roleName = `Finance Lead ${Date.now().toString().slice(-4)}`;
  await page.getByRole("button", { name: "Create role", exact: true }).click();
  const createDialog = page.getByRole("dialog");
  await expect(createDialog).toBeVisible();
  await expect(createDialog.getByText("Create New Custom Role")).toBeVisible();
  await createDialog.getByLabel("Role Name").fill(roleName);
  await createDialog.getByLabel("Description (Optional)").fill("Head of finance operations");
  
  // Select Accountant preset
  await createDialog.getByLabel("Accountant").check();
  await createDialog.getByRole("button", { name: "Create Role", exact: true }).click();
  await expect(createDialog).toBeHidden();

  // Verify created role appears in table
  const newRoleRow = page.getByRole("row").filter({ hasText: roleName });
  await expect(newRoleRow).toBeVisible();
  await expect(newRoleRow.getByText("Custom")).toBeVisible();

  // Open permissions matrix for the new custom role
  await newRoleRow.getByRole("button", { name: "Manage Access" }).click();
  const editMatrixDialog = page.getByRole("dialog");
  await expect(editMatrixDialog).toBeVisible();
  await expect(editMatrixDialog.getByText(`Feature Permissions · ${roleName}`)).toBeVisible();

  // Toggle a permission (e.g. Set Bookings to Edit)
  const bookingsRow = editMatrixDialog.locator("div").filter({ hasText: /^Bookings/ }).first();
  await bookingsRow.getByRole("button", { name: "Edit", exact: true }).click();

  // Save Permissions
  await editMatrixDialog.getByRole("button", { name: "Save Permissions" }).click();
  await expect(editMatrixDialog).toBeHidden();

  // Clean up: Archive the test role
  await newRoleRow.getByLabel("Open row actions").click();
  await page.getByRole("menuitem", { name: "Archive role" }).click();
  await expect(page.getByRole("row").filter({ hasText: roleName })).toBeHidden();

  await page.close();
});
