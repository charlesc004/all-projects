import { test, expect } from "@playwright/test";

// Isolated browser UI checks. API interception is test-only and never bundled into the app.
test("login validates input and renders a responsive accessible shell", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: { user: null, csrf_token: "test-only" } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome to your workspace" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../docs/screenshots/login-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign in to SentinelML" }).click();
  await expect(page.getByText("Password is required")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByLabel("Work email")).toBeVisible();
  await page.screenshot({
    path: "../docs/screenshots/login-mobile.png",
    fullPage: true,
  });
});

test("dashboard handles real empty and error states without fabricated records", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "test",
          name: "Test Analyst",
          email: "test@sentinelml.example",
          role: "viewer",
          organization: { id: "test", name: "Test Organization" },
        },
        csrf_token: "test-only",
      },
    }),
  );
  await page.route("**/api/notifications", (route) =>
    route.fulfill({ json: { items: [], unread: 0 } }),
  );
  await page.route("**/api/dashboard", (route) =>
    route.fulfill({
      json: {
        transactions: 0,
        alerts: 0,
        high_risk: 0,
        open_cases: 0,
        trend: [],
        risk_distribution: [],
        recent_alerts: [],
        model: null,
        observed_at: "2026-01-01T12:00:00Z",
      },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Perspective changes everything/ }),
  ).toBeVisible();
  await expect(
    page.getByText("No alerts have been created by the policy engine."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate transaction" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "../docs/screenshots/dashboard-empty.png",
    fullPage: true,
  });
  await page.route("**/api/transactions?**", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Assessment store unavailable" },
    }),
  );
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await expect(page.locator(".error-state")).toContainText(
    "Assessment store unavailable",
    { timeout: 15000 },
  );
});
