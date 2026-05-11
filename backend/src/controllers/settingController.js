const prisma = require('../config/prisma');
const whatsappService = require('../services/whatsappService');

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
    if (setting.allowStaffServices)  menus.push('SERVICES');
    if (setting.allowStaffReports)   menus.push('REPORTS');
    if (setting.allowStaffSettings)  menus.push('SETTINGS');

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
    res.status(500).json({ error: error.message });
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

    // Update Business Profile
    if (businessName || businessAddress || businessPhone) {
      await prisma.business.update({
        where: { id: businessId },
        data: {
          name: businessName,
          address: businessAddress,
          phone: businessPhone
        }
      });
    }

    // Map staffAllowedMenus (Array) to Boolean columns
    const menus = Array.isArray(staffAllowedMenus) ? staffAllowedMenus : [];
    const data = {
      requireCustomerName,
      requireCustomerPhone,
      requireCustomerAddress,
      allowStaffDashboard: menus.includes('DASHBOARD'),
      allowStaffCustomers: menus.includes('CUSTOMERS'),
      allowStaffServices:  menus.includes('SERVICES'),
      allowStaffReports:   menus.includes('REPORTS'),
      allowStaffSettings:  menus.includes('SETTINGS'),
      whatsappTemplates: whatsappTemplates ? JSON.stringify(whatsappTemplates) : null,
      whatsappNotificationStates: whatsappNotificationStates ? JSON.stringify(whatsappNotificationStates) : null,
    };

    const setting = await prisma.businessSetting.upsert({
      where: { businessId },
      update: data,
      create: {
        businessId,
        ...data,
      },
    });

    // Update Membership Packages (Logic stays same)
    if (Array.isArray(membershipPackages)) {
      for (const pkg of membershipPackages) {
        if (!pkg.name) continue;
        const template = pkg.id
          ? await prisma.membershipPackageTemplate.update({
              where: { id: pkg.id },
              data: { name: pkg.name, durationDays: Number(pkg.durationDays) || 30 },
            })
          : await prisma.membershipPackageTemplate.create({
              data: { businessId, name: pkg.name, durationDays: Number(pkg.durationDays) || 30, isActive: true },
            });

        if (Array.isArray(pkg.items)) {
          await prisma.membershipPackageQuotaItem.deleteMany({ where: { templateId: template.id } });
          if (pkg.items.length > 0) {
            await prisma.membershipPackageQuotaItem.createMany({
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
    }

    res.json({
      ...setting,
      staffAllowedMenus: JSON.stringify(menus),
      whatsappTemplates,
      whatsappNotificationStates,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



module.exports = { getSettings, updateSettings };
