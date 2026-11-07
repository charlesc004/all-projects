import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Reuse an installed local Chromium, or let Playwright use its managed browser.
// PLAYWRIGHT_EXECUTABLE_PATH supports CI environments with a preinstalled browser.
const localChromium = process.env.LOCALAPPDATA
  ? resolve(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1208/chrome-win64/chrome.exe')
  : '';
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 12_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
        (existsSync(localChromium) ? localChromium : undefined),
    },
  },
});
