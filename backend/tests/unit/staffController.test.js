const { getStaff, createStaff } = require('../../src/controllers/staffController');
const prisma = require('../../src/config/prisma');
const bcrypt = require('bcryptjs');

jest.mock('../../src/config/prisma', () => ({
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('bcryptjs');

describe('Staff Controller - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    req = { user: { businessId: 'biz-1', role: 'OWNER' }, body: {} };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  it('should list all staff for the business', async () => {
    const mockStaff = [{ id: 's1', name: 'Staff 1' }];
    prisma.user.findMany.mockResolvedValue(mockStaff);

    await getStaff(req, res);

    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { businessId: 'biz-1', role: 'STAFF' }
    }));
    expect(res.json).toHaveBeenCalledWith(mockStaff);
  });

  it('should allow owner to create new staff', async () => {
    req.body = { name: 'New Staff', email: 'staff@test.com', password: 'pass' };
    prisma.user.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed');
    prisma.user.create.mockResolvedValue({ id: 's2', name: 'New Staff' });

    await createStaff(req, res);

    expect(prisma.user.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
