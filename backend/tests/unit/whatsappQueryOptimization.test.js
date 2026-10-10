const prisma = require('../../src/config/prisma');
const wa = require('../../src/services/whatsappService');
const queue = require('../../src/services/whatsappQueueService');

jest.mock('../../src/config/prisma', () => ({
  whatsAppQueue: { findMany: jest.fn(), update: jest.fn() },
  whatsAppSession: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
  business: { findUnique: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.spyOn(Math, 'random').mockReturnValue(0);
  process.env.GOWA_ENABLED = 'true';
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  prisma.whatsAppQueue.update.mockResolvedValue({});
  prisma.business.findUnique.mockImplementation(async ({ where }) => ({ id: where.id }));
  prisma.whatsAppSession.upsert.mockResolvedValue({});
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); delete process.env.GOWA_ENABLED; });

const seed = (n, status = 'connected') => {
  prisma.whatsAppQueue.findMany.mockResolvedValue(Array.from({ length: n }, (_, i) => ({ id: `msg-${i}`, businessId: 'biz-a', customerPhone: '628123456789', message: 'Test', attempts: 0 })));
  prisma.whatsAppSession.findMany.mockResolvedValue([{ businessId: 'biz-a', status }]);
  prisma.whatsAppSession.findUnique.mockResolvedValue({ businessId: 'biz-a', status });
};

it.each([1, 10])('reads sessions once for a batch of %i connected messages', async (n) => {
  seed(n);
  const processing = queue.processQueue(wa);
  await jest.runAllTimersAsync();
  await processing;
  expect(prisma.whatsAppSession.findMany).toHaveBeenCalledTimes(1);
  expect(prisma.whatsAppSession.findMany).toHaveBeenCalledWith({ where: { businessId: { in: ['biz-a'] } } });
  expect(prisma.whatsAppSession.findUnique).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledTimes(n);
  expect(prisma.whatsAppQueue.update).toHaveBeenCalledTimes(n);
  expect(prisma.whatsAppQueue.update).toHaveBeenLastCalledWith({ where: { id: `msg-${n - 1}` }, data: { status: 'SENT', attempts: 1 } });
});

it('leaves disconnected messages pending without consuming attempts', async () => {
  seed(10, 'disconnected');
  await queue.processQueue(wa);
  expect(fetch).not.toHaveBeenCalled();
  expect(prisma.whatsAppQueue.update).not.toHaveBeenCalled();
  expect(prisma.whatsAppSession.findMany).toHaveBeenCalledTimes(1);
});

it('stops sending further messages after the gateway reports a dropped session', async () => {
  seed(3);
  fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'not connected' }) });
  const processing = queue.processQueue(wa);
  await jest.runAllTimersAsync();
  await processing;
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(prisma.whatsAppSession.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.objectContaining({ status: 'disconnected' }) }));
  expect(prisma.whatsAppQueue.update).toHaveBeenCalledTimes(1);
  expect(prisma.whatsAppQueue.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', attempts: 1 }) }));
});

it('still reads a fresh session for normal endpoint sends', async () => {
  seed(1);
  await wa.sendMessage({ businessId: 'biz-a', phone: '628123456789', message: 'Test' });
  expect(prisma.whatsAppSession.findUnique).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('does not trust a supplied session belonging to a different business', async () => {
  seed(1, 'disconnected');
  const result = await wa.sendMessage({ businessId: 'biz-a', phone: '628123456789', message: 'Test', skipQueue: true, session: { businessId: 'biz-b', status: 'connected' } });
  expect(result.reason).toBe('SESSION_NOT_CONNECTED');
  expect(fetch).not.toHaveBeenCalled();
});

it('does not process the same batch twice when worker ticks overlap', async () => {
  seed(1);
  const first = queue.processQueue(wa);
  const second = queue.processQueue(wa);
  await jest.runAllTimersAsync();
  await Promise.all([first, second]);
  expect(prisma.whatsAppQueue.findMany).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('loads business identities with health-check sessions instead of per session', async () => {
  prisma.whatsAppSession.findMany.mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ businessId: `biz-${i}`, business: { id: `biz-${i}` } })));
  const interval = wa.startHealthCheck();
  await jest.advanceTimersByTimeAsync(330000);
  clearInterval(interval);
  expect(prisma.whatsAppSession.findMany).toHaveBeenCalledWith(expect.objectContaining({ include: { business: { select: { id: true } } } }));
  expect(prisma.business.findUnique).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledTimes(10);
});
