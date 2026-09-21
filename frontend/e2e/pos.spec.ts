import { test, expect } from "@playwright/test";

test("POS page enables rapid retail checkout, stock updates, installment collections, and printable receipts", async ({ browser }) => {
  test.setTimeout(90000);
  const page = await browser.newPage({ baseURL: process.env.TENANT_BASE_URL ?? "http://demo.wufud.localhost:3000" });

  // 1. Sign in as Tenant Owner / POS Cashier
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@demo.local");
  await page.getByLabel("Password", { exact: true }).fill(process.env.DEMO_PASSWORD ?? "WufudDemo!2026");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20000 });

  // 2. Open POS Terminal
  await page.goto("/dashboard/pos");
  await expect(page.getByText("Opening your workspace…")).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Point of Sale (POS) & Counter Collections" })).toBeVisible({ timeout: 15000 });

  // 3. Verify KPI Stat Cards
  await expect(page.getByText("Counter Merchandise Sales").first()).toBeVisible();
  await expect(page.getByText("Counter Installment Collections").first()).toBeVisible();
  await expect(page.getByText("Products In Inventory").first()).toBeVisible();

  // 4. Verify Catalog Items Render
  await expect(page.getByText("Ihram set").first()).toBeVisible();
  await expect(page.getByText("Travel bag").first()).toBeVisible();
  await expect(page.getByText("VIP Wheelchair Assistance").first()).toBeVisible();

  // 5. Test Adding Products to Cart
  const addBtn = page.getByRole("button", { name: "Add to Cart" }).first();
  await addBtn.click();

  // Verify Cart reflects items and calculation
  await expect(page.getByText("Current Order Cart")).toBeVisible();
  await expect(page.getByText("Grand Total")).toBeVisible();

  // 6. Test Cash Tender Quick Buttons
  await page.getByRole("button", { name: "Exact" }).click();
  await expect(page.getByText("Change: 0 BDT")).toBeVisible();

  // Test Full Screen Toggle Button for Focused Interaction
  const fullscreenToggle = page.getByRole("button", { name: "Full Screen", exact: true });
  await expect(fullscreenToggle).toBeVisible();
  await fullscreenToggle.click();

  // Expect focused terminal indicator and button label change to Collapse
  await expect(page.getByText("Focused Cashier Terminal Mode")).toBeVisible();
  const collapseToggle = page.getByRole("button", { name: "Collapse", exact: true });
  await expect(collapseToggle).toBeVisible();

  // Capture screenshot of light mode POS in Full Screen Focus mode
  await page.screenshot({
    path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/e69d4a45-aaa4-47e2-b466-500b5741db31/pos_fullscreen_light.png",
    fullPage: false,
  });

  // Switch to Dark Mode in Full Screen
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(400);

  // Capture screenshot of dark mode POS in Full Screen Focus mode
  await page.screenshot({
    path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/e69d4a45-aaa4-47e2-b466-500b5741db31/pos_fullscreen_dark.png",
    fullPage: false,
  });

  // Test Collapsing back to standard layout
  await collapseToggle.click();
  await expect(page.getByText("Focused Cashier Terminal Mode")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Full Screen", exact: true })).toBeVisible();

  // Capture screenshot of standard light mode POS with items in cart
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/e69d4a45-aaa4-47e2-b466-500b5741db31/pos_light_mode.png",
    fullPage: false,
  });

  // 7. Complete Cash Sale and Verify Automatic Receipt Modal
  const checkoutBtn = page.getByRole("button", { name: /Complete Sale & Print Receipt/ });
  await checkoutBtn.click();

  // Expect Printable Receipt Modal to open immediately
  await expect(page.getByRole("dialog", { name: "Transaction Receipt" })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Retail Sales Receipt")).toBeVisible();
  await expect(page.getByRole("button", { name: "Print", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Next Sale" })).toBeVisible();

  // Capture screenshot of Sales Receipt Modal
  await page.screenshot({
    path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/e69d4a45-aaa4-47e2-b466-500b5741db31/pos_sale_receipt.png",
    fullPage: false,
  });

  // Close receipt dialog
  await page.getByRole("button", { name: "Start Next Sale" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // 8. Test "View Receipt" from Recent Sales Table
  const viewReceiptBtn = page.getByRole("button", { name: "View Receipt" }).first();
  await expect(viewReceiptBtn).toBeVisible();
  await viewReceiptBtn.click();
  await expect(page.getByRole("dialog", { name: "Transaction Receipt" })).toBeVisible();
  await page.getByRole("button", { name: "Start Next Sale" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // 9. Switch to "Booking Installment Collections" Mode
  await page.getByRole("button", { name: "Booking Installment Collections" }).click();
  await expect(page.getByText("Select Pilgrim Booking for Counter Collection")).toBeVisible();

  // 10. Select a Booking
  const firstBookingCard = page.getByTestId("pos-booking-card").first();
  await expect(firstBookingCard).toBeVisible();
  await firstBookingCard.click();

  // Verify Booking Details Card & Scheduled Installments
  await expect(page.getByText("Scheduled Installments")).toBeVisible();
  await expect(page.getByText("Total Price").first()).toBeVisible();
  await expect(page.getByText("Remaining Due").first()).toBeVisible();

  // 11. Enter Installment Amount & Tender
  const collectBtn = page.getByRole("button", { name: /Collect & Print Receipt/ });
  await expect(collectBtn).toBeVisible();
  await collectBtn.click();

  // Expect Installment Receipt Modal to open
  await expect(page.getByRole("dialog", { name: "Transaction Receipt" })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Booking Installment Receipt")).toBeVisible();
  await expect(page.getByText("Payment Collected Now")).toBeVisible();

  // Capture screenshot of Installment Receipt Modal
  await page.screenshot({
    path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/e69d4a45-aaa4-47e2-b466-500b5741db31/pos_installment_receipt.png",
    fullPage: false,
  });

  // Close Installment receipt
  await page.getByRole("button", { name: "Start Next Sale" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // 12. Switch History Table to "Installments" Tab
  await page.getByRole("button", { name: /Installments \(/ }).click();
  await expect(page.getByRole("columnheader", { name: "Transaction Ref" })).toBeVisible();
  await expect(page.getByRole("button", { name: "View Receipt" }).first()).toBeVisible();

  await page.close();
});
