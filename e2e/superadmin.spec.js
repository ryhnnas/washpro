// @ts-check
const { test, expect } = require('@playwright/test');

// Menggunakan storageState superadmin (dari playwright.config.js project 'superadmin')

test.describe('SuperAdmin Portal', () => {

  test('should display superadmin dashboard after login', async ({ page }) => {
    await page.goto('/superadmin/dashboard');
    // Sudah authenticated via storageState — harus tetap di dashboard
    await expect(page).toHaveURL(/\/superadmin\/dashboard/);
  });

  test('should display superadmin dashboard stats', async ({ page }) => {
    await page.goto('/superadmin/dashboard');
    // Dashboard menampilkan statistik manajemen bisnis
    await expect(page.getByText(/total.*bisnis|toko|pembayaran|pendapatan/i).first()).toBeVisible({ timeout: 10000 });
  });

});

test.describe('SuperAdmin Login Page (no auth)', () => {

  // Test ini perlu state kosong — clear storage dulu
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should show superadmin login page', async ({ page }) => {
    await page.goto('/superadmin/login');
    // "Super Admin Portal" heading — gunakan exact untuk hindari footer match
    await expect(page.getByText('Super Admin Portal')).toBeVisible();
    await expect(page.locator('#superadmin-email')).toBeVisible();
  });

  test('should redirect unauthenticated user to superadmin login', async ({ page }) => {
    await page.goto('/superadmin/dashboard');
    await expect(page).toHaveURL(/\/superadmin\/login/);
  });

});
