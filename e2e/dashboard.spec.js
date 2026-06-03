// @ts-check
const { test, expect } = require('@playwright/test');

// Menggunakan storageState owner (dari playwright.config.js project 'owner')

test.describe('Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    if (page.url().includes('/paywall')) {
      test.skip(true, 'Subscription expired — redirected to paywall');
      return;
    }
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should display dashboard with stat cards', async ({ page }) => {
    // "Pendapatan" muncul di stat card label DAN heading "Tren Pendapatan" → pakai exact
    await expect(page.getByText('Pendapatan', { exact: true })).toBeVisible();
    await expect(page.getByText('Transaksi', { exact: true })).toBeVisible();
    await expect(page.getByText('Antrian Aktif')).toBeVisible();
    await expect(page.getByText('Total Pelanggan')).toBeVisible();
  });

  test('should display revenue trend chart', async ({ page }) => {
    await expect(page.getByText('Tren Pendapatan')).toBeVisible();
  });

  test('should display payment method breakdown', async ({ page }) => {
    await expect(page.getByText('Cash vs QRIS')).toBeVisible();
  });

  test('should display status distribution', async ({ page }) => {
    await expect(page.getByText('Distribusi Status Pengerjaan')).toBeVisible();
  });

  test('should display today orders section', async ({ page }) => {
    await expect(page.getByText('Pesanan Masuk (Hari Ini)')).toBeVisible();
  });

  test('should have date filter select', async ({ page }) => {
    // DateFilter adalah <select> dengan opsi "Hari Ini"
    const dateSelect = page.locator('select').filter({ hasText: 'Hari Ini' });
    await expect(dateSelect).toBeVisible();

    // Ganti filter ke 7 hari
    await dateSelect.selectOption('7_hari');
    await page.waitForTimeout(500);
    // Dashboard tetap tampil setelah ganti filter
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should show overdue count card', async ({ page }) => {
    await expect(page.getByText('Keterlambatan')).toBeVisible();
  });

});
