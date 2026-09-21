import { test, expect } from "@playwright/test";

const password = process.env.DEMO_PASSWORD ?? "WufudDemo!2026";

test("self-serve trial creates a unique agency subdomain after email verification", async ({ page, request }) => {
  const slug = `trial${Date.now().toString(36).slice(-6)}`;
  const plans = await request.get("/api/v1/public/plans");
  expect(plans.ok()).toBeTruthy();
  const body = await plans.json();
  const starter = body.data.items.find((p: { slug: string }) => p.slug === "starter") ?? body.data.items[0];
  expect(starter).toBeTruthy();

  const onboard = await request.post("/api/v1/public/onboard", {
    data: {
      agencyName: `Trial ${slug}`,
      slug,
      fullName: "Trial Owner",
      email: `${slug}@onboard.test`,
      password,
      planId: starter.id,
      mode: "trial",
    },
  });
  expect(onboard.ok()).toBeTruthy();
  const onboardBody = await onboard.json();
  expect(onboardBody.data.status).toBe("pending_verification");
  const verifyUrl = onboardBody.data.verify_url as string | undefined;
  expect(verifyUrl).toBeTruthy();

  await page.goto(verifyUrl!);
  await expect(page.getByRole("heading", { name: /workspace is live/i })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("link", { name: new RegExp(slug, "i") })).toBeVisible();
});
