import { test, expect } from "@playwright/test";

test("live administration, model monitoring and responsive layouts", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Work email").fill("admin@sentinelml.example");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.DEMO_PASSWORD || "LocalDemo!2026");
  await page.getByRole("button", { name: "Sign in to SentinelML" }).click();
  await expect(
    page.getByRole("heading", { name: /Perspective changes everything/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Assessed transactions", { exact: true }),
  ).toBeVisible();
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["tablet", 834, 1112],
    ["mobile", 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../docs/screenshots/live-dashboard-${name}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Model center", exact: true }).click();
  await expect(
    page.getByText("Precision–recall · holdout test set").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Feature drift & reviewed outcomes" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../docs/screenshots/live-models.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ingestion credentials" }),
  ).toBeVisible();
  const name = `Browser verification ${Date.now()}`;
  await page.getByLabel("Integration name").fill(name);
  await page
    .getByRole("button", { name: "Create API key", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Save your API credential" }),
  ).toBeVisible();
  expect(
    await page.getByRole("dialog").locator("textarea").inputValue(),
  ).toMatch(/^sentinel_sk_[a-f0-9]{64}$/);
  await page.getByRole("button", { name: "Close details" }).click();
  const row = page.getByRole("row").filter({ hasText: name });
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Revoke", exact: true }).click();
  await expect(row.getByText("revoked", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "../docs/screenshots/live-settings.png",
    fullPage: true,
  });
});
