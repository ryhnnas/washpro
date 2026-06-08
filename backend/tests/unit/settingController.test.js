const { updateSettings, syncMembershipPackages, SettingsHttpError } = require('../../src/controllers/settingController');
const prisma = require('../../src/config/prisma');

const mockTx = {
  business: { update: jest.fn() },
  businessSetting: { upsert: jest.fn() },
  membershipPackageTemplate: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  membershipPackageQuotaItem: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  service: { count: jest.fn() },
};

jest.mock('../../src/config/prisma', () => ({
  business: { update: jest.fn() },
  businessSetting: { upsert: jest.fn() },
  membershipPackageTemplate: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  membershipPackageQuotaItem: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  service: { count: jest.fn() },
  $transaction: jest.fn(async (callback) => callback(mockTx)),
}));

describe('Setting Controller - Membership Package Tenant Isolation', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { businessId: 'biz-a', role: 'OWNER' },
      body: {},
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(mockTx));
  });

  it('should reject update when membership package belongs to another tenant', async () => {
    req.body = {
      membershipPackages: [
        {
          id: 'pkg-tenant-b',
          name: 'Hacked Package',
          durationDays: 30,
          items: [{ serviceId: 'svc-a', quotaAmount: 10, deductionRate: 1 }],
        },
      ],
    };

    mockTx.membershipPackageTemplate.findFirst.mockResolvedValue(null);

    await updateSettings(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Paket membership tidak ditemukan' });
    expect(mockTx.membershipPackageTemplate.update).not.toHaveBeenCalled();
    expect(mockTx.membershipPackageQuotaItem.deleteMany).not.toHaveBeenCalled();
    expect(mockTx.membershipPackageQuotaItem.createMany).not.toHaveBeenCalled();
  });

  it('should reject quota items that reference services from another tenant', async () => {
    req.body = {
      membershipPackages: [
        {
          id: 'pkg-a',
          name: 'Valid Package',
          durationDays: 30,
          items: [{ serviceId: 'svc-other-tenant', quotaAmount: 5, deductionRate: 1 }],
        },
      ],
    };

    mockTx.membershipPackageTemplate.findFirst.mockResolvedValue({
      id: 'pkg-a',
      businessId: 'biz-a',
    });
    mockTx.membershipPackageTemplate.update.mockResolvedValue({ id: 'pkg-a' });
    mockTx.service.count.mockResolvedValue(0);

    await updateSettings(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Satu atau lebih layanan tidak valid untuk bisnis ini',
    });
    expect(mockTx.membershipPackageQuotaItem.deleteMany).not.toHaveBeenCalled();
    expect(mockTx.membershipPackageQuotaItem.createMany).not.toHaveBeenCalled();
  });

  it('should update owned package and replace quota items atomically', async () => {
    req.body = {
      membershipPackages: [
        {
          id: 'pkg-a',
          name: 'Updated Package',
          durationDays: 45,
          items: [{ serviceId: 'svc-a', quotaAmount: 12, deductionRate: 1 }],
        },
      ],
    };

    mockTx.membershipPackageTemplate.findFirst.mockResolvedValue({
      id: 'pkg-a',
      businessId: 'biz-a',
    });
    mockTx.membershipPackageTemplate.update.mockResolvedValue({ id: 'pkg-a' });
    mockTx.service.count.mockResolvedValue(1);
    mockTx.businessSetting.upsert.mockResolvedValue({ businessId: 'biz-a' });

    await updateSettings(req, res);

    expect(mockTx.membershipPackageTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: 'pkg-a', businessId: 'biz-a' },
    });
    expect(mockTx.service.count).toHaveBeenCalledWith({
      where: { businessId: 'biz-a', id: { in: ['svc-a'] } },
    });
    expect(mockTx.membershipPackageQuotaItem.deleteMany).toHaveBeenCalledWith({
      where: { templateId: 'pkg-a' },
    });
    expect(mockTx.membershipPackageQuotaItem.createMany).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });

  it('syncMembershipPackages throws SettingsHttpError for foreign template id', async () => {
    mockTx.membershipPackageTemplate.findFirst.mockResolvedValue(null);

    await expect(
      syncMembershipPackages(mockTx, 'biz-a', [{ id: 'pkg-b', name: 'X', items: [] }])
    ).rejects.toBeInstanceOf(SettingsHttpError);

    expect(mockTx.membershipPackageTemplate.update).not.toHaveBeenCalled();
  });
});
