const { test, expect } = require('@playwright/test');
const { setupSuperadminPage, demoStats } = require('./superadminFixture');

test('desktop overview retains real metrics and payment navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await setupSuperadminPage(page);
  await page.goto('/superadmin/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(page.getByText(/8\.750\.000/).first()).toBeVisible();
  if (process.env.CAPTURE_BEFORE) await page.screenshot({ path: 'docs/audits/superadmin-ui/desktop-before.png', fullPage: true });
  if (process.env.CAPTURE_AFTER) await page.screenshot({ path: 'docs/audits/superadmin-ui/desktop-after.png', fullPage: true });
  await page.getByRole('button', { name: /Tinjau pembayaran/ }).click();
  await expect(page.getByRole('heading', { name: 'Verifikasi Pembayaran' })).toBeVisible();
});

test('mobile navigation is usable without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await setupSuperadminPage(page);
  await page.goto('/superadmin/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(page.getByText(/8\.750\.000/).first()).toBeVisible();
  if (process.env.CAPTURE_BEFORE) await page.screenshot({ path: 'docs/audits/superadmin-ui/mobile-before.png', fullPage: true });
  if (process.env.CAPTURE_AFTER) await page.screenshot({ path: 'docs/audits/superadmin-ui/mobile-after.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Buka navigasi' }).click();
  await page.getByRole('button', { name: 'Toko', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Manajemen Toko' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('mobile navigation traps focus and Escape restores its trigger', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupSuperadminPage(page); await page.goto('/superadmin/dashboard');
  const trigger = page.getByRole('button', { name: 'Buka navigasi' });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement.closest('dialog'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('zero data has honest empty states and no misleading positive indicators', async ({ page }) => {
  const stats = structuredClone(demoStats);
  stats.totalBusinesses = 0; stats.statusCounts = { ACTIVE: 0, TRIAL: 0, PENDING_PAYMENT: 0, EXPIRED: 0, SUSPENDED: 0 }; stats.pendingPayments = 0; stats.oldestPendingPaymentAt = null;
  stats.revenue = { thisMonth: 0, previousMonth: 0, trend: [] };
  stats.growth = { newThisMonth: 0, newPreviousMonth: 0 };
  stats.conversion = { rate: 0, converted: 0, total: 0, cohortDays: 90 };
  stats.expiringSoon = { days: 7, total: 0, items: [] }; stats.inactive = { days: 14, total: 0, items: [] };
  stats.planBreakdown = []; stats.platform = { whatsappSessions: { connected: 0, disconnected: 0, error: 0 }, queue: { pending: 0, failed: 0 } };
  await setupSuperadminPage(page, { stats }); await page.goto('/superadmin/dashboard');
  await expect(page.getByText('Semua pembayaran sudah ditinjau.')).toBeVisible();
  await expect(page.getByText('Belum ada sesi WhatsApp tenant.')).toBeVisible();
  await expect(page.getByText('Belum ada pembayaran yang disetujui dalam periode ini.')).toBeVisible();
  await expect(page.getByText('NaN', { exact: true })).toHaveCount(0);
});

test('failed statistics can retry without displaying invented values', async ({ page }) => {
  const fixture = await setupSuperadminPage(page, { statsStatus: 500 });
  await page.goto('/superadmin/dashboard');
  await expect(page.getByRole('alert')).toContainText('Gagal memuat statistik platform.');
  await expect(page.getByText(/8\.750\.000/)).toHaveCount(0);
  fixture.statsStatus = 200;
  await page.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(page.getByText(/8\.750\.000/).first()).toBeVisible();
});

test('narrow screens can show large revenue without clipping', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 750 });
  const stats = structuredClone(demoStats);
  stats.revenue.thisMonth = 1250000000;
  await setupSuperadminPage(page, { stats }); await page.goto('/superadmin/dashboard');
  await expect(page.getByText(/1\.250\.000\.000/).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('review payment shortcut always opens pending payments', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const fixture = await setupSuperadminPage(page); await page.goto('/superadmin/dashboard');
  await page.getByRole('button', { name: /^Pembayaran/ }).click();
  await page.getByRole('button', { name: 'Disetujui', exact: true }).click();
  await expect.poll(() => fixture.paymentStatuses.at(-1)).toBe('APPROVED');
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('button', { name: 'Tinjau pembayaran', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Menunggu', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => fixture.paymentStatuses.at(-1)).toBe('PENDING');
});

test('refresh failure keeps confirmed metrics and offers another retry', async ({ page }) => {
  const fixture = await setupSuperadminPage(page); await page.goto('/superadmin/dashboard');
  await expect(page.getByText(/8\.750\.000/).first()).toBeVisible();
  fixture.statsStatus = 500;
  await page.getByRole('button', { name: 'Muat ulang statistik' }).click();
  await expect(page.getByRole('alert')).toContainText('Gagal memuat statistik platform.');
  await expect(page.getByText(/8\.750\.000/).first()).toBeVisible();
  fixture.statsStatus = 200;
  await page.getByRole('button', { name: 'Muat ulang', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
