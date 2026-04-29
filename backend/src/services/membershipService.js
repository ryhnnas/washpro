const prisma = require('../config/prisma');

const isMembershipActive = (membership) => {
  if (!membership) return false;
  if (membership.status !== 'ACTIVE') return false;
  return new Date(membership.endAt) >= new Date();
};

const findActiveMembership = async (businessId, customerId) => {
  if (!customerId) return null;
  const memberships = await prisma.customerMembership.findMany({
    where: { businessId, customerId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: {
      balances: true,
      template: {
        include: {
          quotaItems: true,
        },
      },
    },
    take: 3,
  });
  const active = memberships.find(isMembershipActive);
  if (!active) return null;
  return active;
};

const calculateCoverage = ({ transactionQty, servicePrice, activeMembership, serviceId }) => {
  const defaultResult = {
    isUsingMembership: false,
    usedQty: 0,
    coveredAmount: 0,
    payableAmount: Math.round(transactionQty * servicePrice),
    reason: 'NO_MEMBERSHIP',
  };

  if (!activeMembership) return defaultResult;

  const templateQuota = activeMembership.template?.quotaItems?.find((q) => q.serviceId === serviceId);
  if (!templateQuota) {
    return { ...defaultResult, reason: 'SERVICE_NOT_INCLUDED' };
  }

  const balance = activeMembership.balances.find((b) => b.serviceId === serviceId);
  const remaining = balance?.remainingQty || 0;
  const deductionRate = templateQuota.deductionRate || 1;
  if (deductionRate <= 0) {
    return { ...defaultResult, reason: 'INVALID_DEDUCTION_RATE' };
  }

  const requiredQuota = transactionQty * deductionRate;
  const consumedQuota = Math.min(requiredQuota, remaining);
  const coverageRatio = requiredQuota > 0 ? consumedQuota / requiredQuota : 0;
  const coveredAmount = Math.round(transactionQty * servicePrice * coverageRatio);
  const payableAmount = Math.max(0, Math.round(transactionQty * servicePrice) - coveredAmount);

  if (consumedQuota <= 0) {
    return { ...defaultResult, reason: 'QUOTA_EMPTY' };
  }

  return {
    isUsingMembership: true,
    usedQty: consumedQuota,
    coveredAmount,
    payableAmount,
    reason: payableAmount === 0 ? 'FULLY_COVERED' : 'PARTIALLY_COVERED',
  };
};

const consumeQuotaAndLog = async ({
  tx,
  businessId,
  membershipId,
  transactionId,
  serviceId,
  usedQty,
  coveredAmount,
  payableAmount,
}) => {
  if (!membershipId || usedQty <= 0) return;

  await tx.customerMembershipQuotaBalance.updateMany({
    where: { customerMembershipId: membershipId, serviceId },
    data: { remainingQty: { decrement: usedQty } },
  });

  await tx.customerMembershipUsageLog.create({
    data: {
      businessId,
      customerMembershipId: membershipId,
      transactionId,
      serviceId,
      usedQty,
      coveredAmount,
      payableAmount,
    },
  });
};

const activateCustomerMembership = async ({ businessId, customerId, startAt = new Date(), tx = prisma }) => {
  const [setting, activeTemplate] = await Promise.all([
    tx.businessSetting.findUnique({ where: { businessId } }),
    tx.membershipPackageTemplate.findFirst({
      where: { businessId, isActive: true },
      include: { quotaItems: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  if (!activeTemplate) {
    throw new Error('Template paket membership belum dikonfigurasi.');
  }

  const durationDays = setting?.membershipDurationDays || activeTemplate.durationDays || 30;
  const startDate = new Date(startAt);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);

  await tx.customerMembership.updateMany({
    where: { businessId, customerId, status: 'ACTIVE' },
    data: { status: 'CANCELLED' },
  });

  const membership = await tx.customerMembership.create({
    data: {
      businessId,
      customerId,
      templateId: activeTemplate.id,
      startAt: startDate,
      endAt: endDate,
      status: 'ACTIVE',
    },
  });

  if (activeTemplate.quotaItems.length > 0) {
    await tx.customerMembershipQuotaBalance.createMany({
      data: activeTemplate.quotaItems.map((q) => ({
        customerMembershipId: membership.id,
        serviceId: q.serviceId,
        initialQty: q.quotaAmount,
        remainingQty: q.quotaAmount,
      })),
    });
  }

  return membership;
};

module.exports = {
  findActiveMembership,
  calculateCoverage,
  consumeQuotaAndLog,
  activateCustomerMembership,
};

