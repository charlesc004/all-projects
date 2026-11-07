import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("public navigation highlights the current page or studio section exactly once", async ({
  page,
}) => {
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await page.goto("/");
  await expect(page).toHaveTitle(/— SERENO Studio$/);
  await expect(
    page.getByRole("link", { name: "SERENO home", exact: true }),
  ).toBeVisible();
  await expect(navigation.locator("[aria-current]")).toHaveCount(1);
  await expect(
    navigation.getByRole("link", { name: "Home", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await navigation
    .getByRole("link", { name: "The studio", exact: true })
    .click();
  await expect(page).toHaveURL(/\/#studio$/);
  await expect(navigation.locator("[aria-current]")).toHaveCount(1);
  await expect(
    navigation.getByRole("link", { name: "The studio", exact: true }),
  ).toHaveAttribute("aria-current", "location");
  await expect
    .poll(() =>
      page.locator("#studio").evaluate((el) => el.getBoundingClientRect().top),
    )
    .toBeLessThan(200);
  await navigation.getByRole("link", { name: "Home", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.goto("/services/1");
  await expect(
    navigation.getByRole("link", { name: "Our services", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(navigation.locator("[aria-current]")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await navigation
    .getByRole("link", { name: "Our people", exact: true })
    .click();
  await expect(page).toHaveURL(/\/team$/);
  await expect(
    page.getByRole("button", { name: "Toggle navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/");
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `No horizontal overflow at ${width}px`,
    ).toBe(true);
  }
});

test("public pages are accessible and responsive", async ({ page }) => {
  for (const path of ["/", "/services", "/team", "/book", "/login"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await page.goto("/");
  await page.screenshot({ path: "test-results/screenshots/preview.png" });
  await page.screenshot({
    path: "test-results/screenshots/homepage.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/screenshots/mobile-preview.png",
  });
  await page.screenshot({
    path: "test-results/screenshots/mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("admin pages load without runtime errors or inaccessible controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@sereno.example");
  await page.getByLabel("Password", { exact: true }).fill("SerenoDemo!2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator(".metric-card")).toHaveCount(4);
  await page.screenshot({
    path: "test-results/screenshots/dashboard.png",
    fullPage: true,
  });
  for (const path of [
    "calendar",
    "services",
    "staff",
    "customers",
    "schedules",
    "analytics",
    "settings",
    "notifications",
    "profile",
  ]) {
    await page.goto(`/dashboard/${path}`);
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator('.state[role="status"]')).toHaveCount(0);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  expect(errors).toEqual([]);
});
