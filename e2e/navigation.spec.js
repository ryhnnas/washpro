// @ts-check
const { test, expect } = require('@playwright/test');

// Menggunakan storageState owner (dari playwright.config.js project 'owner')

test.describe('Navigation & Layout (Owner)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    if (page.url().includes('/paywall')) {
      test.skip(true, 'Subscription expired — redirected to paywall');
      return;
    }
  });

  test('should show sidebar with all owner menu items', async ({ page }) => {
    // Master Menu
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /kasir/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /tracking/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pelanggan', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Layanan', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Laporan', exact: true })).toBeVisible();

    // Administrasi (Owner only)
    await expect(page.getByRole('link', { name: /informasi langganan/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /pengaturan menu/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /kelola staf/i })).toBeVisible();
  });

  test('should navigate to each page without errors', async ({ page }) => {
    const routes = [
      { link: /kasir/i, expected: 'Terminal Kasir' },
      { link: /tracking/i, expected: 'Status Pengerjaan' },
    ];

    for (const route of routes) {
      await page.getByRole('link', { name: route.link }).click();
      await page.waitForTimeout(500);
      await expect(page.getByText(route.expected)).toBeVisible();
    }
  });

  test('should show user profile in sidebar', async ({ page }) => {
    await expect(page.getByText('Owner Demo')).toBeVisible();
    // Role badge "OWNER" — gunakan exact agar tidak bentrok dengan teks lain
    await expect(page.getByText('OWNER', { exact: true })).toBeVisible();
  });

  test('should navigate to subscription info page', async ({ page }) => {
    await page.getByRole('link', { name: /informasi langganan/i }).click();
    await page.waitForURL('**/subscription', { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/subscription/);
  });

});
