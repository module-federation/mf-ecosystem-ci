import { defineConfig, devices } from '@playwright/test'

// Ports 4400-4499 are reserved for this fixture set in ecosystem-ci.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4400', ...devices['Desktop Chrome'] },
  webServer: [
    { command: 'node serve.mjs dist/remote 4401', url: 'http://localhost:4401/remoteEntry.js', reuseExistingServer: false },
    { command: 'node serve.mjs dist/host 4400', url: 'http://localhost:4400/', reuseExistingServer: false },
  ],
})
