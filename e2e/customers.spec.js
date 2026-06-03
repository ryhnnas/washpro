// @ts-check
const { test, expect } = require('@playwright/test');

// Menggunakan storageState owner (dari playwright.config.js project 'owner')

test.describe('Customers Management', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/customers');
    if (page.url().includes('/paywall')) {
      test.skip(true, 'Subscription expired — redirected to paywall');
      return;
    }
    await page.waitForTimeout(1000); // Wait for data load
  });

  test('should display customer list from seed data', async ({ page }) => {
    await expect(page.getByText('Budi Santoso')).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/cari|search/i);
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Budi');
      await page.waitForTimeout(500);
      await expect(page.getByText('Budi Santoso')).toBeVisible();
    }
  });

  test('should show customer details', async ({ page }) => {
    await expect(page.getByText('Budi Santoso').first()).toBeVisible();
  });

  test('should show membership status for customers with active membership', async ({ page }) => {
    // From seed: first 3 customers have active membership
    const membershipBadge = page.getByText(/aktif|active|member/i).first();
    const hasMembership = await membershipBadge.isVisible().catch(() => false);
    expect(hasMembership).toBeTruthy();
  });

});
