import { test, expect } from "@playwright/test";
test("synthetic transaction traverses ingestion, inference, policies and investigation", async ({
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
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/demo/transactions") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Generate transaction" }).click();
  const accepted = await response;
  expect(accepted.status()).toBe(202);
  const body = await accepted.json();
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await page
    .locator(".table-toolbar")
    .getByRole("textbox", { name: "Search transactions", exact: true })
    .fill(body.transaction_id);
  await expect(
    page.getByRole("button", {
      name: body.transaction_id.slice(0, 8),
      exact: true,
    }),
  ).toBeVisible({ timeout: 45000 });
  await page
    .getByRole("button", { name: body.transaction_id.slice(0, 8), exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Feature snapshot/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await page.getByRole("link", { name: "Investigations", exact: true }).click();
  await page
    .getByLabel("Filter cases by transaction ID")
    .fill(body.transaction_id);
  await expect(page.locator(".row-link").first()).toBeVisible({
    timeout: 45000,
  });
  await page.locator(".row-link").first().click();
  await page
    .getByLabel("Analyst note")
    .fill("Reviewed synthetic evidence in the end-to-end test.");
  await page
    .getByLabel("Investigation outcome")
    .selectOption("confirmed_fraud");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Save investigation" }).click();
  await expect(
    page.getByText("Investigation saved", { exact: true }),
  ).toBeVisible();
  const feedback = await page.request.get("/api/feedback");
  expect(feedback.ok()).toBeTruthy();
  expect((await feedback.json()).items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        transaction_id: body.transaction_id,
        outcome: "confirmed_fraud",
        feature_version: "features-v1",
      }),
    ]),
  );
});
