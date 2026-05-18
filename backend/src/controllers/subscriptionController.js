const prisma = require('../config/prisma');
const path = require('path');
const fs = require('fs');

// Konstanta: trial 7 hari
const TRIAL_DAYS = 7;

// ==================== STATUS LANGGANAN ====================
const getStatus = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        subscriptionStatus: true,
        trialEndAt: true,
        subscriptionEndAt: true,
        name: true,
        phone: true,
      },
    });

    if (!business) return res.status(404).json({ message: 'Bisnis tidak ditemukan' });

    const now = new Date();
    const { subscriptionStatus, trialEndAt, subscriptionEndAt } = business;

    // Hitung sisa hari (untuk banner H-7)
    let daysRemaining = null;
    let showWarningBanner = false;
    const activeEndDate = subscriptionStatus === 'TRIAL' ? trialEndAt : subscriptionEndAt;

    if (activeEndDate) {
      const msRemaining = new Date(activeEndDate) - now;
      daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      // Tampilkan banner peringatan jika sisa <= 7 hari dan status masih aktif
      showWarningBanner = daysRemaining <= 7 && daysRemaining > 0 && (subscriptionStatus === 'TRIAL' || subscriptionStatus === 'ACTIVE');
    }

    res.json({
      subscriptionStatus,
      trialEndAt,
      subscriptionEndAt,
      daysRemaining,
      showWarningBanner,
      businessName: business.name,
      businessPhone: business.phone,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== DAFTAR PAKET ====================
const getPlans = async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== UPLOAD BUKTI BAYAR ====================
/**
 * Endpoint ini menerima bukti pembayaran berupa Base64 image string.
 * Image disimpan di backend/uploads/payments/
 * Untuk produksi, idealnya ganti dengan cloud storage (S3/Cloudinary).
 */
const submitPayment = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { planId, proofOfPayment, paymentMethod = 'QRIS_DANA', phone } = req.body;

    if (!planId) return res.status(400).json({ message: 'planId wajib diisi' });
    if (!proofOfPayment) return res.status(400).json({ message: 'Bukti pembayaran wajib diunggah' });

    // Validasi plan ada dan aktif
    const plan = await prisma.subscriptionPlan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) return res.status(404).json({ message: 'Paket berlangganan tidak ditemukan' });

    // Cek apakah sudah ada pembayaran PENDING untuk bisnis ini
    const existingPending = await prisma.subscriptionPayment.findFirst({
      where: { businessId, status: 'PENDING' },
    });
    if (existingPending) {
      return res.status(400).json({
        message: 'Anda sudah memiliki pembayaran yang sedang menunggu konfirmasi Admin. Mohon tunggu.',
      });
    }

    // Simpan file bukti bayar (Base64 → File)
    let proofUrl = proofOfPayment; // Default: simpan URL/base64 as-is
    if (proofOfPayment.startsWith('data:image')) {
      const uploadsDir = path.join(__dirname, '../../uploads/payments');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      const ext = proofOfPayment.substring(proofOfPayment.indexOf('/') + 1, proofOfPayment.indexOf(';'));
      const fileName = `proof_${businessId}_${Date.now()}.${ext}`;
      const filePath = path.join(uploadsDir, fileName);
      const base64Data = proofOfPayment.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      proofUrl = `/uploads/payments/${fileName}`;
    }

    // Buat record pembayaran & update status bisnis ke PENDING_PAYMENT beserta nomor telepon
    const updateData = { subscriptionStatus: 'PENDING_PAYMENT' };
    if (phone) updateData.phone = phone;

    const [payment] = await prisma.$transaction([
      prisma.subscriptionPayment.create({
        data: {
          businessId,
          planId,
          amount: plan.price,
          proofOfPayment: proofUrl,
          paymentMethod,
          status: 'PENDING',
        },
      }),
      prisma.business.update({
        where: { id: businessId },
        data: updateData,
      }),
    ]);

    // Kirim notifikasi WA ke SuperAdmin (SUPERADMIN_PHONE di .env)
    const superAdminPhone = process.env.SUPERADMIN_PHONE;
    const ownerUser = await prisma.user.findFirst({ where: { businessId, role: 'OWNER' } });
    const businessInfo = await prisma.business.findUnique({ where: { id: businessId } });

    if (superAdminPhone) {
      const { sendMessage } = require('../services/whatsappService');
      const adminMsg = `🚨 *[WashPro Admin] Pembayaran Baru Menunggu Konfirmasi*\n${'━'.repeat(28)}\n🏪 Toko    : *${businessInfo?.name}*\n👤 Pemilik : ${ownerUser?.name || '-'}\n📦 Paket   : ${plan.name}\n💰 Nominal : Rp ${plan.price.toLocaleString('id-ID')}\n\nSegera buka Dashboard Superadmin untuk memverifikasi bukti pembayaran.\n_Notifikasi otomatis dari Sistem WashPro_`;
      
      // Kirim via WA bisnis (bot) ke nomor pribadi superadmin
      // Kita gunakan businessId dari bisnis demo sebagai pengirim (yang punya sesi WA terhubung)
      sendMessage({ businessId, phone: superAdminPhone, message: adminMsg })
        .catch(() => {/* WA notification gagal tidak block response */});
    }

    res.status(201).json({
      message: 'Bukti pembayaran berhasil dikirim. Mohon tunggu konfirmasi dari Admin (biasanya dalam 1x24 jam).',
      payment: { id: payment.id, status: payment.status, amount: payment.amount },
    });
  } catch (err) {
    console.error('[submitPayment] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ==================== CEK RIWAYAT PEMBAYARAN ====================
const getMyPayments = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const payments = await prisma.subscriptionPayment.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      include: { plan: { select: { name: true, durationDays: true } } },
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getStatus, getPlans, submitPayment, getMyPayments };
