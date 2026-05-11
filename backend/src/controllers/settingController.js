const prisma = require('../config/prisma');
const whatsappService = require('../services/whatsappService');

const getSettings = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    let setting = await prisma.businessSetting.findUnique({ where: { businessId } });
    if (!setting) {
      setting = await prisma.businessSetting.create({
        data: {
          businessId,
          staffAllowedMenus: JSON.stringify(['CASHIER', 'TRACKING']),
        },
      });
    }

    // Parse staffAllowedMenus (bisa array lama atau object baru)
    let config = {
      menus: ['CASHIER', 'TRACKING'],
      whatsappTemplates: {
        RECEIPT: null,
        PROSES: null,
        SELESAI: null,
        DIAMBIL: null,
      },
    };
    try {
      const parsed = JSON.parse(setting.staffAllowedMenus || '[]');
      if (Array.isArray(parsed)) {
        config.menus = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        config = { ...config, ...parsed };
        // Migrasi/handle legacy whatsappReceiptTemplate ke format baru
        if (parsed.whatsappReceiptTemplate && !config.whatsappTemplates?.RECEIPT) {
          if (!config.whatsappTemplates) config.whatsappTemplates = {};
          config.whatsappTemplates.RECEIPT = parsed.whatsappReceiptTemplate;
        }
      }
    } catch (e) {
      console.error('Error parsing staffAllowedMenus:', e);
    }

    const membershipTemplate = await prisma.membershipPackageTemplate.findFirst({
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
      staffAllowedMenus: JSON.stringify(config.menus), // Backward compatibility for frontend
      whatsappTemplates: config.whatsappTemplates,
      whatsappEnabled: isWaConnected,
      membershipPackage: membershipTemplate
        ? {
            id: membershipTemplate.id,
            name: membershipTemplate.name,
            durationDays: membershipTemplate.durationDays,
            items: membershipTemplate.quotaItems.map((i) => ({
              id: i.id,
              serviceId: i.serviceId,
              serviceName: i.service.name,
              unit: i.service.unit,
              quotaAmount: i.quotaAmount,
              deductionRate: i.deductionRate,
            })),
          }
        : null,
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
    requireCustomerName,
    requireCustomerPhone,
    requireCustomerAddress,
    staffAllowedMenus,
    whatsappTemplates,
    membershipPackageName,
    membershipDurationDays,
    membershipPackageItems,
  } = req.body;

  try {
    const combinedConfig = JSON.stringify({
      menus: staffAllowedMenus || ['CASHIER', 'TRACKING'],
      whatsappTemplates: whatsappTemplates || null,
    });

    const data = {
      requireCustomerName,
      requireCustomerPhone,
      requireCustomerAddress,
      staffAllowedMenus: combinedConfig,
      membershipPackageName,
      membershipDurationDays,
    };

    const businessId = req.user.businessId;
    const setting = await prisma.businessSetting.upsert({
      where: { businessId },
      update: data,
      create: {
        businessId,
        ...data,
      },
    });

    if (Array.isArray(membershipPackageItems)) {
      const currentTemplate = await prisma.membershipPackageTemplate.findFirst({
        where: { businessId, isActive: true },
      });
      const template = currentTemplate
        ? await prisma.membershipPackageTemplate.update({
            where: { id: currentTemplate.id },
            data: {
              name: membershipPackageName || setting.membershipPackageName,
              durationDays: membershipDurationDays || setting.membershipDurationDays,
            },
          })
        : await prisma.membershipPackageTemplate.create({
            data: {
              businessId,
              name: membershipPackageName || setting.membershipPackageName,
              durationDays: membershipDurationDays || setting.membershipDurationDays,
              isActive: true,
            },
          });

      await prisma.membershipPackageQuotaItem.deleteMany({
        where: { templateId: template.id },
      });
      if (membershipPackageItems.length > 0) {
        await prisma.membershipPackageQuotaItem.createMany({
          data: membershipPackageItems.map((i) => ({
            templateId: template.id,
            serviceId: i.serviceId,
            quotaAmount: Number(i.quotaAmount) || 0,
            deductionRate: Number(i.deductionRate) || 1,
          })),
        });
      }
    }

    // Return virtual fields too
    res.json({
      ...setting,
      staffAllowedMenus: JSON.stringify(staffAllowedMenus || ['CASHIER', 'TRACKING']),
      whatsappTemplates,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



module.exports = { getSettings, updateSettings };
