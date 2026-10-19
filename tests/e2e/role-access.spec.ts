import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: false }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('main h1')).toBeVisible();
}

test('admin, manager and sales see their authorized content when switching accounts', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const prefix = `RoleScope${Date.now()}`;
  const password = 'RoleAccess!2026';
  const headers = { 'x-nexus-csrf': '1' };
  await signIn(page, process.env.E2E_EMAIL!, 'NexusDemo!2026');
  const managerEmail = `manager-${prefix}@example.test`;
  const salesEmail = `sales-${prefix}@example.test`;
  let salesId = '';
  for (const [email, name, role] of [
    [managerEmail, 'Role Manager', 'MANAGER'],
    [salesEmail, 'Role Sales', 'SALES_REP'],
  ]) {
    const response = await page.request.post('/api/v1/users', {
      headers,
      data: { name, email, role, password },
    });
    expect(response.ok()).toBeTruthy();
    if (role === 'SALES_REP') salesId = (await response.json()).id;
  }
  const teamLead = await page.request.post('/api/v1/leads', {
    headers,
    data: { firstName: prefix, lastName: 'Team', email: `team-${prefix}@example.test` },
  });
  expect(teamLead.ok()).toBeTruthy();
  const teamLeadId = (await teamLead.json()).id;
  const ownLead = await page.request.post('/api/v1/leads', {
    headers,
    data: {
      firstName: prefix,
      lastName: 'Sales',
      email: `own-${prefix}@example.test`,
      ownerId: salesId,
    },
  });
  expect(ownLead.ok()).toBeTruthy();
  const ownTask = await page.request.post('/api/v1/tasks', {
    headers,
    data: { title: `${prefix} own task`, assigneeId: salesId, dueDate: '2026-12-10' },
  });
  expect(ownTask.ok()).toBeTruthy();
  await page.goto('/settings?tab=team');
  await expect(page.getByRole('button', { name: 'Add member', exact: true })).toBeVisible();
  await page.goto(`/leads?search=${prefix}`);
  await expect(page.getByRole('row').filter({ hasText: `${prefix} Team` })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: `${prefix} Sales` })).toBeVisible();

  // Reuse the same browser context to exercise cache isolation at sign-in.
  await signIn(page, managerEmail, password);
  await expect(page.getByRole('link', { name: 'Reports & analytics', exact: true })).toBeVisible();
  await page.goto(`/leads?search=${prefix}`);
  await expect(page.getByRole('row').filter({ hasText: `${prefix} Team` })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: `${prefix} Sales` })).toBeVisible();
  await page.goto('/settings?tab=team');
  await expect(page.getByRole('heading', { name: 'Your team', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add member', exact: true })).toHaveCount(0);
  await page.goto('/reports');
  await expect(page.locator('main h1')).toContainText('Progress, with perspective.');

  await signIn(page, salesEmail, password);
  await expect(page.getByText('YOUR RECORDS, AT A GLANCE', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Reports & analytics', exact: true })).toHaveCount(0);
  await page.goto(`/leads?search=${prefix}`);
  await expect(page.locator('main h1')).toContainText('My leads');
  await expect(page.getByRole('row').filter({ hasText: `${prefix} Sales` })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: `${prefix} Team` })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Filter by owner' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Archive / })).toHaveCount(0);
  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const stream = await (await downloadReady).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv).toContain(`own-${prefix.toLowerCase()}@example.test`);
  expect(csv).not.toContain(`team-${prefix.toLowerCase()}@example.test`);
  expect((await page.request.get(`/api/v1/leads/${teamLeadId}`)).status()).toBe(404);
  expect((await page.request.get('/api/v1/reports/sales')).status()).toBe(403);

  await page.getByRole('button', { name: 'Search workspace', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search all records' }).fill(prefix);
  const search = page.getByRole('dialog');
  await expect(search.getByText(`${prefix} Sales`, { exact: true })).toBeVisible();
  await expect(search.getByText(`${prefix} Team`, { exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/settings?tab=team');
    await expect(
      page.getByRole('heading', { name: 'Personal information', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Team members', exact: true })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Organization', exact: true })).toHaveCount(0);
    await expect(page.locator('html')).toHaveJSProperty('scrollWidth', width);
  }
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Main navigation', exact: true });
  await expect(drawer.getByRole('link', { name: 'Reports & analytics' })).toHaveCount(0);
  await drawer.getByRole('link', { name: 'Tasks', exact: true }).click();
  await expect(page.locator('main h1')).toContainText('My tasks');
  await expect(page.getByRole('combobox', { name: 'Filter by assignee' })).toHaveCount(0);
  await page.getByRole('button', { name: `Complete ${prefix} own task`, exact: true }).click();
  await expect(
    page.getByRole('button', { name: `Reopen ${prefix} own task`, exact: true }),
  ).toBeVisible();
  await page.goto('/reports');
  await expect(page.getByText('A view for your team leaders', { exact: true })).toBeVisible();
});
