const { DomainError } = require('../../src/utils/domainError');
const { activateCustomerMembership } = require('../../src/services/membershipService');

const mockTx = {
  businessSetting: { findUnique: jest.fn() },
  membershipPackageTemplate: { findFirst: jest.fn(), findUnique: jest.fn() },
  service: { count: jest.fn() },
  customerMembership: { updateMany: jest.fn(), create: jest.fn() },
  customerMembershipQuotaBalance: { createMany: jest.fn() },
};

describe('Membership Service - activateCustomerMembership tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTx.businessSetting.findUnique.mockResolvedValue({ membershipDurationDays: 30 });
    mockTx.customerMembership.updateMany.mockResolvedValue({ count: 0 });
    mockTx.customerMembership.create.mockResolvedValue({ id: 'mem-1' });
    mockTx.customerMembershipQuotaBalance.createMany.mockResolvedValue({ count: 0 });
  });

  it('throws 404 when templateId belongs to another tenant without mutating membership', async () => {
    mockTx.membershipPackageTemplate.findFirst.mockResolvedValue(null);

    await expect(
      activateCustomerMembership({
        businessId: 'biz-a',
        customerId: 'cust-a',
        templateId: 'template-b',
        tx: mockTx,
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'MEMBERSHIP_TEMPLATE_NOT_FOUND',
    });

    expect(mockTx.customerMembership.updateMany).not.toHaveBeenCalled();
    expect(mockTx.customerMembership.create).not.toHaveBeenCalled();
  });

  it('throws 403 when template quota references foreign services', async () => {
    mockTx.membershipPackageTemplate.findFirst.mockResolvedValue({
      id: 'tpl-a',
      businessId: 'biz-a',
      durationDays: 30,
      quotaItems: [{ serviceId: 'svc-foreign', quotaAmount: 10, deductionRate: 1 }],
    });
    mockTx.service.count.mockResolvedValue(0);

    await expect(
      activateCustomerMembership({
        businessId: 'biz-a',
        customerId: 'cust-a',
        templateId: 'tpl-a',
        tx: mockTx,
      })
    ).rejects.toBeInstanceOf(DomainError);

    expect(mockTx.customerMembership.create).not.toHaveBeenCalled();
  });

  it('activates membership when template and services are owned', async () => {
    mockTx.membershipPackageTemplate.findFirst.mockResolvedValue({
      id: 'tpl-a',
      businessId: 'biz-a',
      durationDays: 30,
      quotaItems: [{ serviceId: 'svc-a', quotaAmount: 5, deductionRate: 1 }],
    });
    mockTx.service.count.mockResolvedValue(1);

    const result = await activateCustomerMembership({
      businessId: 'biz-a',
      customerId: 'cust-a',
      templateId: 'tpl-a',
      tx: mockTx,
    });

    expect(result.id).toBe('mem-1');
    expect(mockTx.customerMembership.updateMany).toHaveBeenCalled();
    expect(mockTx.customerMembership.create).toHaveBeenCalled();
  });
});
