import { test, expect } from "@playwright/test";

const tenant = process.env.TENANT_BASE_URL ?? "http://demo.wufud.localhost:3009";
const password = process.env.DEMO_PASSWORD ?? "WufudDemo!2026";

async function browserLogin(page: import("@playwright/test").Page) {
  await page.goto(`${tenant}/login`);
  await page.evaluate(
    async ({ email, pwd }) => {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pwd }),
      });
      const body = await res.json();
      if (!body.success || !body.data?.access_token) {
        throw new Error(body.message ?? "Login failed");
      }
      localStorage.setItem("wufud_access", body.data.access_token);
    },
    { email: "owner@demo.local", pwd: password },
  );
}

test("invalid access token is renewed via refresh cookie without signing out", async ({ page }) => {
  await browserLogin(page);

  await page.evaluate(() => {
    localStorage.setItem("wufud_access", "invalid.access.token");
  });

  await page.goto(`${tenant}/dashboard`);

  await expect(page.getByRole("heading", { name: "Upcoming departures" })).toBeVisible({ timeout: 20_000 });
  await expect(page).not.toHaveURL(/\/login/);

  const stored = await page.evaluate(() => localStorage.getItem("wufud_access"));
  expect(stored).toBeTruthy();
  expect(stored).not.toBe("invalid.access.token");
  expect(stored!.split(".")).toHaveLength(3);
});

test("refresh endpoint accepts consecutive rotations with the refresh cookie", async ({ page }) => {
  await browserLogin(page);

  const first = await page.evaluate(async () => {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    return res.json() as Promise<{ success: boolean; data?: { access_token?: string } }>;
  });
  expect(first.success).toBe(true);
  expect(first.data?.access_token).toBeTruthy();

  const second = await page.evaluate(async () => {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    return res.json() as Promise<{ success: boolean; data?: { access_token?: string } }>;
  });
  expect(second.success).toBe(true);
  expect(second.data?.access_token).toBeTruthy();
});
