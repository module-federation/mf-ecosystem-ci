import { defineConfig, devices } from '@playwright/test'

// Ports 4400-4499 are reserved for this fixture set in ecosystem-ci.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4411', ...devices['Desktop Chrome'] },
  webServer: [
    {
      command: 'node scripts/serve.mjs provider/doc_build 4410',
      url: 'http://localhost:4410/mf-manifest.json',
      reuseExistingServer: false,
    },
    {
      command: 'node scripts/serve.mjs consumer/doc_build 4411',
      url: 'http://localhost:4411/',
      reuseExistingServer: false,
    },
  ],
})
