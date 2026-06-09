const prisma = require('../config/prisma');
const whatsappService = require('../services/whatsappService');
const { sendError } = require('../utils/errorResponse');

class SettingsHttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const findOwnedMembershipTemplate = async (tx, businessId, templateId) => {
  const template = await tx.membershipPackageTemplate.findFirst({
    where: { id: templateId, businessId },
  });
  if (!template) {
    throw new SettingsHttpError(404, 'Paket membership tidak ditemukan');
  }
  return template;
};

const assertServicesOwnedByBusiness = async (tx, businessId, items) => {
  if (!Array.isArray(items) || items.length === 0) return;

  const serviceIds = [...new Set(items.map((i) => i.serviceId).filter(Boolean))];
  if (serviceIds.length === 0) return;

  const ownedCount = await tx.service.count({
    where: { businessId, id: { in: serviceIds } },
  });

  if (ownedCount !== serviceIds.length) {
    throw new SettingsHttpError(403, 'Satu atau lebih layanan tidak valid untuk bisnis ini');
  }
};

/**
 * Sync membership packages for the active tenant inside an open transaction.
 * Validates template + service ownership before mutating quota rows.
 */
const syncMembershipPackages = async (tx, businessId, membershipPackages) => {
  for (const pkg of membershipPackages) {
    if (!pkg.name) continue;

    let template;
    if (pkg.id) {
      await findOwnedMembershipTemplate(tx, businessId, pkg.id);
      template = await tx.membershipPackageTemplate.update({
        where: { id: pkg.id },
        data: { name: pkg.name, durationDays: Number(pkg.durationDays) || 30 },
      });
    } else {
      template = await tx.membershipPackageTemplate.create({
        data: {
          businessId,
          name: pkg.name,
          durationDays: Number(pkg.durationDays) || 30,
          isActive: true,
        },
      });
    }

    if (Array.isArray(pkg.items)) {
      await assertServicesOwnedByBusiness(tx, businessId, pkg.items);
      await tx.membershipPackageQuotaItem.deleteMany({ where: { templateId: template.id } });
      if (pkg.items.length > 0) {
        await tx.membershipPackageQuotaItem.createMany({
          data: pkg.items.map((i) => ({
            templateId: template.id,
            serviceId: i.serviceId,
            quotaAmount: Number(i.quotaAmount) || 0,
            deductionRate: Number(i.deductionRate) || 1,
          })),
        });
      }
    }
  }
};

