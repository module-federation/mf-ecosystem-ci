import { defineConfig, devices } from '@playwright/test';

// Ports 4101-4102 are reserved for this fixture. Both apps are served from their
// production builds; Playwright tears the servers down when the run ends.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4101',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter remote preview',
      url: 'http://localhost:4102/mf-manifest.json',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter host preview',
      url: 'http://localhost:4101/',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
