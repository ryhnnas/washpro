const { test, expect } = require('@playwright/test');
const { setupStaffPage } = require('./staffFixture');
async function fill(page, qty = '6') {
  await page.getByPlaceholder('Hafiz Reyhan').fill('Budi Audit');
  await page.getByPlaceholder('0812xxxxxx').fill('081234567890');
  await page.locator('select').first().selectOption('svc-1');
  await page.locator('input[step="0.01"]').first().fill(qty);
}
test('legacy settings cannot hide the required customer name', async ({ page }) => {
  await setupStaffPage(page, { requireCustomerName: false });
  await page.goto('/cashier');
  await expect(page.getByPlaceholder('Hafiz Reyhan')).toBeVisible();
  await expect(page.getByPlaceholder('Hafiz Reyhan')).toHaveAttribute('required', '');
});
test('duplicate services use a shared membership quota', async ({ page }) => {
  await setupStaffPage(page);
  await page.goto('/cashier');
  await fill(page);
  await page.getByRole('button', { name: '+', exact: true }).click();
  await page.locator('select').nth(1).selectOption('svc-1');
  await page.locator('input[step="0.01"]').nth(1).fill('6');
  await expect(page.getByText(/Cover:.*80\.000.*Bayar:.*16\.000/)).toBeVisible();
});
test('saved transaction survives a customer refresh failure and retry never reposts', async ({ page }) => {
  const fixture = await setupStaffPage(page, { refreshFails: true });
  await page.goto('/cashier'); await fill(page);
  await page.getByRole('button', { name: 'Bayar Sekarang' }).click();
  await expect(page.getByText(/Transaksi tersimpan.*tx-1/)).toBeVisible();
  await expect(page.getByPlaceholder('Hafiz Reyhan')).toHaveValue('');
  await expect(page.getByRole('alert').filter({ hasText: /data pelanggan/ })).toBeVisible();
  fixture.refreshFails = false;
  await page.getByRole('button', { name: 'Muat ulang pelanggan' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /data pelanggan/ })).toHaveCount(0);
  expect(fixture.posts).toHaveLength(1);
});
test('membership receipt keeps zero payable and the WA failure visible', async ({ page }) => {
  const fixture = await setupStaffPage(page);
  fixture.postResponse = { ...fixture.postResponse, totalPrice: 48000, coveredAmount: 48000, payableAmount: 0,
    membershipBreakdown: { activeMembershipId: 'm1', coveredAmount: 48000, payableAmount: 0 }, whatsapp: { error: 'Gateway offline' } };
  await page.goto('/cashier'); await fill(page);
  await page.getByRole('button', { name: 'Bayar Sekarang' }).click();
  await expect(page.getByText(/WhatsApp.*gagal/i)).toBeVisible();
  await page.getByRole('button', { name: 'Kirim WA Manual' }).click();
  const url = await page.evaluate(() => window.auditOpens[0]);
  const message = new URL(url).searchParams.get('text');
  expect(message).toMatch(/Tagihan.*Rp 0/);
  expect(message).toMatch(/Membership.*48\.000/);
});
test('queued WhatsApp is not claimed as delivered', async ({ page }) => {
  const fixture = await setupStaffPage(page);
  fixture.postResponse.whatsapp = { ok: false, queued: true, error: 'Offline' };
  await page.goto('/cashier'); await fill(page);
  await page.getByRole('button', { name: 'Bayar Sekarang' }).click();
  await expect(page.getByText(/WhatsApp.*antrian/i)).toBeVisible();
});
test('deferred payment remains unpaid after saving and in the manual receipt', async ({ page }) => {
  const fixture = await setupStaffPage(page);
  fixture.postResponse = { ...fixture.postResponse, paymentMethod: 'BAYAR_NANTI', whatsapp: { skipped: true } };
  await page.goto('/cashier'); await fill(page);
  await page.locator('select').last().selectOption('BAYAR_NANTI');
  await page.getByRole('button', { name: 'Bayar Sekarang' }).click();
  await expect(page.getByText(/Tagihan:.*Belum dibayar/)).toBeVisible();
  await page.getByRole('button', { name: 'Kirim WA Manual' }).click();
  const url = await page.evaluate(() => window.auditOpens[0]);
  expect(new URL(url).searchParams.get('text')).toMatch(/Belum dibayar/);
});
test('a second submit cannot duplicate an in-flight transaction', async ({ page }) => {
  const fixture = await setupStaffPage(page);
  let release, entered;
  const waiting = new Promise(resolve => { entered = resolve; });
  const blocked = new Promise(resolve => { release = resolve; });
  await page.route('**/api/transactions', async route => {
    fixture.posts.push(route.request().postDataJSON()); entered(); await blocked;
    await route.fulfill({ status: 201, json: fixture.postResponse });
  });
  await page.goto('/cashier'); await fill(page);
  await page.getByRole('button', { name: 'Bayar Sekarang' }).click(); await waiting;
  await page.locator('#cashier-form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  release();
  await expect(page.getByText(/Transaksi tersimpan.*tx-1/)).toBeVisible();
  expect(fixture.posts).toHaveLength(1);
});
test('quota conflict preserves draft until customers successfully reload', async ({ page }) => {
  const fixture = await setupStaffPage(page, { postStatus: 409, refreshFails: true,
    postResponse: { code: 'MEMBERSHIP_QUOTA_CHANGED', message: 'Kuota berubah' } });
  await page.goto('/cashier'); await fill(page);
  await page.getByRole('button', { name: 'Bayar Sekarang' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /Kuota/ })).toBeVisible();
  await expect(page.getByPlaceholder('Hafiz Reyhan')).toHaveValue('Budi Audit');
  await expect(page.getByRole('button', { name: 'Bayar Sekarang' })).toBeDisabled();
  fixture.refreshFails = false;
  await page.getByRole('button', { name: 'Muat ulang pelanggan' }).click();
  await expect(page.getByRole('button', { name: 'Bayar Sekarang' })).toBeEnabled();
  expect(fixture.posts).toHaveLength(1);
});
for (const [endpoint, options, message, retry] of [
  ['services', { serviceStatus: 500 }, 'Gagal memuat layanan', 'Muat ulang layanan'],
  ['customers', { customerStatus: 500 }, 'Gagal memuat pelanggan', 'Muat ulang pelanggan'],
  ['settings', { settingsStatus: 500 }, 'Gagal memuat pengaturan', 'Muat ulang pengaturan'],
]) {
  test(`${endpoint} failure is visible and retry preserves the draft`, async ({ page }) => {
    const fixture = await setupStaffPage(page, options);
    await page.goto('/cashier');
    await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
    await page.getByPlaceholder('Hafiz Reyhan').fill('Nama tersimpan');
    fixture.serviceStatus = fixture.customerStatus = fixture.settingsStatus = 200;
    await page.getByRole('button', { name: retry }).click();
    await expect(page.getByRole('alert').filter({ hasText: message })).toHaveCount(0);
    await expect(page.getByPlaceholder('Hafiz Reyhan')).toHaveValue('Nama tersimpan');
    expect(fixture.posts).toHaveLength(0);
  });
}
