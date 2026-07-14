import { defineConfig, devices } from '@playwright/test';

/**
 * a11y gate. Builds are verified by driving both locales through axe-core.
 * The webServer runs the production build (`next start`), so the gate tests
 * what actually ships.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000/en',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
