// @ts-check
const { test, expect } = require('@playwright/test');

const STATUS_FILTERS = ['PENDING', 'PROSES', 'SELESAI', 'DIAMBIL'];

test.describe('Tracking (Order Status) Flow', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/tracking');
    if (page.url().includes('/paywall')) {
      test.skip(true, 'Subscription expired — redirected to paywall');
      return;
    }
    await expect(page.getByText('Status Pengerjaan')).toBeVisible();
  });

  test('should display tracking page with status filters', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Semua Status' })).toBeVisible();
    for (const status of STATUS_FILTERS) {
      await expect(page.getByRole('button', { name: status, exact: true })).toBeVisible();
    }
  });

  test('should filter transactions by status', async ({ page }) => {
    await page.getByRole('button', { name: 'PENDING', exact: true }).click();
    await page.waitForTimeout(500);

    const cards = page.locator('.glass-card');
    const emptyState = page.getByText(/tidak ada antrian/i);

    const hasCards = await cards.count() > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test('should show transaction cards with details', async ({ page }) => {
    await page.waitForTimeout(1000);

    const cards = page.locator('.glass-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();
      await expect(firstCard.getByText(/Total Tagihan/i)).toBeVisible();
      await expect(firstCard.getByText(/Tanggal Masuk/i)).toBeVisible();
    }
  });

  test('should update transaction status with confirmation dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'PENDING', exact: true }).click();
    await page.waitForTimeout(500);

    const updateBtn = page.getByRole('button', { name: /pindahkan ke proses/i }).first();
    const hasPending = await updateBtn.isVisible().catch(() => false);

    if (hasPending) {
      await updateBtn.click();
      await expect(page.getByRole('heading', { name: 'Perbarui Status Pesanan' })).toBeVisible();
      await page.getByRole('button', { name: /ya, pindahkan/i }).click();
      await expect(page.getByText(/status.*diperbarui|berhasil|diubah/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show refresh button and reload data', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: /segarkan/i });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(page.getByText('Status Pengerjaan')).toBeVisible();
  });

});
