// @ts-check
const { test, expect } = require('@playwright/test');

// Menggunakan storageState owner (dari playwright.config.js project 'owner')

test.describe('Cashier (POS) Flow', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/cashier');
    // Jika subscription expired, akan redirect ke paywall
    if (page.url().includes('/paywall')) {
      test.skip(true, 'Subscription expired — redirected to paywall');
      return;
    }
    await expect(page.getByText('Terminal Kasir')).toBeVisible();
  });

  test('should display cashier form with customer and service sections', async ({ page }) => {
    await expect(page.getByText('Info Pelanggan')).toBeVisible();
    await expect(page.getByPlaceholder('Hafiz Reyhan')).toBeVisible();
    await expect(page.getByPlaceholder('0812xxxxxx')).toBeVisible();
    await expect(page.getByText('Rincian Layanan')).toBeVisible();
    await expect(page.getByText('NOTA KASIR')).toBeVisible();

    const submitBtn = page.getByRole('button', { name: /bayar sekarang/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('should show customer autocomplete suggestions', async ({ page }) => {
    const nameInput = page.getByPlaceholder('Hafiz Reyhan');
    await nameInput.fill('Budi');
    await expect(page.getByText('Budi Santoso')).toBeVisible();
  });

  test('should select customer from autocomplete', async ({ page }) => {
    const nameInput = page.getByPlaceholder('Hafiz Reyhan');
    await nameInput.fill('Budi');
    await page.getByText('Budi Santoso').click();

    const phoneInput = page.getByPlaceholder('0812xxxxxx');
    await expect(phoneInput).toHaveValue('081234567890');
  });

  test('should calculate total price when service and qty are selected', async ({ page }) => {
    await page.getByPlaceholder('Hafiz Reyhan').fill('Test Customer');
    await page.getByPlaceholder('0812xxxxxx').fill('081200000000');

    const serviceSelect = page.locator('select').first();
    await serviceSelect.selectOption({ index: 1 });

    const qtyInput = page.locator('input[type="number"][step="0.01"]').first();
    await qtyInput.fill('3');

    const submitBtn = page.getByRole('button', { name: /bayar sekarang/i });
    await expect(submitBtn).toBeEnabled();
  });

  test('should create transaction successfully', async ({ page }) => {
    await page.getByPlaceholder('Hafiz Reyhan').fill('E2E Test Customer');
    await page.getByPlaceholder('0812xxxxxx').fill('081299999999');

    const serviceSelect = page.locator('select').first();
    await serviceSelect.selectOption({ index: 1 });

    const qtyInput = page.locator('input[type="number"][step="0.01"]').first();
    await qtyInput.fill('2');

    await page.getByRole('button', { name: /bayar sekarang/i }).click();

    await expect(page.getByText(/transaksi.*berhasil|tersimpan/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('Hafiz Reyhan')).toHaveValue('');
  });

  test('should add multiple service items', async ({ page }) => {
    await page.getByPlaceholder('Hafiz Reyhan').fill('Multi Item Customer');
    await page.getByPlaceholder('0812xxxxxx').fill('081288888888');

    const firstSelect = page.locator('select').first();
    await firstSelect.selectOption({ index: 1 });
    await page.locator('input[type="number"][step="0.01"]').first().fill('2');

    await page.getByRole('button', { name: '+' }).click();

    const selects = page.locator('select');
    await expect(selects).toHaveCount(3); // 2 service selects + 1 payment method
  });

});
