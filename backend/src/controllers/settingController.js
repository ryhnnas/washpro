const prisma = require('../config/prisma');
const whatsappService = require('../services/whatsappService');

// Sembunyikan password dari response
const sanitize = (s) => {
  if (!s) return s;
  const { whatsappPassword, ...rest } = s;
  return { ...rest, whatsappPasswordSet: !!whatsappPassword };
};

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
    const membershipTemplate = await prisma.membershipPackageTemplate.findFirst({
      where: { businessId, isActive: true },
      include: {
        quotaItems: {
          include: { service: { select: { id: true, name: true, unit: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      ...sanitize(setting),
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
    whatsappEnabled,
    whatsappApiUrl,
    whatsappUsername,
    whatsappPassword,
    whatsappSenderName,
    membershipPackageName,
    membershipDurationDays,
    membershipPackageItems,
  } = req.body;

  try {
    const data = {
      requireCustomerName,
      requireCustomerPhone,
      requireCustomerAddress,
      staffAllowedMenus: JSON.stringify(staffAllowedMenus || ['CASHIER', 'TRACKING']),
      whatsappEnabled,
      whatsappApiUrl,
      whatsappUsername,
      whatsappSenderName,
      membershipPackageName,
      membershipDurationDays,
    };
    // Hanya update password bila user mengisi (kosong = pertahankan lama)
    if (whatsappPassword !== undefined && whatsappPassword !== '') {
      data.whatsappPassword = whatsappPassword;
    }

    const businessId = req.user.businessId;
    const setting = await prisma.businessSetting.upsert({
      where: { businessId },
      update: data,
      create: {
        businessId,
        ...data,
        whatsappPassword: whatsappPassword || null,
        staffAllowedMenus: JSON.stringify(staffAllowedMenus || ['CASHIER', 'TRACKING']),
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

    res.json(sanitize(setting));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Test koneksi GOWA dari pengaturan saat ini (dipakai pada UI "Periksa Koneksi")
const testWhatsapp = async (req, res) => {
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ message: 'Hanya OWNER' });
  }
  const result = await whatsappService.checkGateway(req.user.businessId);
  res.json(result);
};

const sendTestMessage = async (req, res) => {
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ message: 'Hanya OWNER' });
  }
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Nomor HP wajib diisi' });

  const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
  const message =
    `*${business?.name || 'WashPro'}*\n` +
    `Pesan Uji Coba\n` +
    `${'-'.repeat(28)}\n` +
    `Selamat! Integrasi WhatsApp Gateway Anda sudah aktif. ` +
    `Mulai sekarang, nota digital akan terkirim otomatis ke pelanggan.\n\n` +
    `_Pesan otomatis dari sistem WashPro._`;
  const result = await whatsappService.sendMessage({
    businessId: req.user.businessId,
    phone,
    message,
  });
  res.json(result);
};

module.exports = { getSettings, updateSettings, testWhatsapp, sendTestMessage };
