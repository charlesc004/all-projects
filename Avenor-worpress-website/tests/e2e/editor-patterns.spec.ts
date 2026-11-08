import { test, expect } from '@playwright/test';
import { login } from './helpers/editor';

test('all native AVENOR patterns parse as editable valid blocks', async ({ page, request }) => {
  test.setTimeout(120000);
  const home = await (await request.get('/wp-json/wp/v2/pages?slug=home')).json();
  await login(page);
  await page.goto(`/wp-admin/post.php?post=${home[0].id}&action=edit`);
  await page.waitForFunction(() => !!(window as any).wp?.blocks?.getBlockType('avenor/contact-form'));
  const review = await page.evaluate(async () => {
    const wp = (window as any).wp;
    const patterns = (await wp.apiFetch({ path: '/wp/v2/block-patterns/patterns' })).filter((p: any) => p.name.startsWith('avenor/'));
    const walk = (items: any[]): any[] => items.flatMap(block => [block, ...walk(block.innerBlocks || [])]);
    return { count: patterns.length, invalid: patterns.flatMap((p: any) => walk(wp.blocks.parse(p.content)).filter(b => b.isValid === false).map(b => `${p.name}: ${b.name}`)) };
  });
  expect(review.count).toBeGreaterThan(15);
  expect(review.invalid).toEqual([]);
});
