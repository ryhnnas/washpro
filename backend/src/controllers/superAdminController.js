const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const whatsappService = require('../services/whatsappService');
const emailService = require('../services/emailService');
const { invalidateSubscriptionCache } = require('../middleware/checkSubscription');
const { sendError } = require('../utils/errorResponse');

// ==================== LOGIN ====================
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await prisma.superAdmin.findUnique({ where: { email } });
    if (!admin) return res.status(404).json({ message: 'SuperAdmin tidak ditemukan' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: 'Password salah' });

    const secret = process.env.SUPERADMIN_JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: 'Konfigurasi server tidak lengkap' });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'SUPERADMIN' },
      secret,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login SuperAdmin Berhasil',
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    sendError(res, err, 500);
  }
};

// ==================== DASHBOARD STATS ====================
const getDashboardStats = async (req, res) => {
  try {
    const [totalBusinesses, activeBusinesses, trialBusinesses, pendingPayments] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { subscriptionStatus: 'ACTIVE' } }),
      prisma.business.count({ where: { subscriptionStatus: 'TRIAL' } }),
      prisma.subscriptionPayment.count({ where: { status: 'PENDING' } }),
    ]);

    // Hitung pendapatan bulan ini dari pembayaran APPROVED
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await prisma.subscriptionPayment.aggregate({
      where: { status: 'APPROVED', approvedAt: { gte: startOfMonth } },
      _sum: { amount: true },
    });

    res.json({
      totalBusinesses,
      activeBusinesses,
      trialBusinesses,
      pendingPayments,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
    });
  } catch (err) {
    sendError(res, err, 500);
  }
};

// ==================== KELOLA TOKO (BUSINESSES) ====================
const getBusinesses = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { deletedAt: null };
    if (status) where.subscriptionStatus = status;
    if (search) where.name = { contains: search };

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          users: { where: { role: 'OWNER' }, select: { name: true, email: true } },
          _count: { select: { transactions: true, customers: true } },
        },
      }),
      prisma.business.count({ where }),
    ]);

    res.json({ businesses, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    sendError(res, err, 500);
  }
};

