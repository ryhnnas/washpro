const { getServices, createService, updateService } = require('../../src/controllers/serviceController');
const prisma = require('../../src/config/prisma');

jest.mock('../../src/config/prisma', () => ({
  service: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

describe('Service Controller - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { businessId: 'test-biz' },
      body: {},
      params: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  it('should list all active services for a business', async () => {
    const mockServices = [{ id: '1', name: 'Cuci Kiloan', price: 5000 }];
    prisma.service.findMany.mockResolvedValue(mockServices);

    await getServices(req, res);

    expect(prisma.service.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { businessId: 'test-biz' }
    }));
    expect(res.json).toHaveBeenCalledWith(mockServices);
  });

  it('should create a new service', async () => {
    req.body = { name: 'Setrika', price: 3000, type: 'KILOAN', unit: 'kg' };
    prisma.service.create.mockResolvedValue({ id: '2', ...req.body });

    await createService(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'Setrika' }));
  });

  it('should update an existing service', async () => {
    req.params.id = '1';
    req.body = { price: 6000 };
    prisma.service.update.mockResolvedValue({ id: '1', name: 'Cuci', price: 6000 });

    await updateService(req, res);

    expect(prisma.service.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ price: 6000 }));
  });
});
