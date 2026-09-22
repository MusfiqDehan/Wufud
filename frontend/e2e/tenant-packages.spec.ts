import { test, expect } from "@playwright/test";

test("tenant landing page renders rich package cards with hotels, duration, and inclusions", async ({ browser }) => {
  test.setTimeout(60000);
  const page = await browser.newPage({ baseURL: process.env.TENANT_BASE_URL ?? "http://demo.wufud.localhost:3009" });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Our upcoming departures" })).toBeVisible({ timeout: 15000 });

  // Verify rich package info is visible
  await expect(page.getByText("Hajj 2027").first()).toBeVisible();
  await expect(page.getByText("Ramadan Umrah").first()).toBeVisible();
  await expect(page.getByText("Swissôtel Al Maqam Makkah").first()).toBeVisible();
  await expect(page.getByText("Pullman Zamzam Madinah").first()).toBeVisible();

  // Scroll to journeys section
  const section = page.locator("#journeys");
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  // Capture screenshot of light mode packages section
  await section.screenshot({
    path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/e69d4a45-aaa4-47e2-b466-500b5741db31/tenant_packages_light.png",
  });

  // Switch to Dark Mode
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(500);

  // Capture screenshot of dark mode packages section
  await section.screenshot({
    path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/e69d4a45-aaa4-47e2-b466-500b5741db31/tenant_packages_dark.png",
  });

  // Test opening Quick Details modal
  const detailsBtn = page.getByRole("button", { name: "Details" }).first();
  await detailsBtn.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Comprehensive itinerary, sacred sanctuary accommodations")).toBeVisible();

  // Capture modal screenshot
  await page.screenshot({
    path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/e69d4a45-aaa4-47e2-b466-500b5741db31/package_details_modal.png",
    fullPage: false,
  });

  // Close modal
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Visit /packages page
  await page.goto("/packages");
  await expect(page.getByRole("heading", { name: "Explore Our Journeys" })).toBeVisible();
  await expect(page.getByText("Hajj 2027").first()).toBeVisible();

  // Click on Select & Book
  await page.getByRole("link", { name: "Select & Book" }).first().click();
  await expect(page.getByRole("heading", { name: "Book Your Pilgrimage" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Verified Haram Accommodations")).toBeVisible();
  await expect(page.getByText("Flight & Departure Schedule")).toBeVisible();

  // Capture detail page screenshot
  await page.screenshot({
    path: "/home/musfiqdehan/.gemini/antigravity-ide/brain/e69d4a45-aaa4-47e2-b466-500b5741db31/package_detail_page.png",
    fullPage: false,
  });

  await page.close();
});
