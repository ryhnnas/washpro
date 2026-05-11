const { updateStatus } = require('../../src/controllers/transactionController');
const prisma = require('../../src/config/prisma');
const whatsappService = require('../../src/services/whatsappService');

jest.mock('../../src/config/prisma', () => ({
  transaction: {
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
      const mockTrans = { id: 'trans-1', businessId: 'biz-1', customerPhone: '62812' };
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
});
