const { test, expect } = require('@playwright/test');
const { setupStaffPage } = require('./staffFixture');
const { readFile } = require('node:fs/promises');
const XLSX = require('xlsx-js-style');
test('reports-only staff loads reports without requesting dashboard permission', async ({ page }) => {
  const fixture = await setupStaffPage(page, { menus: ['CASHIER', 'TRACKING', 'REPORTS'], statsStatus: 403 });
  await page.route('**/api/transactions?**', route => route.fulfill({ json: { data: [{ id: 'report-tx', startDate: '2026-10-11T00:00:00Z', customerName: 'Report Customer', serviceName: 'Cuci', totalPrice: 8000 }], pagination: { total: 1 } } }));
  await page.route('**/api/reports/charts**', route => route.fulfill({ json: { summary: { totalTransactions: 1, totalRevenue: 8000 }, dailyRevenue: [], statusBreakdown: [], topServices: [] } }));
  await page.goto('/reports');
  await expect(page.getByText('Report Customer', { exact: true })).toBeVisible();
  expect(fixture.requests.filter(r => r.path.startsWith('/dashboard/'))).toHaveLength(0);
});

for (const timezoneId of ['UTC', 'America/Los_Angeles']) {
  test.describe(timezoneId, () => {
    test.use({ timezoneId });
    test('cashier estimate and receipt heading display the WIB calendar', async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-10-11T17:30:00Z'));
      await setupStaffPage(page);
      await page.goto('/cashier');
      await page.locator('select').first().selectOption('svc-1');
      await page.locator('input[step="0.01"]').first().fill('1');
      await expect(page.getByText('12/10/2026', { exact: true })).toBeVisible();
      await expect(page.getByText('13 Okt 2026, 00.30 WIB', { exact: true })).toBeVisible();
    });
    test('dashboard sends WIB boundaries for today, seven days and custom dates', async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-10-11T17:10:00Z'));
      const fixture = await setupStaffPage(page);
      await page.goto('/dashboard');
      const latest = () => fixture.requests.filter(r => r.path === '/dashboard/stats').at(-1)?.query;
      await expect.poll(latest).toEqual({ startDate: '2026-10-11T17:00:00.000Z', endDate: '2026-10-12T16:59:59.999Z' });
      await page.locator('select').selectOption('7_hari');
      await expect.poll(latest).toEqual({ startDate: '2026-10-05T17:00:00.000Z', endDate: '2026-10-12T16:59:59.999Z' });
      await page.locator('select').selectOption('kustom');
      await page.getByLabel('Tanggal awal').fill('2026-10-01');
      await page.getByLabel('Tanggal akhir').fill('2026-10-02');
      await expect.poll(latest).toEqual({ startDate: '2026-09-30T17:00:00.000Z', endDate: '2026-10-02T16:59:59.999Z' });
    });
    test('reports fetch and both exports use the selected WIB boundaries', async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-10-11T17:10:00Z'));
      await setupStaffPage(page, { role: 'OWNER' });
      const exports = [], queries = [];
      await page.route('**/api/transactions**', route => {
        const url = new URL(route.request().url());
        const query = Object.fromEntries(url.searchParams);
        if (url.pathname.endsWith('/export')) {
          exports.push(query);
          return route.fulfill({ json: { transactions: [], summary: { totalTransactions: 0, totalRevenue: 0, avgRevenuePerDay: 0 }, serviceBreakdown: [], business: { name: 'Laundry Audit' } } });
        }
        queries.push(query);
        return route.fulfill({ json: { data: [], pagination: { total: 0 } } });
      });
      await page.route('**/api/reports/charts**', route => route.fulfill({ json: { dailyRevenue: [], statusBreakdown: [], topServices: [] } }));
      await page.goto('/reports');
      await expect.poll(() => queries.at(-1)?.startDate).toBe('2026-10-11T17:00:00.000Z');
      await page.locator('select').selectOption('kustom');
      await expect(page.getByRole('button', { name: 'Export PDF' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Export Excel' })).toBeDisabled();
      await page.getByLabel('Tanggal awal').fill('2026-10-01');
      await page.getByLabel('Tanggal akhir').fill('2026-10-02');
      await expect.poll(() => queries.at(-1)?.endDate).toBe('2026-10-02T16:59:59.999Z');
      for (const name of ['Export PDF', 'Export Excel']) {
        const download = page.waitForEvent('download');
        await page.getByRole('button', { name }).click();
        const file = await download;
        const buffer = await readFile(await file.path());
        if (name === 'Export Excel') {
          const workbook = XLSX.read(buffer);
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
          expect(rows.some(row => row[0] === 'Periode: 1/10/2026 s.d. 2/10/2026')).toBe(true);
          expect(file.suggestedFilename()).toContain('2026-10-01_to_2026-10-02');
        } else {
          expect(buffer.toString('latin1')).toContain('Periode: 1/10/2026 - 2/10/2026');
        }
      }
      expect(exports).toHaveLength(2);
      for (const query of exports) expect(query).toMatchObject({ startDate: '2026-09-30T17:00:00.000Z', endDate: '2026-10-02T16:59:59.999Z' });
    });
  });
}
