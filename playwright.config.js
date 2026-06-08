// @ts-check
const { defineConfig } = require('@playwright/test');

const PORT = process.env.PORT || '5001';
const API_BASE = `http://localhost:${PORT}`;

const TEST_ENV = {
  DATABASE_URL: process.env.DATABASE_URL || 'mysql://root:root@127.0.0.1:3306/washpro_ci',
  JWT_SECRET: process.env.JWT_SECRET || 'ci-test-jwt-secret',
  SUPERADMIN_JWT_SECRET: process.env.SUPERADMIN_JWT_SECRET || 'ci-test-superadmin-secret',
  GOWA_ENABLED: 'false',
  NODE_ENV: 'development',
  DISABLE_RATE_LIMIT: 'true',
  PORT,
};

/**
 * Playwright E2E — selalu gunakan DATABASE_URL test eksplisit, bukan .env development.
 */
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  webServer: [
    {
      command: 'npm run dev --workspace=backend',
      url: `${API_BASE}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        ...TEST_ENV,
        VITE_API_URL: process.env.VITE_API_URL || `${API_BASE}/api`,
      },
    },
    {
      command: 'npm run dev --workspace=frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        VITE_API_URL: process.env.VITE_API_URL || `${API_BASE}/api`,
      },
    },
  ],

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },
    {
      name: 'no-auth',
      testMatch: /auth\.spec\.js/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'owner',
      testMatch: /(cashier|tracking|navigation|dashboard|customers|subscription)\.spec\.js/,
      dependencies: ['setup'],
      use: {
        browserName: 'chromium',
        storageState: 'e2e/.auth/owner.json',
      },
    },
    {
      name: 'superadmin',
      testMatch: /superadmin\.spec\.js/,
      dependencies: ['setup'],
      use: {
        browserName: 'chromium',
        storageState: 'e2e/.auth/superadmin.json',
      },
    },
  ],
});
