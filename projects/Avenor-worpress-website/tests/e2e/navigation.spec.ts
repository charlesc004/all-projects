import { test, expect } from '@playwright/test';

test('mobile navigation supports animated exit, rapid reuse and motion preference changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/work/');
  const open = page.getByRole('button', { name: 'Open menu' });
  const close = page.getByRole('button', { name: 'Close menu' });
  const dialog = page.getByRole('dialog', { name: 'Menu' });
  const overlay = page.locator('.wp-block-navigation__responsive-container');
  const navigation = page.locator('header nav.wp-block-navigation');
  const openingLine = open.locator('.avenor-menu-icon > span').first();
  await expect(open.locator('.avenor-menu-icon')).toHaveAttribute('aria-hidden', 'true');
  await expect.poll(() => openingLine.evaluate(e => Math.abs(new DOMMatrix(getComputedStyle(e).transform).b))).toBeLessThan(0.001);
  await open.click();
  await expect(dialog).toBeVisible();
  await expect(navigation).toHaveClass(/is-icon-open/);
  await expect.poll(() => close.locator('.avenor-menu-icon > span').first().evaluate(e => new DOMMatrix(getComputedStyle(e).transform).b)).toBeGreaterThan(0.6);
  await expect.poll(() => close.locator('.avenor-menu-icon > span').last().evaluate(e => new DOMMatrix(getComputedStyle(e).transform).b)).toBeLessThan(-0.6);
  await expect(dialog.locator('.current-menu-item > a')).toContainText('Solutions');
  await expect(dialog.locator('.current-menu-item > a')).toHaveCSS('color', 'rgb(210, 246, 90)');
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  const deferred = await close.evaluate((button: HTMLButtonElement) => {
    button.click();
    return button.closest('.wp-block-navigation__responsive-container')?.classList.contains('is-menu-open');
  });
  expect(deferred).toBe(true);
  await expect(navigation).not.toHaveClass(/is-icon-open/);
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
  await expect.poll(() => openingLine.evaluate(e => Math.abs(new DOMMatrix(getComputedStyle(e).transform).b))).toBeLessThan(0.001);
  await open.click();
  await close.click();
  await expect(dialog).not.toBeVisible();
  await open.click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await overlay.evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
  await expect(page.locator('html')).not.toHaveClass(/has-modal-open/);
});

test('short mobile drawer scrolls to contact actions and keeps keyboard focus inside', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Menu' });
  const email = dialog.getByRole('link', { name: 'hello@example.test' });
  await email.scrollIntoViewIfNeeded();
  await expect(email).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await email.focus();
  await page.keyboard.press('Tab');
  expect(await dialog.evaluate(e => e.contains(e.ownerDocument.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
});
