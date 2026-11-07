import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test('homepage uses live service and project collections', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('MAKE YOUR');
  await expect(page.locator('.services-grid article')).toHaveCount(3);
  await expect(page.locator('.services-grid h3.card-title')).toHaveCount(3);
  await expect(page.locator('.case-studies-grid:not(.portfolio-grid) article')).toHaveCount(0);
  await expect(page.locator('.portfolio-grid article')).toHaveCount(1);
  await page.locator('header').getByRole('link', { name: 'Services', exact: true }).click();
  await expect(page).toHaveURL(/\/services\//);
});

test('service archive, taxonomy filter, and detail work', async ({ page }) => {
  await page.goto('/services/');
  await expect(page.locator('.services-grid article')).toHaveCount(6);
  await expect(page.locator('.services-grid h2.card-title')).toHaveCount(6);
  await page.getByRole('link', { name: 'Strategy', exact: true }).click();
  await expect(page.locator('.services-grid article')).toHaveCount(2);
  await page.getByRole('heading', { name: 'Digital Strategy' }).getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Digital Strategy');
  await expect(page.getByRole('heading', { name: 'What we can help with' })).toBeVisible();
});

test('solution filters and architecture details work', async ({ page }) => {
  await page.goto('/work/');
  await expect(page.locator('.case-studies-grid article')).toHaveCount(6);
  await expect(page.locator('.case-studies-grid h2.card-title')).toHaveCount(6);
  await page.getByRole('link', { name: 'Real estate', exact: true }).click();
  await expect(page.locator('.case-studies-grid article')).toHaveCount(1);
  await page.locator('.case-studies-grid .card-title a').click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Corporate publishing platform');
  await expect(page.getByRole('heading', { name: 'Acceptance criteria' })).toBeVisible();
});

test('articles, search and 404 use WordPress routing', async ({ page }) => {
  await page.goto('/insights/');
  await page.locator('main .wp-block-post-title a').first().click();
  await expect(page.getByRole('heading', { name: 'Start with understanding' })).toBeVisible();
  await page.goto('/?s=roadmap');
  await expect(page.locator('main')).toContainText('A digital roadmap should make decisions easier');
  const response = await page.goto('/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('back on course');
});

test('server validation, honeypot, payload limit and inquiry privacy', async ({ request }) => {
  const invalid = await request.post('/wp-json/avenor/v1/contact', { data: { name: 'A', email: 'invalid', message: 'short' } });
  expect(invalid.status()).toBe(422);
  const spam = await request.post('/wp-json/avenor/v1/contact', { data: { name: 'Integration Tester', email: 'test@example.test', message: 'A sufficiently detailed integration inquiry for testing.', privacy: true, website: 'spam' } });
  expect(spam.status()).toBe(422);
  const huge = await request.post('/wp-json/avenor/v1/contact', { data: { message: 'x'.repeat(17000) } });
  expect(huge.status()).toBe(413);
  const privateRoute = await request.get('/wp-json/wp/v2/avenor_inquiry');
  expect(privateRoute.status()).toBe(404);
  const search = await request.get('/wp-json/wp/v2/search?search=Workflow%20verification');
  expect(await search.json()).toEqual([]);
});

test('accessible form submits, acknowledges success, and deduplicates', async ({ page, request }) => {
  const message = `A project inquiry for browser verification ${Date.now()}.`;
  await page.goto('/contact/');
  await page.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(page.locator('input[name=name]:invalid')).toHaveCount(1);
  await page.getByLabel('Full name').fill('Browser Test Person');
  await page.getByLabel('Email', { exact: false }).fill('browser@example.test');
  await page.getByLabel('Tell us a little').fill(message);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(page.getByRole('status')).toHaveText('Your inquiry has been received. Thank you.');
  const duplicate = await request.post('/wp-json/avenor/v1/contact', { data: { name: 'Browser Test Person', email: 'browser@example.test', message, privacy: true } });
  expect(duplicate.status()).toBe(201);
  expect((await duplicate.json()).duplicate).toBe(true);
});

test('mobile navigation supports keyboard, close and links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const open = page.getByRole('button', { name: 'Open menu' });
  await open.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
  await open.click();
  await page.locator('header').getByRole('link', { name: 'Solutions', exact: true }).click();
  await expect(page).toHaveURL(/\/work\//);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('native form submission persists and redirects to feedback', async ({ page }) => {
    await page.goto('/contact/');
    await page.getByLabel('Full name').fill('Native Form Person');
    await page.getByLabel('Email', { exact: false }).fill('native@example.test');
    await page.getByLabel('Tell us a little').fill(`A project inquiry using the native HTML form ${Date.now()}.`);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Send inquiry' }).click();
    await expect(page).toHaveURL(/inquiry=sent/);
    await expect(page.getByRole('status')).toHaveText('Your inquiry has been received. Thank you.');
  });
});

