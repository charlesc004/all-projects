import { test, expect } from '@playwright/test';

test('homepage anchors, footer return and project invitation form a complete path', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('link', { name: 'Explore the practice' }).click();
  await expect(page).toHaveURL(/#capabilities$/);
  await expect(page.locator('#capabilities h2')).toBeInViewport();
  await page.locator('footer').getByRole('link', { name: 'Back to top' }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole('link', { name: 'Build what’s next' }).click();
  await expect(page).toHaveURL(/\/contact\//);
  await expect(page.getByLabel('Full name')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send inquiry' })).toBeVisible();
});

test('editorial and detail layouts remain readable at narrow and wide desktop extremes', async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    for (const route of ['/insights/', '/privacy/', '/services/digital-strategy/', '/work/corporate-platform/']) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator('main h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('.header-inner')).toHaveCSS('display', 'flex');
      if (width === 320) {
        await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
      } else {
        await expect(page.locator('header').getByRole('link', { name: 'Services', exact: true })).toBeVisible();
      }
    }
  }
});