const getSettings = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { setting: true }
    });

    if (!business) {
      return res.status(404).json({ error: "Bisnis tidak ditemukan." });
    }

    let setting = business.setting;
    if (!setting) {
      setting = await prisma.businessSetting.create({
        data: { businessId },
      });
    }

    // 1. Reconstruct staffAllowedMenus for Frontend compatibility
    const menus = ['CASHIER', 'TRACKING'];
    if (setting.allowStaffDashboard) menus.push('DASHBOARD');
    if (setting.allowStaffCustomers) menus.push('CUSTOMERS');
    if (setting.allowStaffServices) menus.push('SERVICES');
    if (setting.allowStaffReports) menus.push('REPORTS');

    // 2. Handle WhatsApp Templates
    let whatsappTemplates = { RECEIPT: null, PROSES: null, SELESAI: null, DIAMBIL: null };
    if (setting.whatsappTemplates) {
      try {
        whatsappTemplates = { ...whatsappTemplates, ...JSON.parse(setting.whatsappTemplates) };
      } catch (e) { console.error('Error parsing whatsappTemplates:', e); }
    }

    // 3. Handle WhatsApp Notification States
    let whatsappNotificationStates = ['PENDING', 'SELESAI'];
    if (setting.whatsappNotificationStates) {
      try {
        whatsappNotificationStates = JSON.parse(setting.whatsappNotificationStates);
      } catch (e) { console.error('Error parsing whatsappNotificationStates:', e); }
    }

    const membershipTemplates = await prisma.membershipPackageTemplate.findMany({
      where: { businessId, isActive: true },
      include: {
        quotaItems: {
          include: { service: { select: { id: true, name: true, unit: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const waSession = await prisma.whatsAppSession.findUnique({ where: { businessId } });
    const isWaConnected = waSession?.status === 'connected' && process.env.GOWA_ENABLED !== 'false';

    res.json({
      ...setting,
      businessName: business.name,
      businessAddress: business.address,
      businessPhone: business.phone,
      staffAllowedMenus: JSON.stringify(menus),
      whatsappTemplates,
      whatsappNotificationStates,
      whatsappEnabled: isWaConnected,
      membershipPackages: membershipTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        durationDays: t.durationDays,
        items: t.quotaItems.map((i) => ({
          id: i.id,
          serviceId: i.serviceId,
          serviceName: i.service.name,
          unit: i.service.unit,
          quotaAmount: i.quotaAmount,
          deductionRate: i.deductionRate,
        })),
      })),
    });
  } catch (error) {
    sendError(res, error, 500);
  }
};

const updateSettings = async (req, res) => {
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ message: 'Hanya OWNER yang bisa mengubah pengaturan' });
  }

  const {
    businessName,
    businessAddress,
    businessPhone,
    requireCustomerName,
    requireCustomerPhone,
    requireCustomerAddress,
    staffAllowedMenus, // Array format from frontend
    whatsappTemplates,
    whatsappNotificationStates,
    membershipPackages,
  } = req.body;

  try {
    const businessId = req.user.businessId;

    const menus = Array.isArray(staffAllowedMenus) ? staffAllowedMenus : [];
    const settingData = {
      requireCustomerName,
      requireCustomerPhone,
      requireCustomerAddress,
      allowStaffDashboard: menus.includes('DASHBOARD'),
      allowStaffCustomers: menus.includes('CUSTOMERS'),
      allowStaffServices: menus.includes('SERVICES'),
      allowStaffReports: menus.includes('REPORTS'),
      whatsappTemplates: whatsappTemplates ? JSON.stringify(whatsappTemplates) : null,
      whatsappNotificationStates: whatsappNotificationStates ? JSON.stringify(whatsappNotificationStates) : null,
    };

    const setting = await prisma.$transaction(async (tx) => {
      if (businessName || businessAddress || businessPhone) {
        await tx.business.update({
          where: { id: businessId },
          data: {
            name: businessName,
            address: businessAddress,
            phone: businessPhone,
          },
        });
      }

      const upsertedSetting = await tx.businessSetting.upsert({
        where: { businessId },
        update: settingData,
        create: {
          businessId,
          ...settingData,
        },
      });

      if (Array.isArray(membershipPackages)) {
        await syncMembershipPackages(tx, businessId, membershipPackages);
      }

      return upsertedSetting;
    });

    res.json({
      ...setting,
      staffAllowedMenus: JSON.stringify(menus),
      whatsappTemplates,
      whatsappNotificationStates,
    });
  } catch (error) {
    if (error instanceof SettingsHttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    sendError(res, error, 500);
  }
};



/**
 * GET /api/settings/public
 * Endpoint yang bisa diakses semua role (OWNER & STAFF).
 * Return subset settings yang dibutuhkan untuk operasional (kasir, menu visibility).
 * Tidak mengekspos data sensitif seperti WA templates atau konfigurasi admin.
 */
const getPublicSettings = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { setting: true },
    });

    if (!business) {
      return res.status(404).json({ error: 'Bisnis tidak ditemukan.' });
    }

    const setting = business.setting;
    if (!setting) {
      return res.json({
        businessName: business.name,
        requireCustomerName: true,
        requireCustomerPhone: true,
        requireCustomerAddress: false,
        staffAllowedMenus: JSON.stringify(['CASHIER', 'TRACKING']),
        membershipPackages: [],
      });
    }

    // Reconstruct staffAllowedMenus
    const menus = ['CASHIER', 'TRACKING'];
    if (setting.allowStaffDashboard) menus.push('DASHBOARD');
    if (setting.allowStaffCustomers) menus.push('CUSTOMERS');
    if (setting.allowStaffServices) menus.push('SERVICES');
    if (setting.allowStaffReports) menus.push('REPORTS');

    // Membership packages (dibutuhkan kasir untuk preview coverage)
    const membershipTemplates = await prisma.membershipPackageTemplate.findMany({
      where: { businessId, isActive: true },
      include: {
        quotaItems: {
          include: { service: { select: { id: true, name: true, unit: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      businessName: business.name,
      requireCustomerName: setting.requireCustomerName,
      requireCustomerPhone: setting.requireCustomerPhone,
      requireCustomerAddress: setting.requireCustomerAddress,
      staffAllowedMenus: JSON.stringify(menus),
      membershipPackages: membershipTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        durationDays: t.durationDays,
        items: t.quotaItems.map((i) => ({
          id: i.id,
          serviceId: i.serviceId,
          serviceName: i.service.name,
          unit: i.service.unit,
          quotaAmount: i.quotaAmount,
          deductionRate: i.deductionRate,
        })),
      })),
    });
  } catch (error) {
    sendError(res, error, 500);
  }
};

module.exports = {
  getSettings,
  getPublicSettings,
  updateSettings,
  syncMembershipPackages,
  SettingsHttpError,
};
