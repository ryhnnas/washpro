const { test, expect } = require('@playwright/test');
const { setupStaffPage } = require('./staffFixture');
test('stats failure preserves successful panels without zero metrics', async ({ page }) => {
  const fixture = await setupStaffPage(page, { statsStatus: 500 });
  await page.goto('/dashboard');
  await expect(page.getByRole('alert').filter({ hasText: 'Gagal memuat statistik dashboard' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tren Pendapatan' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Layanan Terlaris' })).toBeVisible();
  await expect(page.getByText('Pendapatan (Lunas)', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Pesanan Masuk (Hari Ini)' })).toHaveCount(0);
  const before = fixture.requests.filter(r => r.path === '/dashboard/revenue-trend').length;
  fixture.statsStatus = 200;
  await page.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(page.getByText('Pendapatan (Lunas)', { exact: true })).toBeVisible();
  expect(fixture.requests.filter(r => r.path === '/dashboard/revenue-trend')).toHaveLength(before);
});
for (const [option, message, retry] of [
  ['trendStatus', 'Gagal memuat tren pendapatan', 'Muat ulang tren pendapatan'],
  ['topStatus', 'Gagal memuat layanan terlaris', 'Muat ulang layanan terlaris'],
]) {
  test(`${option} error is distinct from empty data`, async ({ page }) => {
    const fixture = await setupStaffPage(page, { [option]: 500 });
    await page.goto('/dashboard');
    await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
    await expect(page.getByText('Pendapatan (Lunas)', { exact: true })).toBeVisible();
    const before = fixture.requests.filter(r => r.path === '/dashboard/stats').length;
    fixture[option] = 200;
    await page.getByRole('button', { name: retry }).click();
    await expect(page.getByRole('alert').filter({ hasText: message })).toHaveCount(0);
    expect(fixture.requests.filter(r => r.path === '/dashboard/stats')).toHaveLength(before);
  });
}
test('denied staff dashboard URL does not fetch metrics', async ({ page }) => {
  const fixture = await setupStaffPage(page, { menus: ['CASHIER', 'TRACKING'] });
  await page.goto('/dashboard');
  await expect(page.getByText('Akses dashboard tidak diizinkan', { exact: true })).toBeVisible();
  expect(fixture.requests.filter(r => r.path.startsWith('/dashboard/'))).toHaveLength(0);
});
test('dashboard staff cannot see report links without report permission', async ({ page }) => {
  await setupStaffPage(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(page.locator('a[href="/reports"]')).toHaveCount(0);
});
test('settings failure offers retry instead of denying the staff dashboard', async ({ page }) => {
  const fixture = await setupStaffPage(page, { settingsStatus: 500 });
  await page.goto('/dashboard');
  await expect(page.getByRole('alert').filter({ hasText: 'Gagal memuat pengaturan' })).toBeVisible();
  fixture.settingsStatus = 200;
  await page.getByRole('button', { name: 'Muat ulang pengaturan' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
});
test('revoked API permission shows access denial instead of zeros', async ({ page }) => {
  await setupStaffPage(page, { statsStatus: 403 });
  await page.goto('/dashboard');
  await expect(page.getByText('Akses dashboard tidak diizinkan', { exact: true })).toBeVisible();
  await expect(page.getByText('Pendapatan (Lunas)', { exact: true })).toHaveCount(0);
});
test('mobile dashboard renders without a crash or page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await setupStaffPage(page); await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('malformed permissions deny dashboard without a metrics request', async ({ page }) => {
  const fixture = await setupStaffPage(page);
  await page.route('**/api/settings/public', route => route.fulfill({ json: { staffAllowedMenus: '{invalid' } }));
  await page.goto('/dashboard');
  await expect(page.getByText('Akses dashboard tidak diizinkan', { exact: true })).toBeVisible();
  expect(fixture.requests.filter(r => r.path.startsWith('/dashboard/'))).toHaveLength(0);
});
test('an old panel retry cannot replace data for the new date filter', async ({ page }) => {
  await setupStaffPage(page);
  let retryStarted = false, held = false, release, entered;
  const waiting = new Promise(resolve => { entered = resolve; });
  const blocked = new Promise(resolve => { release = resolve; });
  await page.route('**/api/dashboard/revenue-trend**', async route => {
    if (!retryStarted) return route.fulfill({ status: 500, json: { message: 'Gagal memuat tren pendapatan' } });
    if (!held) {
      held = true;
      entered(); await blocked;
      return route.fulfill({ json: { data: [{ label: 'Stale', revenue: 999999 }] } });
    }
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: 'Muat ulang tren pendapatan' })).toBeVisible();
  retryStarted = true;
  await page.getByRole('button', { name: 'Muat ulang tren pendapatan' }).click(); await waiting;
  await page.locator('select').filter({ hasText: 'Hari Ini' }).selectOption('kemarin');
  await expect(page.getByText('Belum ada pendapatan tercatat di periode ini', { exact: true })).toBeVisible();
  const oldResponse = page.waitForResponse(response => response.url().includes('/dashboard/revenue-trend'));
  release(); await oldResponse;
  await expect(page.getByText('Belum ada pendapatan tercatat di periode ini', { exact: true })).toBeVisible();
  await expect(page.getByText('Stale', { exact: true })).toHaveCount(0);
});
