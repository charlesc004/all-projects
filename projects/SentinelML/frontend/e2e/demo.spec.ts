import { test, expect } from "@playwright/test";

test("demo opens the seeded workspace without browser credentials and signs out normally", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Try the live demo", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Work email")).toHaveValue("");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  const rejected = await page.request.post("/api/auth/demo");
  expect(rejected.status()).toBe(403);
  const login = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth/demo") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Try the live demo", exact: true })
    .click();
  const response = await login;
  expect(response.ok()).toBeTruthy();
  expect(response.request().postData()).toBeNull();
  await expect(page.locator(".desk-masthead")).toBeVisible();
  const session = await page.request.get("/api/auth/session");
  expect((await session.json()).user.organization.id).toBe(
    "11111111-1111-4111-8111-111111111111",
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Try the live demo", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../docs/screenshots/demo-login-mobile.png",
    fullPage: true,
  });
});
