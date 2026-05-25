const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const whatsappService = require('../services/whatsappService');

// ==================== LOGIN ====================
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await prisma.superAdmin.findUnique({ where: { email } });
    if (!admin) return res.status(404).json({ message: 'SuperAdmin tidak ditemukan' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: 'Password salah' });

    const token = jwt.sign(
      { id: admin.id, role: 'SUPERADMIN' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login SuperAdmin Berhasil',
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== DASHBOARD STATS ====================
const getDashboardStats = async (req, res) => {
  try {
    const [totalBusinesses, activeBusinesses, trialBusinesses, pendingPayments, pendingCount] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { subscriptionStatus: 'ACTIVE' } }),
      prisma.business.count({ where: { subscriptionStatus: 'TRIAL' } }),
      prisma.subscriptionPayment.count({ where: { status: 'PENDING' } }),
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
    res.status(500).json({ error: err.message });
  }
};

// ==================== KELOLA TOKO (BUSINESSES) ====================
const getBusinesses = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
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
    res.status(500).json({ error: err.message });
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

    res.json({ message: `Toko berhasil ${action === 'SUSPEND' ? 'ditangguhkan' : 'diaktifkan'}`, business: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteBusiness = async (req, res) => {
  const { businessId } = req.params;
  try {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return res.status(404).json({ message: 'Bisnis tidak ditemukan' });

    // Cascade delete akan otomatis menghapus semua data terkait
    await prisma.business.delete({ where: { id: businessId } });

    res.json({ message: `Toko "${business.name}" dan seluruh datanya berhasil dihapus.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
        },
      }),
      prisma.subscriptionPayment.count({ where }),
    ]);

    res.json({ payments, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
};

// ==================== KELOLA PAKET ====================
const getPlans = async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { price: 'asc' } });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    if (!phoneNumber) return res.status(400).json({ message: 'Nomor HP wajib diisi' });

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
  if (!phone) return res.status(400).json({ message: 'Nomor HP wajib diisi' });

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
