import { test, expect } from "@playwright/test";
const platform = process.env.PLAYWRIGHT_BASE_URL ?? "http://wufud.localhost:3009";
const tenant = process.env.TENANT_BASE_URL ?? "http://demo.wufud.localhost:3009";
const password = process.env.DEMO_PASSWORD ?? "WufudDemo!2026";

test("real host contexts produce different landing pages and navigation", async ({ page }) => {
  await page.goto(platform);
  await expect(page.getByRole("heading", { name: "Hajj & Umrah journeys, beautifully managed." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: "Pricing" })).toBeVisible();
  await page.goto(tenant);
  await expect(page.getByRole("heading", { name: "A sacred journey. A trusted companion." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nur Travels home" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pricing", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Ziyarah Turkey" })).toBeVisible();
  await page.goto(`${tenant}/register`);
  await expect(page.getByLabel("Agency name (optional)")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Nur Travels home" })).toBeVisible();
});

test("live logins open visually distinct workspaces with real records", async ({ browser }) => {
  for (const [base, email, kind] of [[platform,"admin@wufud.local","platform"],[tenant,"owner@demo.local","tenant"]]) {
    const page = await browser.newPage();
    const failures: string[] = [];
    page.on("pageerror", error=>failures.push(error.message));
    await page.goto(`${base}/login`);
    await page.getByLabel("Email", {exact:true}).fill(email);
    await page.getByLabel("Password", {exact:true}).fill(password);
    const accessResponse = page.waitForResponse(response=>response.url().includes("/api/v1/access/me") && response.ok());
    await page.getByRole("button", {name:"Continue",exact:true}).click();
    const access = (await (await accessResponse).json()).data;
    await expect(page.locator(`[data-workspace="${kind}"]`)).toBeVisible({timeout:15000});
    if (kind === "platform") {
      await expect(page.getByRole("heading", {name:"Agency directory"})).toBeVisible();
      await expect(page.getByRole("cell", {name:/Nur Travels/})).toBeVisible();
      await expect(page.locator(".console-sidebar")).toHaveCSS("background-color","rgb(25, 36, 59)");
    } else {
      await expect(page.getByRole("heading", {name:"Upcoming departures"})).toBeVisible();
      await expect(page.getByRole("heading", {name:"Ziyarah Turkey"})).toBeVisible();
      if (access.enabled_features.includes("reports")) {
        await expect(page.getByRole("progressbar", {name:"Booking value collected"})).toBeVisible();
      } else {
        await expect(page.getByRole("progressbar", {name:"Booking value collected"})).toHaveCount(0);
      }
      await expect(page.locator(".console-sidebar")).toHaveCSS("background-color","rgb(255, 255, 255)");
      await expect(page.getByRole("navigation", {name:"Workspace navigation"}).getByRole("link",{name:"Tenants",exact:true})).toHaveCount(0);
    }
    await page.screenshot({path:`/tmp/wufud-live-${kind}-admin.png`,fullPage:true,animations:"disabled"});
    await page.setViewportSize({width:390,height:844});
    await expect(page.getByRole("button",{name:"Open navigation",exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole("button",{name:"Open navigation",exact:true}).click();
    await expect(page.getByRole("navigation",{name:"Workspace navigation"})).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation",{name:"Workspace navigation"})).toBeHidden();
    expect(failures).toEqual([]);
    await page.close();
  }
});

test("tenant mobile landing and workspace host boundaries", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto(tenant);
  await expect(page.getByRole("heading", {name:"Our upcoming departures"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:"/tmp/wufud-live-tenant-mobile.png",fullPage:true,animations:"disabled"});
  await page.goto(`${tenant}/admin`);
  await expect(page.getByRole("heading", {name:"This workspace belongs to a different site"})).toBeVisible();
  await expect(page.locator('[data-workspace="platform"]')).toHaveCount(0);
  await page.goto(`${platform}/dashboard`);
  await expect(page.getByRole("heading", {name:"This workspace belongs to a different site"})).toBeVisible();
});
