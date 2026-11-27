import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], locale: 'en-US', baseURL: 'http://127.0.0.1:4220' },
  webServer: {
    command: 'node server.mjs',
    url: 'http://127.0.0.1:4220/__health',
    reuseExistingServer: false,
    timeout: 30_000,
    stdout: 'pipe',
  },
});
