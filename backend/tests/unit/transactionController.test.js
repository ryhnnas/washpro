const { updateStatus, getReportCharts } = require('../../src/controllers/transactionController');
const prisma = require('../../src/config/prisma');
const whatsappService = require('../../src/services/whatsappService');

jest.mock('../../src/config/prisma', () => ({
  transaction: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  businessSetting: {
    findUnique: jest.fn(),
  },
}));

jest.mock('../../src/services/whatsappService', () => ({
  sendStatusUpdate: jest.fn().mockResolvedValue({ ok: true }),
}));

describe('Transaction Controller - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { businessId: 'biz-1' },
      params: { id: 'trans-1' },
      body: { status: 'SELESAI' }
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('updateStatus', () => {
    it('should update transaction status and send WA notification if allowed', async () => {
      const mockTrans = { id: 'trans-1', businessId: 'biz-1', customerPhone: '62812', status: 'PROSES' };
      prisma.transaction.findFirst.mockResolvedValue(mockTrans);
      prisma.transaction.update.mockResolvedValue({ ...mockTrans, status: 'SELESAI' });

      // Mock setting agar SELESAI diizinkan kirim WA
      prisma.businessSetting.findUnique.mockResolvedValue({
        whatsappNotificationStates: JSON.stringify(['PENDING', 'SELESAI'])
      });

      await updateStatus(req, res);

      expect(prisma.transaction.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'trans-1' },
        data: { status: 'SELESAI' }
      }));
      expect(whatsappService.sendStatusUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'SELESAI' }));
    });

    it('should return 404 if transaction not found', async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      await updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transaksi tidak ditemukan' });
    });
  });
  it('groups report days in WIB and provides paid summary without dashboard access', async () => {
    prisma.transaction.findMany.mockResolvedValue([
      { startDate: '2026-10-10T17:15:00Z', status: 'PENDING', paymentMethod: 'CASH', payableAmount: 10000 },
      { startDate: '2026-10-11T05:00:00Z', status: 'PENDING', paymentMethod: 'BAYAR_NANTI', payableAmount: 5000 },
      { startDate: '2026-10-11T05:00:00Z', status: 'CANCELLED', paymentMethod: 'CASH', payableAmount: 9000 },
    ]);
    req.query = { startDate: '2026-10-10T17:00:00Z', endDate: '2026-10-11T16:59:59.999Z' };
    await getReportCharts(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      summary: { totalTransactions: 2, totalRevenue: 10000 },
      dailyRevenue: [{ date: '11 Okt', revenue: 15000 }],
    }));
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      businessId: 'biz-1', startDate: { gte: new Date(req.query.startDate), lte: new Date(req.query.endDate) },
    } }));
  });
});
