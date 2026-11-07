import type { Page } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('/wp-login.php');
  await page.getByLabel('Username or Email Address').fill(process.env.WP_ADMIN_USER || 'admin');
  await page.getByLabel('Password', { exact: true }).fill(process.env.WP_ADMIN_PASSWORD || 'password');
  await page.getByRole('button', { name: 'Log In' }).click();
}

export async function invalidEditorBlocks(page: Page) {
  return page.evaluate(() => {
    const blocks = (window as any).wp.data.select('core/block-editor').getBlocks();
    const walk = (items: any[]): any[] => items.flatMap(block => [block, ...walk(block.innerBlocks || [])]);
    return walk(blocks).filter(block => block.isValid === false).map(block => block.name);
  });
}
