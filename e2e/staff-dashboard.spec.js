const { test, expect } = require('@playwright/test');
const { PrismaClient } = require('@prisma/client');
const { loginAs } = require('./helpers');
let prisma, businessId, previous, service, customer, template, membership;

test.beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || !['/washpro_test', '/washpro_ci'].includes(url.pathname)) {
    throw new Error('Staff E2E requires an isolated local washpro_test or washpro_ci database');
  }
  prisma = new PrismaClient();
  businessId = (await prisma.user.findUnique({ where: { email: 'staff@washpro.local' } })).businessId;
  previous = await prisma.businessSetting.findUnique({ where: { businessId } });
  service = await prisma.service.create({ data: { businessId, name: 'E2E Staff Cuci', price: 8000, type: 'KILOAN' } });
  customer = await prisma.customer.create({ data: { businessId, name: 'E2E Staff Member', phone: '6281990000001' } });
  template = await prisma.membershipPackageTemplate.create({ data: { businessId, name: 'E2E Staff Quota',
    quotaItems: { create: { serviceId: service.id, quotaAmount: 10, deductionRate: 1 } } } });
  membership = await prisma.customerMembership.create({ data: { businessId, customerId: customer.id, templateId: template.id,
    startAt: new Date(), endAt: new Date(Date.now() + 86400000), balances: { create: { serviceId: service.id, initialQty: 10, remainingQty: 10 } } } });
});
test.beforeEach(async () => {
  await prisma.businessSetting.update({ where: { businessId }, data: { allowStaffDashboard: true, allowStaffReports: false, requireCustomerName: false } });
});
test.afterEach(async () => {
  await prisma.businessSetting.update({ where: { businessId }, data: { allowStaffDashboard: previous.allowStaffDashboard,
    allowStaffReports: previous.allowStaffReports, requireCustomerName: previous.requireCustomerName } });
});
test.afterAll(async () => {
  if (businessId && customer) await prisma.transaction.deleteMany({ where: { businessId, customerId: customer.id } });
  if (membership) await prisma.customerMembership.delete({ where: { id: membership.id } });
  if (customer) await prisma.customer.delete({ where: { id: customer.id } });
  if (template) await prisma.membershipPackageTemplate.delete({ where: { id: template.id } });
  if (service) await prisma.service.delete({ where: { id: service.id } });
  if (prisma) await prisma.$disconnect();
});
test('staff login lands on cashier and denied dashboard API cannot return metrics', async ({ page }) => {
  await loginAs(page, 'staff');
  await expect(page).toHaveURL(/\/cashier/);
  await prisma.businessSetting.update({ where: { businessId }, data: { allowStaffDashboard: false } });
  await page.goto('/dashboard');
  await expect(page.getByText('Akses dashboard tidak diizinkan', { exact: true })).toBeVisible();
  const response = await page.request.get(`http://localhost:${process.env.PORT || '5001'}/api/dashboard/stats`);
  expect(response.status()).toBe(403);
  expect((await response.json()).code).toBe('STAFF_PERMISSION_DENIED');
});
test('staff dashboard does not expose forbidden report links', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(page.locator('a[href="/reports"]')).toHaveCount(0);
});
test('staff preview and saved membership bill agree and appear in Tracking', async ({ page }) => {
  await page.goto('/cashier');
  await page.getByPlaceholder('Hafiz Reyhan').fill(customer.name);
  await page.getByText(customer.name, { exact: true }).first().click();
  await page.locator('select').first().selectOption(service.id);
  await page.locator('input[step="0.01"]').first().fill('6');
  await page.getByRole('button', { name: '+', exact: true }).click();
  await page.locator('select').nth(1).selectOption(service.id);
  await page.locator('input[step="0.01"]').nth(1).fill('6');
  await expect(page.getByText(/Cover:.*80\.000.*Bayar:.*16\.000/)).toBeVisible();
  const responsePromise = page.waitForResponse(r => r.url().includes('/api/transactions') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Bayar Sekarang' }).click();
  const response = await responsePromise; expect(response.status()).toBe(201);
  const transaction = await response.json(); expect(transaction.payableAmount).toBe(16000);
  await expect(page.getByText(new RegExp(`Transaksi tersimpan.*${transaction.id}`))).toBeVisible();
  await page.goto('/tracking');
  await expect(page.getByText(customer.name, { exact: true }).first()).toBeVisible();
});
test('reports-only staff can load reports while dashboard remains forbidden', async ({ page }) => {
  await prisma.transaction.create({ data: { businessId, customerId: customer.id, customerName: 'E2E Reports Only',
    customerPhone: customer.phone, serviceName: service.name, weight: 1, totalPrice: 8000, payableAmount: 8000, paymentMethod: 'CASH' } });
  await prisma.businessSetting.update({ where: { businessId }, data: { allowStaffDashboard: false, allowStaffReports: true } });
  await page.goto('/reports');
  const response = await page.request.get(`http://localhost:${process.env.PORT || '5001'}/api/reports/charts`);
  expect(response.status()).toBe(200);
  expect((await response.json()).summary.totalTransactions).toBeGreaterThan(0);
  await expect(page.getByText('E2E Reports Only', { exact: true })).toBeVisible();
  const denied = await page.request.get(`http://localhost:${process.env.PORT || '5001'}/api/dashboard/stats`);
  expect(denied.status()).toBe(403);
});
