import { test, expect } from "@playwright/test";

const api = process.env.TEST_API_URL ?? "http://localhost:4005/api/v1";
const agency = "demo.wufud.localhost";

test("pilgrim access is restricted to own agency and bookings", async ({ request }) => {
  const login = await request.post(`${api}/auth/login`, {
    headers: { "X-Forwarded-Host": agency },
    data: { email: "pilgrim@demo.local", password: process.env.DEMO_PASSWORD ?? "WufudDemo!2026" },
  });
  expect(login.ok()).toBe(true);
  const session = await login.json();
  const headers = { "X-Forwarded-Host": agency, Authorization: `Bearer ${session.data.access_token}` };
  for (const route of ["pos/catalog", "pos/sales", "pos/bookings", "accounts/summary", "reports/summary", "bookings", "vendors", "expenses"]) {
    const response = await request.get(`${api}/${route}`, { headers });
    expect(response.status(), route).toBe(403);
  }
  const create = await request.post(`${api}/pos/installments`, { headers, data: {} });
  expect(create.status()).toBe(403);
  const own = await request.get(`${api}/me/bookings`, { headers });
  expect(own.ok()).toBe(true);
  const ownData = await own.json();
  for (const booking of ownData.data.items) expect(booking.userId).toBe(session.data.user.id);
  const crossTenant = await request.get(`${api}/me/bookings`, { headers: { ...headers, "X-Forwarded-Host": "client2.wufud.localhost" } });
  expect(crossTenant.status()).toBe(403);
});
