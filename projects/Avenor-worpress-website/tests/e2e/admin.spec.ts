import { test, expect } from '@playwright/test';
import { login, invalidEditorBlocks } from './helpers/editor';

test('administrator can publish a service, edit the homepage, and manage inquiries', async ({ page, request }) => {
  test.setTimeout(180000);
  const workflow = await request.post('/wp-json/avenor/v1/contact', { data: { name: 'Workflow verification', email: 'workflow-verify@example.test', message: `Administrative workflow verification ${Date.now()}.`, privacy: true } });
  expect(workflow.status()).toBe(201);
  await login(page);
  await expect(page).toHaveURL(/wp-admin/);
  await page.goto('/wp-admin/post-new.php?post_type=avenor_service');
  await page.waitForFunction(() => !!(window as any).wp?.apiFetch && !!(window as any).wp?.data?.select('core/editor'));
  const service = await page.evaluate(async () => {
    const wp = (window as any).wp;
    return wp.apiFetch({ path: '/wp/v2/avenor_service', method: 'POST', data: {
      title: 'Browser verification service', status: 'publish',
      content: '<!-- wp:paragraph --><p>Created through the authenticated WordPress publishing API.</p><!-- /wp:paragraph -->',
      excerpt: 'A temporary service used by the browser test.', meta: { avenor_featured: true },
    } });
  });
  try {
    await page.goto(service.link);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Browser verification service');
    await expect(page.getByText('Created through the authenticated', { exact: false })).toBeVisible();
    await page.goto('/wp-admin/edit.php?post_type=avenor_inquiry');
    await page.goto('/wp-admin/edit.php?post_type=avenor_inquiry&s=Workflow%20verification');
    await expect(page.locator('#the-list')).toContainText('Workflow verification');
    await page.locator('#the-list .row-title').filter({ hasText: 'Workflow verification' }).first().click();
    await expect(page.getByRole('heading', { name: 'Inquiry details', exact: true })).toBeVisible();
    await page.getByLabel('Status', { exact: true }).selectOption('in-progress');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.getByLabel('Status', { exact: true })).toHaveValue('in-progress');
    await page.locator('#delete-action a').click();

    await page.goto('/wp-admin/post-new.php?post_type=page');
    await page.waitForFunction(() => !!(window as any).wp?.apiFetch);
    const front = await page.evaluate(async () => {
      const wp = (window as any).wp;
      const settings = await wp.apiFetch({ path: '/wp/v2/settings' });
      return wp.apiFetch({ path: `/wp/v2/pages/${settings.page_on_front}?context=edit` });
    });
    await page.goto(`/wp-admin/post.php?post=${front.id}&action=edit`);
    await page.waitForFunction(() => (window as any).wp?.data?.select('core/block-editor')?.getBlocks()?.length > 0);
    const invalid = await invalidEditorBlocks(page);
    expect(invalid).toEqual([]);
    try {
      await page.evaluate(async () => {
        const wp = (window as any).wp;
        const walk = (items: any[]): any[] => items.flatMap((block) => [block, ...walk(block.innerBlocks || [])]);
        const heading = walk(wp.data.select('core/block-editor').getBlocks()).find((block) => block.name === 'core/heading' && block.attributes.level === 1);
        wp.data.dispatch('core/block-editor').updateBlockAttributes(heading.clientId, { content: 'Clarity, verified through Gutenberg.' });
        await wp.data.dispatch('core/editor').savePost();
      });
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Clarity, verified through Gutenberg.');
    } finally {
      await page.goto(`/wp-admin/post.php?post=${front.id}&action=edit`);
      await page.waitForFunction(() => !!(window as any).wp?.apiFetch);
      await page.evaluate(async ({ id, content }) => (window as any).wp.apiFetch({ path: `/wp/v2/pages/${id}`, method: 'POST', data: { content } }), { id: front.id, content: front.content.raw });
    }
  } finally {
    await page.goto('/wp-admin/post-new.php?post_type=avenor_service');
    await page.waitForFunction(() => !!(window as any).wp?.apiFetch);
    await page.evaluate(async (id) => (window as any).wp.apiFetch({ path: `/wp/v2/avenor_service/${id}?force=true`, method: 'DELETE' }), service.id);
  }
});
