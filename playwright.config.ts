import { defineConfig, devices } from '@playwright/test'

const remote = process.env.NIMBUS_BASE_URL
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e-results.json' }]],
  use: { baseURL: remote || 'http://127.0.0.1:3107', trace: 'retain-on-failure', screenshot: 'only-on-failure', actionTimeout: 8000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  ...(remote ? {} : { webServer: { command: 'npm run start -- --hostname 127.0.0.1 --port 3107', url: 'http://127.0.0.1:3107/evidence', reuseExistingServer: false, timeout: 60_000 } }),
})
