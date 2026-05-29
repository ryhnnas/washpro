// @ts-check
const { test: setup } = require('@playwright/test');
const { loginAs, loginAsSuperAdmin, AUTH_FILES } = require('./helpers');

/**
 * Auth Setup — login sekali per role dan simpan storage state.
 * Test lain reuse session ini (via storageState) sehingga:
 * - Tidak kena rate limit (login hanya 3x total, bukan per-test)
 * - Jauh lebih cepat (tidak login ulang tiap test)
 */

setup('authenticate as owner', async ({ page }) => {
  await loginAs(page, 'owner');
  await page.context().storageState({ path: AUTH_FILES.owner });
});

setup('authenticate as staff', async ({ page }) => {
  await loginAs(page, 'staff');
  await page.context().storageState({ path: AUTH_FILES.staff });
});

setup('authenticate as superadmin', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.context().storageState({ path: AUTH_FILES.superadmin });
});