test('mobile drawer has useful content, closes outside and adapts to resizing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const open = page.getByRole('button', { name: 'Open menu' });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Menu' });
  await expect(dialog.getByRole('link', { name: 'AVENOR', exact: true })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Let’s make it happen' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'hello@example.test' })).toBeVisible();
  await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))));
  await page.screenshot({ path: 'artifacts/visual-review/menu-390.png' });
  await page.locator('.wp-block-navigation__responsive-container.is-menu-open').click({ position: { x: 8, y: 300 } });
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
  await open.click();
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(page.locator('.wp-block-navigation__responsive-container')).not.toHaveClass(/is-menu-open/);
  await expect(page.locator('header').getByRole('link', { name: 'Services', exact: true })).toBeVisible();
});

test('new homepage sections and keyboard FAQ work', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.engagement-card')).toHaveCount(0);
  await expect(page.locator('.insights-preview .wp-block-post')).toHaveCount(2);
  const summary = page.locator('.faq-list summary').first();
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.faq-list details').first()).toHaveAttribute('open', '');
  await expect(page.locator('.faq-list details').first().locator('p')).toBeVisible();
  await page.goto('/contact/');
  await expect(page.locator('.contact-next')).toContainText('We review your goals');
});

test('desktop and mobile pages render without overflow or broken images', async ({ page }) => {
  test.setTimeout(240000);
  mkdirSync('artifacts/visual-review', { recursive: true });
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [slug, name] of [['/', 'home'], ['/services/', 'services'], ['/work/', 'work'], ['/contact/', 'contact'], ['/about/', 'about']]) {
      await page.goto(slug);
      // Scroll through the page so native lazy-loaded images are included in the capture.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          window.scrollTo({ top: y, behavior: 'instant' });
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      await page.locator('img').evaluateAll(async (images: HTMLImageElement[]) => { await Promise.all(images.map((img) => img.decode().catch(() => {}))); });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(await page.locator('img').evaluateAll((images: HTMLImageElement[]) => images.every((img) => img.complete && img.naturalWidth > 0))).toBe(true);
      await page.screenshot({ path: `artifacts/visual-review/${name}-${width}.png`, fullPage: true });
    }
  }
});

test('night theme and business pages contain only release content', async ({ page }) => {
  for (const route of ['/', '/about/', '/services/', '/work/', '/work/corporate-platform/', '/privacy/', '/contact/']) {
    await page.goto(route);
    const copy = await page.locator('body').innerText();
    expect(copy).not.toMatch(/\bdemo\b|fictional|demonstration|concept portfolio|sample inquiry/i);
    const color = await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(color).toBe('rgb(16, 17, 19)');
  }
  await page.goto('/');
  await expect(page.locator('.standard-card, .industry-card, .platform-item')).toHaveCount(0);
  await expect(page.locator('.testimonials, .team-grid')).toHaveCount(0);
  await expect(page.locator('.testimonials article, .team-grid article')).toHaveCount(0);
  await expect(page.locator('.expertise-card, .partnership-card')).toHaveCount(0);
});

test('in-house portfolio opens a factual implementation case study', async ({ page }) => {
  await page.goto('/');
  await page.locator('.portfolio-grid .card-title a').click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AVENOR');
  await expect(page.getByRole('heading', { name: 'Inquiry workflow', exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText('Client: AVENOR. Project type: in-house');
  await page.goto('/about/');
  await expect(page.locator('.expertise-card')).toHaveCount(4);
  await expect(page.locator('.partnership-card')).toHaveCount(2);
});
