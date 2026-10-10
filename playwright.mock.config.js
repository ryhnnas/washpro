const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './e2e/mocked', fullyParallel: false, workers: 1, timeout: 20000,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:5174', browserName: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL || (!process.env.CI && process.platform === 'darwin' ? 'chrome' : undefined) },
  webServer: {
    command: 'npm run dev --workspace=frontend -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174', reuseExistingServer: !process.env.CI,
    env: { VITE_API_URL: 'http://127.0.0.1:5174/api' },
  },
});
