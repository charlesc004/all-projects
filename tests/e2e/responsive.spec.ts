import { test, expect, type BrowserContext, type Page } from '@playwright/test';

let sessionCookies: Awaited<ReturnType<BrowserContext['cookies']>> | undefined;

async function login(page: Page) {
  if (sessionCookies) {
    await page.context().addCookies(sessionCookies);
    await page.goto('/dashboard');
  } else {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: false }).fill(process.env.E2E_EMAIL!);
    await page.getByLabel('Password', { exact: true }).fill('NexusDemo!2026');
    await page.getByRole('button', { name: /sign in/i }).click();
  }
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('main h1')).toBeVisible();
  sessionCookies = await page.context().cookies();
}

async function expectContained(page: Page, width: number) {
  // Absolutely positioned table labels can overflow the root while body width stays correct.
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', width);
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', width);
}

for (const width of [320, 390, 640]) {
  test(`mobile navigation shows labels and supports dismissal at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await login(page);
    const trigger = page.getByRole('button', { name: 'Open navigation', exact: true });
    await trigger.click();
    const drawer = page.getByRole('dialog', { name: 'Main navigation', exact: true });
    await expect(drawer).toBeVisible();
    for (const text of ['Overview', 'Leads', 'Contacts', 'Settings']) {
      await expect(
        drawer.locator('.nexus-nav-text').getByText(text, { exact: true }),
      ).toBeVisible();
    }
    await expect(drawer.locator('.nexus-brand-name')).toBeVisible();
    await expect(drawer.locator('.nexus-profile-copy')).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await page.keyboard.press('Shift+Tab');
    await expect(drawer.locator(':focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole('button', { name: 'Close navigation', exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await trigger.click();
    await page.mouse.click(width - 12, 150);
    await expect(drawer).toHaveCount(0);
    await trigger.click();
    await drawer.getByRole('link', { name: 'Contacts', exact: true }).click();
    await expect(page).toHaveURL(/\/contacts$/);
    await expect(drawer).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await expectContained(page, width);
  });
}

test('desktop collapse stays independent and resizing releases the mobile scroll lock', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await expect(page.locator('aside')).toHaveCSS('width', '76px');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Main navigation', exact: true });
  await expect(drawer.locator('.nexus-nav-text').first()).toBeVisible();
  await expect(drawer.locator('.nexus-brand-name')).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(drawer).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await expect(page.locator('aside')).toHaveCSS('width', '76px');
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  await expect(page.locator('aside')).toHaveCSS('width', '224px');
});

test('short mobile screens can scroll to the account and workspace links close navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 400 });
  await login(page);
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Main navigation', exact: true });
  const account = drawer.getByRole('button', { name: /^Account for/ });
  await account.scrollIntoViewIfNeeded();
  await expect(account).toBeInViewport();
  await account.click();
  await page.getByRole('menuitem', { name: 'My profile' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(drawer).toHaveCount(0);
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await drawer.locator('.nexus-workspace-switch').click();
  await expect(page).toHaveURL(/\/settings\?tab=organization$/);
  await expect(drawer).toHaveCount(0);
});

test('mobile lists, details and other pages contain horizontal scrolling', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  const headers = { 'x-nexus-csrf': '1' };
  const leadResponse = await page.request.post('/api/v1/leads', {
    headers,
    data: {
      firstName: 'Responsive',
      lastName: 'Navigation and long record title review',
      email: `responsive-${Date.now()}@example.test`,
    },
  });
  expect(leadResponse.ok()).toBeTruthy();
  const lead = await leadResponse.json();
  const task = await page.request.post('/api/v1/tasks', {
    headers,
    data: { title: 'Responsive task review', dueDate: '2026-12-10' },
  });
  expect(task.ok()).toBeTruthy();
  for (const width of [320, 390, 640]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of [
      '/dashboard',
      '/leads',
      `/leads/${lead.id}`,
      '/contacts',
      '/companies',
      '/deals',
      '/tasks',
      '/notifications',
      '/reports',
      '/settings',
      '/settings?tab=team',
    ]) {
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expectContained(page, width);
      const table = page.locator('.crm-tableWrap');
      if (await table.count()) {
        await table.evaluate((element) => (element.scrollLeft = element.scrollWidth));
        await expectContained(page, width);
      }
    }
  }
});

test('mobile record forms remain contained and their submit buttons can be reached', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await login(page);
  for (const resource of ['leads', 'contacts', 'companies', 'deals', 'tasks']) {
    await page.goto(`/${resource}`);
    const singular = resource === 'companies' ? 'company' : resource.slice(0, -1);
    const action = resource === 'tasks' ? 'Create task' : `Add ${singular}`;
    await page.getByRole('button', { name: action, exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expectContained(page, 320);
    const submit = dialog.locator('button[type="submit"]');
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  }
});
