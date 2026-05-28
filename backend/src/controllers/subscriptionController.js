const prisma = require('../config/prisma');
const path = require('path');
const fs = require('fs');
const { sendMessage } = require('../services/whatsappService');

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
 * Endpoint ini menerima bukti pembayaran via multipart/form-data (multer).
 * File disimpan di backend/uploads/payments/
 * Untuk produksi, idealnya ganti dengan cloud storage (S3/Cloudinary).
 */
const submitPayment = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { planId, paymentMethod = 'QRIS_DANA', phone } = req.body;
    const file = req.file; // disediakan oleh multer (handleUpload middleware)

    if (!planId) return res.status(400).json({ message: 'planId wajib diisi' });
    if (!file) return res.status(400).json({ message: 'Bukti pembayaran wajib diunggah' });

    // Validasi plan ada dan aktif
    const plan = await prisma.subscriptionPlan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) return res.status(404).json({ message: 'Paket berlangganan tidak ditemukan' });

    // Cek apakah sudah ada pembayaran PENDING untuk bisnis ini
    const existingPending = await prisma.subscriptionPayment.findFirst({
      where: { businessId, status: 'PENDING' },
    });
    if (existingPending) {
      // Hapus file yang baru diupload karena tidak akan dipakai
      fs.unlink(file.path, () => {});
      return res.status(400).json({
        message: 'Anda sudah memiliki pembayaran yang sedang menunggu konfirmasi Admin. Mohon tunggu.',
      });
    }

    const proofUrl = `/uploads/payments/${file.filename}`;

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

    // Kirim notifikasi WA via GOWA (SuperAdmin device) — best-effort, tidak block response
    const superAdminPhone = process.env.SUPERADMIN_PHONE;
    const [ownerUser, businessInfo] = await Promise.all([
      prisma.user.findFirst({ where: { businessId, role: 'OWNER' } }),
      prisma.business.findUnique({ where: { id: businessId } }),
    ]);
    const ownerName = ownerUser?.name || businessInfo?.name || '-';

    // 1. Kirim notifikasi ke Tenant (konfirmasi bukti transfer diterima)
    if (phone) {
      const tenantMsg = `⏳ *WashPro - Pembayaran Diterima*\n${'━'.repeat(28)}\nHalo *${ownerName}*,\n\nTerima kasih! Bukti pembayaran untuk paket *${plan.name}* sebesar *Rp ${plan.price.toLocaleString('id-ID')}* telah kami terima.\n\nPembayaran Anda sedang dalam proses verifikasi oleh Tim Admin (maks. 1x24 jam). Anda akan menerima notifikasi WA setelah dikonfirmasi.\n\n_Tim WashPro_`;
      sendMessage({ businessId: 'SUPERADMIN', phone, message: tenantMsg }).catch(() => {});
    }

    // 2. Kirim notifikasi ke SuperAdmin (peringatan ada pembayaran masuk)
    if (superAdminPhone) {
      const adminMsg = `🚨 *[WashPro Admin] Pembayaran Baru Menunggu Konfirmasi*\n${'━'.repeat(28)}\n🏪 Toko    : *${businessInfo?.name}*\n👤 Pemilik : ${ownerName}\n📦 Paket   : ${plan.name}\n💰 Nominal : Rp ${plan.price.toLocaleString('id-ID')}\n\nSegera buka Dashboard Superadmin untuk memverifikasi bukti pembayaran.\n_Notifikasi otomatis dari Sistem WashPro_`;
      sendMessage({ businessId: 'SUPERADMIN', phone: superAdminPhone, message: adminMsg }).catch(() => {});
    }

    res.status(201).json({
      message: 'Bukti pembayaran berhasil dikirim. Mohon tunggu konfirmasi dari Admin (biasanya dalam 1x24 jam).',
      payment: { id: payment.id, status: payment.status, amount: payment.amount },
    });
  } catch (err) {
    console.error('[submitPayment] Error:', err.message);
    // Hapus file jika ada error setelah upload
    if (req.file) fs.unlink(req.file.path, () => {});
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

// ==================== QRIS INFO (payload dari env, tidak hardcode di frontend) ====================
const getQrisInfo = async (req, res) => {
  try {
    const payload = process.env.QRIS_STATIC_PAYLOAD;
    if (!payload) {
      return res.status(503).json({ message: 'QRIS belum dikonfigurasi. Hubungi administrator.' });
    }
    res.json({
      payload,
      merchantName: process.env.QRIS_MERCHANT_NAME || 'WashPro',
      merchantBank: process.env.QRIS_MERCHANT_BANK || 'QRIS',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getStatus, getPlans, submitPayment, getMyPayments, getQrisInfo };
