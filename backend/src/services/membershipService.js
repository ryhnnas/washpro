const { DomainError } = require('../utils/domainError');

/**
 * CATATAN PENTING — MEMBERSHIP COVERAGE CALCULATION
 * Source of truth. Frontend Cashier preview harus sinkron dengan calculateCoverage().
 */

const isMembershipActive = (membership) => {
  if (!membership) return false;
  if (membership.status !== 'ACTIVE') return false;
  return new Date(membership.endAt) >= new Date();
};

const findActiveMembership = async (businessId, customerId, tx = null) => {
  if (!customerId) return null;
  const client = tx || require('../config/prisma');
  const memberships = await client.customerMembership.findMany({
    where: { businessId, customerId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: {
      balances: true,
      template: { include: { quotaItems: true } },
    },
    take: 3,
  });
  const active = memberships.find(isMembershipActive);
  return active || null;
};

const resolveOwnedActiveTemplate = async (tx, businessId, templateId) => {
  let template;
  if (templateId) {
    template = await tx.membershipPackageTemplate.findFirst({
      where: { id: templateId, businessId, isActive: true },
      include: { quotaItems: true },
    });
    if (!template) {
      throw new DomainError(404, 'MEMBERSHIP_TEMPLATE_NOT_FOUND', 'Template paket membership tidak ditemukan');
    }
  } else {
    template = await tx.membershipPackageTemplate.findFirst({
      where: { businessId, isActive: true },
      include: { quotaItems: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!template) {
      throw new DomainError(404, 'MEMBERSHIP_TEMPLATE_NOT_FOUND', 'Template paket membership tidak ditemukan');
    }
  }

  if (template.quotaItems.length > 0) {
    const serviceIds = [...new Set(template.quotaItems.map((q) => q.serviceId))];
    const ownedCount = await tx.service.count({
      where: { businessId, id: { in: serviceIds } },
    });
    if (ownedCount !== serviceIds.length) {
      throw new DomainError(403, 'MEMBERSHIP_TEMPLATE_INVALID', 'Template mengandung layanan yang tidak valid untuk bisnis ini');
    }
  }

  return template;
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

  const updated = await tx.customerMembershipQuotaBalance.updateMany({
    where: {
      customerMembershipId: membershipId,
      serviceId,
      remainingQty: { gte: usedQty },
    },
    data: { remainingQty: { decrement: usedQty } },
  });

  if (updated.count === 0) {
    throw new DomainError(
      409,
      'MEMBERSHIP_QUOTA_CHANGED',
      'Kuota membership berubah karena transaksi paralel. Muat ulang data pelanggan dan coba lagi.'
    );
  }

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

const activateCustomerMembership = async ({
  businessId,
  customerId,
  templateId,
  startAt = new Date(),
  tx,
}) => {
  const client = tx || require('../config/prisma');

  const [setting, activeTemplate] = await Promise.all([
    client.businessSetting.findUnique({ where: { businessId } }),
    resolveOwnedActiveTemplate(client, businessId, templateId),
  ]);

  const durationDays = setting?.membershipDurationDays || activeTemplate.durationDays || 30;
  const startDate = new Date(startAt);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);

  await client.customerMembership.updateMany({
    where: { businessId, customerId, status: 'ACTIVE' },
    data: { status: 'CANCELLED' },
  });

  const membership = await client.customerMembership.create({
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
    await client.customerMembershipQuotaBalance.createMany({
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

const restoreQuotaAndCleanupLogs = async (tx, transactionId) => {
  const usageLogs = await tx.customerMembershipUsageLog.findMany({
    where: { transactionId },
  });

  for (const log of usageLogs) {
    await tx.customerMembershipQuotaBalance.update({
      where: {
        customerMembershipId_serviceId: {
          customerMembershipId: log.customerMembershipId,
          serviceId: log.serviceId,
        },
      },
      data: {
        remainingQty: { increment: log.usedQty },
      },
    });
  }

  await tx.customerMembershipUsageLog.deleteMany({
    where: { transactionId },
  });
};

module.exports = {
  findActiveMembership,
  resolveOwnedActiveTemplate,
  calculateCoverage,
  consumeQuotaAndLog,
  activateCustomerMembership,
  restoreQuotaAndCleanupLogs,
};