const toggleBusiness = async (req, res) => {
  const { businessId } = req.params;
  const { action, reason } = req.body; // action: 'SUSPEND' | 'ACTIVATE'

  try {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return res.status(404).json({ message: 'Bisnis tidak ditemukan' });

    const newStatus = action === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE';
    const updated = await prisma.business.update({
      where: { id: businessId },
      data: { subscriptionStatus: newStatus },
    });

    invalidateSubscriptionCache(businessId);

    if (action === 'SUSPEND') {
      const ownerUser = await prisma.user.findFirst({
        where: { businessId, role: 'OWNER' },
        select: { name: true, email: true },
      });

      if (ownerUser?.email) {
        emailService.sendEmail({
          to: ownerUser.email,
          subject: 'WashPro - Akun Ditangguhkan',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color:#0f172a; margin:0 0 8px;">Akun Anda Ditangguhkan</h2>
              <p style="margin:0 0 12px; color:#334155;">Halo <strong>${ownerUser.name || business.name}</strong>,</p>
              <p style="margin:0 0 12px; color:#334155;">Akun WashPro Anda ditangguhkan oleh Admin. Mohon chat admin untuk informasi lebih lanjut.</p>
              ${reason ? `<p style="margin:0; color:#64748b;">Alasan: ${String(reason)}</p>` : ''}
            </div>
          `,
        }).catch(() => {});
      }

      if (business.phone) {
        const msg = `⚠️ *WashPro - Akun Ditangguhkan*\n${'━'.repeat(28)}\nHalo *${ownerUser?.name || business.name}*,\n\nAkun WashPro Anda ditangguhkan oleh Admin.\nMohon chat admin untuk informasi lebih lanjut.\n${reason ? `\nAlasan: ${reason}\n` : ''}\n_Tim WashPro_`;
        whatsappService.sendMessage({
          businessId: 'SUPERADMIN',
          phone: business.phone,
          message: msg,
        }).catch(() => {});
      }
    }

    res.json({ message: `Toko berhasil ${action === 'SUSPEND' ? 'ditangguhkan' : 'diaktifkan'}`, business: updated });
  } catch (err) {
    sendError(res, err, 500);
  }
};

const deleteBusiness = async (req, res) => {
  const { businessId } = req.params;
  const { confirmName } = req.body;

  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, subscriptionStatus: true },
    });
    if (!business) return res.status(404).json({ message: 'Bisnis tidak ditemukan' });

    // Konfirmasi ganda: nama bisnis harus cocok persis
    if (!confirmName || confirmName.trim() !== business.name.trim()) {
      return res.status(400).json({
        message: 'Konfirmasi nama bisnis tidak cocok. Ketik nama bisnis dengan tepat untuk melanjutkan penghapusan.',
        hint: 'Ketik nama bisnis persis seperti yang terdaftar.',
      });
    }

    // Soft delete — set deletedAt dan ubah status ke SUSPENDED
    await prisma.business.update({
      where: { id: businessId },
      data: {
        deletedAt: new Date(),
        subscriptionStatus: 'SUSPENDED',
      },
    });

    res.json({
      message: `Toko "${business.name}" telah dinonaktifkan. Data masih tersimpan dan dapat dipulihkan oleh tim teknis jika diperlukan.`,
    });
  } catch (err) {
    sendError(res, err, 500);
  }
};

// ==================== KELOLA PEMBAYARAN ====================
const getPayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status) where.status = status;

    const [payments, total] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          business: { select: { name: true, phone: true } },
          plan: { select: { name: true, durationDays: true } },
          uploadedBy: { select: { name: true, email: true } },
        },
      }),
      prisma.subscriptionPayment.count({ where }),
    ]);

    res.json({ payments, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    sendError(res, err, 500);
  }
};

const approvePayment = async (req, res) => {
  const { paymentId } = req.params;
  const superAdminId = req.superAdmin.id;

  try {
    const payment = await prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { business: true, plan: true },
    });

    if (!payment) return res.status(404).json({ message: 'Data pembayaran tidak ditemukan' });
    if (payment.status !== 'PENDING') return res.status(400).json({ message: `Pembayaran sudah dalam status ${payment.status}` });

    // Hitung masa aktif baru (perpanjang dari sekarang atau dari akhir masa aktif yang ada)
    const now = new Date();
    const currentEnd = payment.business.subscriptionEndAt;
    const baseDate = currentEnd && currentEnd > now ? currentEnd : now;
    const newSubscriptionEndAt = new Date(baseDate);
    newSubscriptionEndAt.setDate(newSubscriptionEndAt.getDate() + payment.plan.durationDays);

    // Update payment & business dalam satu transaksi
    const [updatedPayment] = await prisma.$transaction([
      prisma.subscriptionPayment.update({
        where: { id: paymentId },
        data: { status: 'APPROVED', approvedAt: now, approvedById: superAdminId },
      }),
      prisma.business.update({
        where: { id: payment.businessId },
        data: { subscriptionStatus: 'ACTIVE', subscriptionEndAt: newSubscriptionEndAt },
      }),
    ]);

    invalidateSubscriptionCache(payment.businessId);

    // Kirim notifikasi WA ke pemilik laundry (best-effort, tidak block response)
    const ownerUser = await prisma.user.findFirst({
      where: { businessId: payment.businessId, role: 'OWNER' },
    });
    const targetPhone = payment.business.phone;
    if (targetPhone) {
      const endDateStr = newSubscriptionEndAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const ownerName = ownerUser ? ownerUser.name : payment.business.name;
      const message = `✅ *WashPro - Pembayaran Dikonfirmasi*\n${'━'.repeat(28)}\nHalo *${ownerName}*,\n\nPembayaran langganan *${payment.plan.name}* Anda sebesar *Rp ${payment.amount.toLocaleString('id-ID')}* telah kami terima dan dikonfirmasi.\n\n📅 Masa aktif toko Anda kini berlaku hingga:\n*${endDateStr}*\n\nSelamat berjualan! 🚀\n_Tim WashPro_`;
      whatsappService.sendMessage({
        businessId: 'SUPERADMIN',
        phone: targetPhone,
        message,
      }).catch(() => {/* Notifikasi WA gagal tidak block response */});
    }

    res.json({
      message: `Pembayaran disetujui. Masa aktif toko diperpanjang s/d ${newSubscriptionEndAt.toLocaleDateString('id-ID')}`,
      payment: updatedPayment,
    });
  } catch (err) {
    sendError(res, err, 500);
  }
};

const rejectPayment = async (req, res) => {
  const { paymentId } = req.params;
  const { reason } = req.body;
  const superAdminId = req.superAdmin.id;

  try {
    const payment = await prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { business: true, plan: true },
    });

    if (!payment) return res.status(404).json({ message: 'Data pembayaran tidak ditemukan' });
    if (payment.status !== 'PENDING') return res.status(400).json({ message: `Pembayaran sudah dalam status ${payment.status}` });

    const updatedPayment = await prisma.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: 'REJECTED',
        approvedById: superAdminId,
        rejectionReason: reason || 'Bukti pembayaran tidak valid.',
      },
    });

    invalidateSubscriptionCache(payment.businessId);

    // Kembalikan status ke EXPIRED jika saat ini PENDING_PAYMENT
    if (payment.business.subscriptionStatus === 'PENDING_PAYMENT') {
      await prisma.business.update({
        where: { id: payment.businessId },
        data: { subscriptionStatus: 'EXPIRED' },
      });
    }

    // Kirim notifikasi WA ke pemilik laundry saat ditolak (best-effort)
    const ownerUser = await prisma.user.findFirst({
      where: { businessId: payment.businessId, role: 'OWNER' },
    });
    const targetPhone = payment.business.phone;
    if (targetPhone) {
      const ownerName = ownerUser ? ownerUser.name : payment.business.name;
      const rejectReason = reason || 'Bukti pembayaran tidak valid.';
      const message = `❌ *WashPro - Pembayaran Ditolak*\n${'━'.repeat(28)}\nHalo *${ownerName}*,\n\nMohon maaf, konfirmasi pembayaran paket *${payment.plan.name}* Anda sebesar *Rp ${payment.amount.toLocaleString('id-ID')}* ditolak oleh Admin.\n\n⚠️ Alasan:\n*${rejectReason}*\n\nSilakan periksa kembali bukti transfer Anda dan unggah ulang bukti yang valid pada halaman Paywall.\n\n_Tim WashPro_`;
      whatsappService.sendMessage({
        businessId: 'SUPERADMIN',
        phone: targetPhone,
        message,
      }).catch(() => {});
    }

    res.json({ message: 'Pembayaran berhasil ditolak.', payment: updatedPayment });
  } catch (err) {
    sendError(res, err, 500);
  }
};

// ==================== KELOLA PAKET ====================
const getPlans = async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { price: 'asc' } });
    res.json(plans);
  } catch (err) {
    sendError(res, err, 500);
  }
};

const upsertPlan = async (req, res) => {
  const { id, name, price, durationDays, features, isActive } = req.body;
  try {
    const plan = id
      ? await prisma.subscriptionPlan.update({ where: { id }, data: { name, price, durationDays, features, isActive } })
      : await prisma.subscriptionPlan.create({ data: { name, price, durationDays, features, isActive } });
    res.json({ message: 'Paket berhasil disimpan', plan });
  } catch (err) {
    sendError(res, err, 500);
  }
};

const getWhatsAppStatus = async (req, res) => {
  try {
    const status = await whatsappService.checkConnectionStatus('SUPERADMIN');
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const connectWhatsAppQR = async (req, res) => {
  try {
    const result = await whatsappService.loginWithQR('SUPERADMIN');
    if (!result.ok) return res.status(500).json({ error: result.error });
    res.json({ message: 'Silakan scan QR Code ini', qr_code: result.qr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const connectWhatsAppPairing = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    const result = await whatsappService.loginWithCode('SUPERADMIN', phoneNumber);
    if (!result.ok) return res.status(500).json({ error: result.error });
    res.json({ message: 'Masukkan kode ini di WhatsApp Anda', pairing_code: result.code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const disconnectWhatsApp = async (req, res) => {
  try {
    const result = await whatsappService.logoutDevice('SUPERADMIN');
    if (!result.ok) return res.status(500).json({ error: result.error });
    res.json({ message: 'WhatsApp SuperAdmin berhasil diputuskan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendWhatsAppTestMessage = async (req, res) => {
  const { phone } = req.body;

  try {
    const result = await whatsappService.sendMessage({
      businessId: 'SUPERADMIN',
      phone,
      message: `Pesan uji coba integrasi WhatsApp SuperAdmin WashPro berhasil.\n\n_Pesan otomatis dari WashPro._`
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  login,
  getDashboardStats,
  getBusinesses,
  toggleBusiness,
  deleteBusiness,
  getPayments,
  approvePayment,
  rejectPayment,
  getPlans,
  upsertPlan,
  getWhatsAppStatus,
  connectWhatsAppQR,
  connectWhatsAppPairing,
  disconnectWhatsApp,
  sendWhatsAppTestMessage,
};
