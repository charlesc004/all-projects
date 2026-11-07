import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, role: "customer" | "staff" | "admin") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(`${role}@sereno.example`);
  await page.getByLabel("Password", { exact: true }).fill("SerenoDemo!2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(
    role === "customer" ? /\/account$/ : /\/dashboard$/,
  );
}

test("customer books, sees, reschedules and cancels a persisted appointment", async ({
  page,
}) => {
  await login(page, "customer");
  await page.goto("/book");
  await page
    .getByRole("button", { name: "Select The Signature Massage", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select Olivia Bennett", exact: true })
    .click();
  // Use a date far enough ahead to permit changes under the 12-hour policy.
  await page.getByRole("button", { name: "Next month" }).click();
  const day = page.locator(".calendar-grid button.available").nth(2);
  await day.click();
  await page.locator(".time-slots button").first().click();
  await page.getByRole("button", { name: "Review your appointment" }).click();
  await page.getByLabel("Anything we should know?").fill("E2E demo visit");
  await page
    .getByRole("button", { name: "Confirm appointment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "We’ll see you soon." }),
  ).toBeVisible();
  const id = (
    await page.locator(".confirmation-ticket small").innerText()
  ).replace("Appointment #", "");
  await page.getByRole("link", { name: "View my appointments" }).click();
  await page
    .getByRole("button", { name: `View appointment ${id}`, exact: true })
    .click();
  await page.getByRole("link", { name: "Reschedule", exact: true }).click();
  await page.getByRole("button", { name: "Next month" }).click();
  await page.locator(".calendar-grid button.available").nth(4).click();
  await page.locator(".time-slots button").last().click();
  await page.getByRole("button", { name: "Review your appointment" }).click();
  await page
    .getByRole("button", { name: "Confirm appointment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A new time, just for you." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View my appointments" }).click();
  await page
    .getByRole("button", { name: `View appointment ${id}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancel appointment", exact: true })
    .click();
  await page.getByLabel("Reason").fill("E2E complete");
  await page.getByRole("button", { name: "Confirm cancellation" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    page
      .locator(".appointment-card")
      .filter({
        has: page.getByRole("button", {
          name: `View appointment ${id}`,
          exact: true,
        }),
      })
      .getByText("cancelled", { exact: true }),
  ).toBeVisible();
});

test("staff sees assigned appointments and cannot open admin settings", async ({
  page,
}) => {
  await login(page, "staff");
  await expect(page.getByRole("link", { name: "Studio settings" })).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: "Appointments", exact: true }).click();
  await expect(page.locator(".schedule-calendar")).toBeVisible();
  await expect(page.locator(".calendar-event").first()).toBeVisible();
  await page.goto("/dashboard/settings");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("admin can edit weekly hours and sees availability change", async ({
  page,
  request,
}) => {
  await login(page, "admin");
  await page.goto("/dashboard/schedules?staff=1");
  await expect(
    page.getByRole("heading", { name: "Weekly working hours" }),
  ).toBeVisible();
  const original = await page.getByLabel("Saturday end").last().inputValue();
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + 35);
  while (now.getUTCDay() !== 6) now.setUTCDate(now.getUTCDate() + 1);
  const date = now.toISOString().slice(0, 10);
  const before = await request.get(
    `/api/v1/availability?service_id=1&staff_id=1&date=${date}`,
  );
  try {
    await page
      .getByLabel("Saturday end")
      .last()
      .fill(original === "19:00" ? "18:30" : "19:00");
    await page.getByRole("button", { name: "Save working hours" }).click();
    await expect(page.locator(".success-note")).toContainText(
      "Working hours updated",
    );
    const after = await request.get(
      `/api/v1/availability?service_id=1&staff_id=1&date=${date}`,
    );
    expect((await after.json()).slots.length).not.toBe(
      (await before.json()).slots.length,
    );
  } finally {
    await page.getByLabel("Saturday end").last().fill(original);
    await page.getByRole("button", { name: "Save working hours" }).click();
    await expect(page.locator(".success-note")).toContainText(
      "Working hours updated",
    );
  }
});

test("mobile navigation and booking fit a small viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /A little time/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Our services" })
    .click();
  await expect(
    page.getByRole("heading", { name: "What do you need today?" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("new customer can register and competing reservations return one conflict", async ({
  page,
  playwright,
}) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Demo Test Visitor");
  await page
    .getByLabel("Email address")
    .fill(`visitor-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("TestVisitor!2026");
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/account$/);
  const contexts = await Promise.all([
    playwright.request.newContext({ baseURL: "http://localhost:5173" }),
    playwright.request.newContext({ baseURL: "http://localhost:5173" }),
  ]);
  try {
    for (const [index, context] of contexts.entries()) {
      const response = await context.post("/api/v1/auth/login", {
        data: {
          email: index ? "customer2@sereno.example" : "customer@sereno.example",
          password: "SerenoDemo!2026",
        },
      });
      expect(response.status()).toBe(200);
    }
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 45);
    if (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
    const dateText = date.toISOString().slice(0, 10);
    const availability = await contexts[0]!.get(
      `/api/v1/availability?staff_id=1&service_id=1&date=${dateText}`,
    );
    const slot = (await availability.json()).slots[0];
    expect(slot).toBeTruthy();
    const responses = await Promise.all(
      contexts.map(async (context) => {
        const csrf = (await context.storageState()).cookies.find(
          (c) => c.name === "sereno_csrf",
        )!.value;
        return context.post("/api/v1/bookings", {
          headers: { "X-CSRF-Token": csrf },
          data: { staff_id: 1, service_id: 1, start_at: slot },
        });
      }),
    );
    expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
    const winner = responses.findIndex((r) => r.status() === 201);
    const booking = await responses[winner]!.json();
    const csrf = (await contexts[winner]!.storageState()).cookies.find(
      (c) => c.name === "sereno_csrf",
    )!.value;
    expect(
      (
        await contexts[winner]!.post(`/api/v1/bookings/${booking.id}/cancel`, {
          headers: { "X-CSRF-Token": csrf },
          data: { reason: "Concurrency test complete" },
        })
      ).status(),
    ).toBe(200);
  } finally {
    await Promise.all(contexts.map((context) => context.dispose()));
  }
});
