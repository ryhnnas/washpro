const prisma = require('../config/prisma');
const whatsappService = require('../services/whatsappService');

const getSettings = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    
    // Pastikan bisnis ada sebelum mengambil/membuat setting
    const businessExists = await prisma.business.findUnique({ where: { id: businessId } });
    if (!businessExists) {
      return res.status(404).json({ 
        error: "Bisnis tidak ditemukan. Silakan login kembali atau registrasi ulang karena database baru saja di-reset." 
      });
    }

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
      whatsappNotificationStates: ['PENDING', 'SELESAI'],
    };
    try {
      const parsed = JSON.parse(setting.staffAllowedMenus || '{}');
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
      
      // Override from database column if exists
      if (setting.whatsappNotificationStates) {
        try {
          config.whatsappNotificationStates = JSON.parse(setting.whatsappNotificationStates);
        } catch (e) {
          console.error('Error parsing whatsappNotificationStates from DB:', e);
        }
      }
    } catch (e) {
      console.error('Error parsing staffAllowedMenus:', e);
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

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, address: true, phone: true }
    });

    res.json({
      ...setting,
      businessName: business?.name,
      businessAddress: business?.address,
      businessPhone: business?.phone,
      staffAllowedMenus: JSON.stringify(config.menus), // Backward compatibility for frontend
      whatsappTemplates: config.whatsappTemplates,
      whatsappNotificationStates: config.whatsappNotificationStates,
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
    staffAllowedMenus,
    whatsappTemplates,
    whatsappNotificationStates,
    membershipPackages, // Array of packages
  } = req.body;

  try {
    const businessId = req.user.businessId;

    // Update Business Profile if owner
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

    const combinedConfig = JSON.stringify({
      menus: staffAllowedMenus || ['CASHIER', 'TRACKING'],
      whatsappTemplates: whatsappTemplates || null,
    });

    const data = {
      requireCustomerName,
      requireCustomerPhone,
      requireCustomerAddress,
      staffAllowedMenus: combinedConfig,
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

    if (Array.isArray(membershipPackages)) {
      for (const pkg of membershipPackages) {
        if (!pkg.name) continue;

        const template = pkg.id
          ? await prisma.membershipPackageTemplate.update({
              where: { id: pkg.id },
              data: {
                name: pkg.name,
                durationDays: Number(pkg.durationDays) || 30,
              },
            })
          : await prisma.membershipPackageTemplate.create({
              data: {
                businessId,
                name: pkg.name,
                durationDays: Number(pkg.durationDays) || 30,
                isActive: true,
              },
            });

        if (Array.isArray(pkg.items)) {
          await prisma.membershipPackageQuotaItem.deleteMany({
            where: { templateId: template.id },
          });
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

    // Return virtual fields too
    res.json({
      ...setting,
      staffAllowedMenus: JSON.stringify(staffAllowedMenus || ['CASHIER', 'TRACKING']),
      whatsappTemplates,
      whatsappNotificationStates,
      membershipPackages: await prisma.membershipPackageTemplate.findMany({
        where: { businessId, isActive: true },
        include: {
          quotaItems: {
            include: { service: { select: { id: true, name: true, unit: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }).then(pkgs => pkgs.map(t => ({
        id: t.id,
        name: t.name,
        durationDays: t.durationDays,
        items: t.quotaItems.map(i => ({
          id: i.id,
          serviceId: i.serviceId,
          serviceName: i.service.name,
          unit: i.service.unit,
          quotaAmount: i.quotaAmount,
          deductionRate: i.deductionRate,
        })),
      }))),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



module.exports = { getSettings, updateSettings };
