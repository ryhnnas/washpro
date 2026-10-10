const { createTransactionSchema } = require('../../src/schemas/transactionSchema');
const { updateSettingSchema } = require('../../src/schemas/settingSchema');
const { getSettings, getPublicSettings, updateSettings } = require('../../src/controllers/settingController');
const prisma = require('../../src/config/prisma');
jest.mock('../../src/config/prisma', () => ({
  business: { findUnique: jest.fn() },
  membershipPackageTemplate: { findMany: jest.fn() },
  whatsAppSession: { findUnique: jest.fn() },
  $transaction: jest.fn(),
}));
const payload = { customerName: '   ', items: [{ serviceId: 'svc-1', qty: 1 }] };
const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
beforeEach(() => {
  jest.clearAllMocks();
  prisma.business.findUnique.mockResolvedValue({ name: 'Laundry', setting: { requireCustomerName: false } });
  prisma.membershipPackageTemplate.findMany.mockResolvedValue([]);
  prisma.whatsAppSession.findUnique.mockResolvedValue(null);
});
test('rejects whitespace-only names', () => {
  expect(createTransactionSchema.safeParse(payload).success).toBe(false);
});
test('trims a valid name', () => {
  expect(createTransactionSchema.parse({ ...payload, customerName: ' Budi ' }).customerName).toBe('Budi');
});
test('rejects disabling the customer name through settings', () => {
  expect(updateSettingSchema.safeParse({ requireCustomerName: false }).success).toBe(false);
});
test.each([getSettings, getPublicSettings])('legacy settings cannot hide the required name (%p)', async (controller) => {
  const response = res();
  await controller({ user: { businessId: 'b1' } }, response);
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ requireCustomerName: true }));
});
test('updates normalize the stored name requirement even if omitted', async () => {
  const upsert = jest.fn().mockResolvedValue({ requireCustomerName: true });
  prisma.$transaction.mockImplementation(fn => fn({ businessSetting: { upsert } }));
  await updateSettings({ user: { role: 'OWNER', businessId: 'b1' }, body: {} }, res());
  expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.objectContaining({ requireCustomerName: true }), create: expect.objectContaining({ requireCustomerName: true }) }));
});
