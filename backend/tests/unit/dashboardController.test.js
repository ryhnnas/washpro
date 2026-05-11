const { getDashboardStats } = require('../../src/controllers/dashboardController');
const prisma = require('../../src/config/prisma');

jest.mock('../../src/config/prisma', () => ({
  transaction: {
    aggregate: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  customer: {
    count: jest.fn(),
  },
}));

describe('Dashboard Controller - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    req = { user: { businessId: 'biz-1' }, query: {} };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  it('should return combined statistics for the dashboard', async () => {
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { payableAmount: 1500000 } });
    prisma.transaction.count.mockResolvedValue(45);
    prisma.customer.count.mockResolvedValue(20);
    prisma.transaction.groupBy.mockResolvedValue([]);
    prisma.transaction.findMany.mockResolvedValue([]);

    await getDashboardStats(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      totalRevenue: 1500000,
      totalTransactions: 45,
      totalCustomers: 20,
      activeQueue: expect.any(Number)
    }));
  });
});
