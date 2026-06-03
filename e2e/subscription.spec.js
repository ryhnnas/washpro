// @ts-check
const { test, expect } = require('@playwright/test');

// Menggunakan storageState owner (dari playwright.config.js project 'owner')

test.describe('Subscription & Paywall Flow', () => {

  test('should show subscription info or paywall', async ({ page }) => {
    await page.goto('/subscription');

    if (page.url().includes('/paywall')) {
      // Paywall should show subscription plans or payment info
      await expect(page.getByText(/langganan|berlangganan|paket|bayar/i).first()).toBeVisible();
    } else {
      // Subscription info page
      await expect(page.getByText(/langganan|subscription|aktif/i).first()).toBeVisible();
    }
  });

  test('should display subscription status', async ({ page }) => {
    await page.goto('/subscription');

    if (page.url().includes('/paywall')) {
      test.skip(true, 'Redirected to paywall — subscription not active');
      return;
    }

    // Status langganan harus tampil (ACTIVE/TRIAL dari seed)
    await expect(page.getByText(/aktif|trial|active/i).first()).toBeVisible({ timeout: 10000 });
  });

});
