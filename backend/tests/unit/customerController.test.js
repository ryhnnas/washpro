const { getCustomers, createCustomer, deleteCustomer } = require('../../src/controllers/customerController');
const prisma = require('../../src/config/prisma');

// Mock Prisma
jest.mock('../../src/config/prisma', () => ({
  customer: {
    findMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('Customer Controller - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { businessId: 'test-biz-id', role: 'OWNER' },
      query: {},
      params: {},
      body: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getCustomers', () => {
    it('should return paginated customers', async () => {
      const mockCustomers = [
        { id: '1', name: 'John Doe', _count: { transactions: 5 }, transactions: [], memberships: [] }
      ];
      prisma.customer.findMany.mockResolvedValue(mockCustomers);
      prisma.customer.count.mockResolvedValue(1);

      await getCustomers(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.any(Array),
        pagination: expect.objectContaining({ totalItems: 1 })
      }));
    });
  });

  describe('createCustomer', () => {
    it('should create or update a customer via upsert', async () => {
      req.body = { name: 'Jane Doe', phone: '0812' };
      const mockResult = { id: '2', ...req.body };
      prisma.customer.upsert.mockResolvedValue(mockResult);

      await createCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('deleteCustomer', () => {
    it('should allow owner to delete customer', async () => {
      req.params.id = '1';
      prisma.customer.delete.mockResolvedValue({ id: '1' });

      await deleteCustomer(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Pelanggan dihapus' });
    });

    it('should block non-owner from deleting customer', async () => {
      req.user.role = 'STAFF';
      await deleteCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Hanya OWNER yang dapat menghapus data pelanggan' });
    });
  });
});
