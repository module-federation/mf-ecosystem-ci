import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4210' },
  webServer: {
    command: 'node server.mjs',
    url: 'http://127.0.0.1:4210/__health',
    reuseExistingServer: false,
    timeout: 30_000,
    stdout: 'pipe',
  },
});
