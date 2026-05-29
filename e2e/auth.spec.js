// @ts-check
const { test, expect } = require('@playwright/test');
const { loginAs, logout } = require('./helpers');

// Test ini butuh state kosong (test login flow itu sendiri)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication Flow', () => {

  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Selamat Datang')).toBeVisible();
    await expect(page.getByPlaceholder('nama@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('nama@email.com').fill('wrong@email.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');

    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/auth/login'),
      { timeout: 10000 }
    );
    await page.getByRole('button', { name: /masuk/i }).click();
    const response = await responsePromise;

    // Server harus return error (401 atau 404)
    expect([401, 404]).toContain(response.status());
    await expect(page).toHaveURL(/\/login/);
  });

  test('should login as Owner and navigate away from login', async ({ page }) => {
    await loginAs(page, 'owner');
    expect(page.url()).not.toContain('/login');
  });

  test('should logout successfully', async ({ page }) => {
    await loginAs(page, 'owner');

    if (page.url().includes('/paywall')) {
      test.skip(true, 'Subscription expired — paywall has no logout button');
      return;
    }

    await logout(page);
    await expect(page).toHaveURL('/');
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show registration page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /buka toko/i })).toBeVisible();
  });

});
