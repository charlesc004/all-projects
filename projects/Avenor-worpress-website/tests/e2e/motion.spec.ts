import { test, expect } from '@playwright/test';

test('strong page entrances preserve heading text and layout on home and solutions', async ({ page }) => {
  test.setTimeout(90000);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ['/', '/work/']) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const heading = page.locator('main h1');
      const original = await heading.evaluate(e => ({ text: e.textContent, height: e.getBoundingClientRect().height }));
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect(heading.locator('.avenor-motion-word').first()).toBeVisible();
      await expect.poll(() => heading.evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
      expect(await heading.textContent()).toBe(original.text);
      expect(await heading.evaluate(e => e.getBoundingClientRect().height)).toBeCloseTo(original.height, 0);
      const card = page.locator('.collection-card').first();
      await card.scrollIntoViewIfNeeded();
      await expect(card).toHaveAttribute('data-motion-entered', 'true');
      await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test('scroll reveals, pointer feedback and reading progress preserve navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-avenor-motion', 'full');
  await expect(page.locator('.hero h1')).toHaveAttribute('data-motion-entered', 'true');
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  const card = page.locator('.services-grid article').first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute('data-motion-entered', 'true');
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  await card.hover({ position: { x: 60, y: 60 } });
  await expect.poll(() => card.evaluate(e => parseFloat((e as HTMLElement).style.getPropertyValue('--avenor-pointer-x')))).toBeGreaterThan(0);
  await expect.poll(() => card.evaluate(e => getComputedStyle(e, '::before').opacity)).toBe('1');
  const button = page.getByRole('link', { name: 'Build what’s next' });
  await button.hover({ position: { x: 24, y: 18 } });
  await expect.poll(() => button.evaluate(e => (e as HTMLElement).style.getPropertyValue('--avenor-magnet-x'))).not.toBe('');
  await page.mouse.move(0, 0);
  await expect.poll(() => button.evaluate(e => (e as HTMLElement).style.getPropertyValue('--avenor-magnet-x'))).toBe('0px');
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await expect.poll(() => page.locator('.avenor-scroll-progress').evaluate(e => parseFloat((e as HTMLElement).style.getPropertyValue('--avenor-progress')))).toBeGreaterThan(0.98);
  await button.click();
  await expect(page).toHaveURL(/\/contact\//);
  expect(errors).toEqual([]);
});

test('reduced motion stays readable and changing the preference cancels active motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-avenor-motion', 'reduced');
  await expect(page.locator('.hero h1')).toHaveCSS('opacity', '1');
  await expect(page.locator('.avenor-scroll-progress')).toBeHidden();
  expect(await page.evaluate(() => document.getAnimations().filter(a => a.id === 'avenor-enter').length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute('data-avenor-motion', 'full');
  await expect(page.locator('.hero h1')).toHaveAttribute('data-motion-entered', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-avenor-motion', 'reduced');
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(a => a.id === 'avenor-enter').length)).toBe(0);
  await expect(page.locator('.hero h1')).toHaveCSS('opacity', '1');
  await page.locator('.faq-list summary').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.faq-list details').first()).toHaveAttribute('open', '');
});

test('touch layout has no magnetic controls, parallax or horizontal overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('.hero-image img')).toHaveCSS('transform', 'none');
    await expect(page.locator('.hero .wp-block-button__link').first()).toHaveCSS('translate', 'none');
    await page.getByRole('button', { name: 'Open menu' }).tap();
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();
    await page.getByRole('button', { name: 'Close menu' }).tap();
    await page.evaluate(() => window.scrollTo({ top: 1800, behavior: 'instant' }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally {
    await context.close();
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('content and navigation remain available without motion enhancement', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.services-grid article')).toHaveCount(3);
    await expect(page.locator('.services-grid article').first()).toHaveCSS('opacity', '1');
    await page.getByRole('link', { name: 'Discover all services' }).click();
    await expect(page).toHaveURL(/\/services\//);
  });
});
