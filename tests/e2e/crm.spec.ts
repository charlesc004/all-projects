import { test, expect, type Page } from '@playwright/test';

const password = 'NexusDemo!2026';
const email = process.env.E2E_EMAIL || 'admin@nexus.demo';
const unique = `Portfolio ${Date.now().toString(36)}`;
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: false }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

test('protects dashboard, validates credentials, and signs in and out', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Email', { exact: false }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: /invalid|incorrect|credentials/i }),
  ).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByRole('button', { name: /user menu|profile menu|account menu/i }).click();
  await page.getByRole('menuitem', { name: /sign out|log out/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('creates, searches, edits, and archives a lead', async ({ page }) => {
  await login(page);
  await page.goto('/leads');
  await page.getByRole('button', { name: 'Add lead', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Create lead', exact: true }).click();
  await expect(dialog.getByText('First name is required')).toBeVisible();
  await dialog.getByLabel('First name', { exact: false }).fill(unique);
  await dialog.getByLabel('Last name', { exact: false }).fill('Everett');
  await dialog.getByLabel('Email', { exact: false }).fill(`portfolio-${Date.now()}@example.test`);
  await dialog.getByLabel('Company', { exact: false }).fill('Cedarstone Labs');
  await dialog.getByRole('button', { name: 'Create lead', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByPlaceholder('Search leads…').fill(unique);
  const row = page.getByRole('row').filter({ hasText: unique });
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: /edit/i }).click();
  await page
    .getByRole('dialog')
    .getByLabel('First name', { exact: false })
    .fill(`${unique} updated`);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: `${unique} updated` })).toBeVisible();
  await page
    .getByRole('row')
    .filter({ hasText: `${unique} updated` })
    .getByRole('button', { name: /archive/i })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /archive/i })
    .click();
  await expect(page.getByRole('row').filter({ hasText: `${unique} updated` })).toHaveCount(0);
});

test('creates a deal and persists an accessible pipeline stage change', async ({ page }) => {
  await login(page);
  await page.goto('/deals');
  await page
    .getByRole('button', { name: /add deal/i })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Deal name', { exact: false }).fill(`${unique} opportunity`);
  await dialog.getByLabel('Value', { exact: false }).fill('12345');
  await dialog.getByLabel('Expected close date', { exact: false }).fill('2026-12-15');
  await dialog.getByRole('button', { name: /create deal/i }).click();
  await expect(dialog).not.toBeVisible();
  const stage = page.getByRole('combobox', { name: `Change stage for ${unique} opportunity` });
  await stage.selectOption('PROPOSAL');
  await page.getByRole('dialog').getByRole('button', { name: 'Update stage', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(stage).toHaveValue('PROPOSAL');
  await page.reload();
  await expect(
    page.getByRole('combobox', { name: `Change stage for ${unique} opportunity` }),
  ).toHaveValue('PROPOSAL');
  await page
    .getByRole('combobox', { name: `Change stage for ${unique} opportunity` })
    .selectOption('LOST');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm lost', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByText('Why was this deal lost? is required', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('dialog')
    .getByLabel('Why was this deal lost?', { exact: false })
    .fill('Customer postponed this project until next year.');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm lost', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page.getByRole('combobox', { name: `Change stage for ${unique} opportunity` }),
  ).toHaveValue('LOST');
  await expect(
    page.getByRole('combobox', { name: `Change stage for ${unique} opportunity` }),
  ).toBeDisabled();
});

test('creates and completes a task and filters completed work', async ({ page }) => {
  await login(page);
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Create task', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Task name', { exact: false }).fill(`${unique} follow-up`);
  await dialog.getByLabel('Due date', { exact: false }).fill('2026-12-10');
  await dialog.getByRole('button', { name: /create task/i }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByPlaceholder('Search tasks…').fill(unique);
  await page.getByRole('button', { name: `Complete ${unique} follow-up` }).click();
  await page.getByRole('tab', { name: /completed/i }).click();
  await expect(page.getByText(`${unique} follow-up`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Reopen ${unique} follow-up` }).click();
  await expect(page.getByText(`${unique} follow-up`, { exact: true })).not.toBeVisible();
  await page.getByRole('tab', { name: 'All tasks', exact: true }).click();
  await page.getByRole('button', { name: `Delete ${unique} follow-up` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete task', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText(`${unique} follow-up`, { exact: true })).not.toBeVisible();
});

test('quick-adds a lead, records a note, and converts related contact, company, and deal', async ({
  page,
}) => {
  await login(page);
  const firstName = `${unique} conversion`;
  const company = `${unique} Cedarstone`;
  const leadEmail = `conversion-${Date.now()}@example.test`;
  await page.goto('/leads?create=true');
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('First name', { exact: false }).fill(firstName);
  await dialog.getByLabel('Last name', { exact: false }).fill('Reed');
  await dialog.getByLabel('Email', { exact: false }).fill(leadEmail);
  await dialog.getByLabel('Company name', { exact: false }).fill(company);
  await dialog.getByRole('button', { name: 'Create lead', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).not.toHaveURL(/create=true/);
  await page.getByPlaceholder('Search leads…').fill(firstName);
  await page.getByRole('link', { name: `${firstName} Reed`, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${firstName} Reed`);
  await page
    .getByLabel('Add a note', { exact: false })
    .fill('Discovery call completed. Decision maker requested a proposal.');
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await expect(
    page.getByText('Discovery call completed. Decision maker requested a proposal.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Convert lead', exact: true }).click();
  await dialog.getByLabel('Deal value', { exact: false }).fill('17000');
  await dialog.getByRole('button', { name: 'Convert lead', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('link', { name: 'View contact →', exact: true }).click();
  await expect(page).toHaveURL(/\/contacts\//);
  await expect(page.getByRole('link', { name: leadEmail, exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: company, exact: true })).toBeVisible();
  await expect(
    page.getByRole('link', { name: `${company} — New opportunity`, exact: true }),
  ).toBeVisible();
});

test('mobile navigation opens and data tables stay usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole('button', { name: /open navigation|open menu|toggle navigation/i }).click();
  await page.getByRole('link', { name: 'Contacts', exact: true }).click();
  await expect(page).toHaveURL(/\/contacts/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Contacts');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
});
