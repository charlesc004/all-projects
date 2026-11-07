import { test, expect } from "@playwright/test";

test("access console supports password visibility and narrow screens", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome to your workspace" }),
  ).toBeVisible();
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("VisibilityCheckOnly");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");
  await password.clear();
  for (const width of [1440, 834, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(page.getByLabel("Work email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in to SentinelML" }),
    ).toBeVisible();
  }
});

test("the operations navigation opens every real section and works on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByLabel("Work email").fill("admin@sentinelml.example");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.DEMO_PASSWORD || "LocalDemo!2026");
  await page.getByRole("button", { name: "Sign in to SentinelML" }).click();
  await expect(
    page.getByRole("heading", { name: "Perspective changes everything." }),
  ).toBeVisible();
  for (const name of [
    "Transactions",
    "Fraud alerts",
    "Investigations",
    "Risk analytics",
    "Model center",
    "Risk policies",
    "Live monitoring",
    "Audit history",
    "Settings",
  ]) {
    await page
      .getByRole("navigation", { name: "Workspace navigation" })
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page.locator(".desk-page-heading h1")).toHaveText(`${name}.`);
    await expect(page.locator("#desk-main .skeleton-grid")).toHaveCount(0, {
      timeout: 20000,
    });
    await expect(page.locator("#desk-main .error-state")).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("navigation", { name: "Workspace navigation" })
    .getByRole("link", { name: "Transactions", exact: true })
    .click();
  await expect(page.locator(".desk-page-heading h1")).toHaveText(
    "Transactions.",
  );
  await expect(page.locator(".desk-navigation")).toBeVisible();
  await expect(page.locator("aside")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
