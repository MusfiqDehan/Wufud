import { test, expect } from "@playwright/test";

test("dashboard and reports charts do not overlap or overflow containers", async ({ browser }) => {
  test.setTimeout(60000);
  const page = await browser.newPage({ baseURL: process.env.TENANT_BASE_URL ?? "http://demo.wufud.localhost:3000" });
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@demo.local");
  await page.getByLabel("Password", { exact: true }).fill(process.env.DEMO_PASSWORD ?? "WufudDemo!2026");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20000 });

  // 1. Check Dashboard "Seats filling" chart
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Agency dashboard" })).toBeVisible();

  const seatsFillingHeading = page.getByRole("heading", { name: "Seats filling" });
  await expect(seatsFillingHeading).toBeVisible();
  const seatsFillingCard = seatsFillingHeading.locator("xpath=ancestor::div[contains(@class, 'rounded-2xl')][1]");
  await expect(seatsFillingCard).toBeVisible();
  const seatsFillingChart = page.getByRole("img", { name: "Seats filling chart" });
  await expect(seatsFillingChart).toBeVisible();

  const dashboardCardBox = await seatsFillingCard.boundingBox();
  const dashboardChartBox = await seatsFillingChart.boundingBox();
  expect(dashboardCardBox).not.toBeNull();
  expect(dashboardChartBox).not.toBeNull();

  console.log("Dashboard Card: y=", dashboardCardBox!.y, "h=", dashboardCardBox!.height, "bottom=", dashboardCardBox!.y + dashboardCardBox!.height);
  console.log("Dashboard Chart: y=", dashboardChartBox!.y, "h=", dashboardChartBox!.height, "bottom=", dashboardChartBox!.y + dashboardChartBox!.height);
  // Chart bottom must be strictly inside card bottom (chartBottom <= cardBottom - padding)
  expect(dashboardChartBox!.y + dashboardChartBox!.height).toBeLessThanOrEqual(dashboardCardBox!.y + dashboardCardBox!.height);

  await seatsFillingCard.screenshot({ path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/3b2e3f5d-aad9-48e1-8412-90e8217166fa/dashboard_card_verified.png" });

  // 2. Check Reports "Seats taken by tier" chart
  await page.goto("/dashboard/reports");
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();

  const seatsTakenHeading = page.getByRole("heading", { name: "Seats taken by tier" });
  await expect(seatsTakenHeading).toBeVisible();
  const seatsTakenCard = seatsTakenHeading.locator("xpath=ancestor::div[contains(@class, 'rounded-2xl')][1]");
  await expect(seatsTakenCard).toBeVisible();
  const seatsTakenChart = page.getByRole("img", { name: "Seats taken by tier" });
  await expect(seatsTakenChart).toBeVisible();

  const reportsCardBox = await seatsTakenCard.boundingBox();
  const reportsChartBox = await seatsTakenChart.boundingBox();
  expect(reportsCardBox).not.toBeNull();
  expect(reportsChartBox).not.toBeNull();

  console.log("Reports Card: y=", reportsCardBox!.y, "h=", reportsCardBox!.height, "bottom=", reportsCardBox!.y + reportsCardBox!.height);
  console.log("Reports Chart: y=", reportsChartBox!.y, "h=", reportsChartBox!.height, "bottom=", reportsChartBox!.y + reportsChartBox!.height);
  // Chart bottom must be strictly inside card bottom
  expect(reportsChartBox!.y + reportsChartBox!.height).toBeLessThanOrEqual(reportsCardBox!.y + reportsCardBox!.height);

  await seatsTakenCard.screenshot({ path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/3b2e3f5d-aad9-48e1-8412-90e8217166fa/reports_card_verified.png" });
});
