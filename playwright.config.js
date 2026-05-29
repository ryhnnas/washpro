// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * Playwright E2E Test Configuration — WashPro
 *
 * Menjalankan test:
 *   npx playwright test              # semua test
 *   npx playwright test --ui         # interactive UI mode
 *   npx playwright test auth.spec.js # satu file
 *
 * Prasyarat:
 *   - Backend running di localhost:5001
 *   - Frontend running di localhost:5173
 *   - Database sudah di-seed (npx prisma db seed)
 *
 * Strategi auth: login sekali per role di auth.setup.js, simpan storage state,
 * lalu test reuse session (menghindari rate limit + lebih cepat).
 */
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  retries: 0,
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

  projects: [
    // Setup project — login & simpan storage state
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },

    // Test yang TIDAK butuh auth (login page, register, dll)
    {
      name: 'no-auth',
      testMatch: /auth\.spec\.js/,
      use: { browserName: 'chromium' },
    },

    // Test yang butuh login sebagai OWNER
    {
      name: 'owner',
      testMatch: /(cashier|tracking|navigation|dashboard|customers|subscription)\.spec\.js/,
      dependencies: ['setup'],
      use: {
        browserName: 'chromium',
        storageState: 'e2e/.auth/owner.json',
      },
    },

    // Test yang butuh login sebagai SUPERADMIN
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
