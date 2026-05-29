/**
 * E2E Test Helpers — WashPro
 * Shared utilities untuk semua test files.
 */

// Akun default dari seed.js
const TEST_ACCOUNTS = {
  owner: {
    email: 'owner@washpro.local',
    password: 'owner12345',
    name: 'Owner Demo',
    role: 'OWNER',
  },
  staff: {
    email: 'staff@washpro.local',
    password: 'staff12345',
    name: 'Staff Demo',
    role: 'STAFF',
  },
  superadmin: {
    email: 'admin@washpro.com',
    password: 'adminwashpro123',
    name: 'Super Admin WashPro',
  },
};

// Lokasi penyimpanan storage state (cookie + localStorage) per role
const AUTH_FILES = {
  owner: 'e2e/.auth/owner.json',
  staff: 'e2e/.auth/staff.json',
  superadmin: 'e2e/.auth/superadmin.json',
};

/**
 * Login sebagai tenant (owner/staff).
 * Robust: tunggu API response dulu, lalu tunggu URL berubah.
 */
async function loginAs(page, role = 'owner') {
  const account = TEST_ACCOUNTS[role];
  await page.goto('/login');

  await page.getByPlaceholder('nama@email.com').waitFor({ state: 'visible' });
  await page.getByPlaceholder('nama@email.com').fill(account.email);
  await page.getByPlaceholder('••••••••').fill(account.password);

  const loginResponsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/auth/login') && resp.request().method() === 'POST',
    { timeout: 15000 }
  );

  await page.getByRole('button', { name: /masuk/i }).click();

  const response = await loginResponsePromise;
  const status = response.status();

  if (status !== 200) {
    const body = await response.text().catch(() => '');
    throw new Error(`Login API failed: status=${status} body=${body.slice(0, 200)}`);
  }

  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 10000,
    waitUntil: 'commit',
  });
}

/**
 * Login sebagai SuperAdmin.
 * Form SuperAdmin menggunakan id #superadmin-email & #superadmin-password.
 */
async function loginAsSuperAdmin(page) {
  const account = TEST_ACCOUNTS.superadmin;
  await page.goto('/superadmin/login');

  await page.locator('#superadmin-email').waitFor({ state: 'visible' });
  await page.locator('#superadmin-email').fill(account.email);
  await page.locator('#superadmin-password').fill(account.password);

  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/superadmin/login') && resp.request().method() === 'POST',
    { timeout: 15000 }
  );

  await page.locator('#superadmin-login-btn').click();
  const response = await responsePromise;

  if (response.status() !== 200) {
    throw new Error(`SuperAdmin login failed: status=${response.status()}`);
  }

  await page.waitForURL((url) => url.pathname.includes('/superadmin/dashboard'), {
    timeout: 10000,
    waitUntil: 'commit',
  });
}

/**
 * Logout dari aplikasi.
 */
async function logout(page) {
  await page.getByRole('button', { name: /log out/i }).click();
  await page.waitForURL('/', { waitUntil: 'commit' });
}

module.exports = { TEST_ACCOUNTS, AUTH_FILES, loginAs, loginAsSuperAdmin, logout };
