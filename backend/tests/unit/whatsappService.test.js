const { normalizePhone, buildReceiptMessage } = require('../../src/services/whatsappService');
const prisma = require('../../src/config/prisma');

jest.mock('../../src/config/prisma', () => ({
  businessSetting: {
    findUnique: jest.fn().mockResolvedValue({ staffAllowedMenus: JSON.stringify({ menus: [] }) }),
  },
  business: {
    findUnique: jest.fn(),
  }
}));


describe('WhatsApp Service - Unit Tests', () => {
  describe('normalizePhone', () => {
    it('should convert 08xx to 628xx', () => {
      expect(normalizePhone('08123456789')).toBe('628123456789');
    });

    it('should keep 628xx as is', () => {
      expect(normalizePhone('628123456789')).toBe('628123456789');
    });

    it('should handle string with non-digits', () => {
      expect(normalizePhone('+62 812-3456-7890')).toBe('6281234567890');
    });

    it('should return null for invalid input', () => {
      expect(normalizePhone('abc')).toBe(null);
      expect(normalizePhone('')).toBe(null);
    });
  });

  describe('buildReceiptMessage', () => {
    it('should replace placeholders correctly', async () => {
      const business = { name: 'Cuci Express' };
      const transaction = {
        id: 'abc-123',
        customerName: 'Budi',
        totalPrice: 50000,
        paymentMethod: 'CASH',
        status: 'PENDING',
        startDate: new Date('2024-01-01T10:00:00Z'),
        serviceName: 'Cuci Kering',
        weight: 5
      };

      // Mock setting agar tidak ambil dari DB (optional, buildReceiptMessage calls getBusinessConfig internal)
      // Kita bisa mock prisma internal di sini jika perlu, tapi untuk unit test murni 
      // kita test default templatenya.

      const message = await buildReceiptMessage({ business, transaction });

      expect(message).toContain('Cuci Express');
      expect(message).toContain('Budi');
      expect(message).toMatch(/Rp.*50\.000/);
    });
  });
});
