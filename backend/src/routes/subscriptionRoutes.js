const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const userGuard = require('../middleware/userGuard');
const { handleUpload } = require('../middleware/upload');
const { getStatus, getPlans, submitPayment, getMyPayments, getQrisInfo } = require('../controllers/subscriptionController');

// Semua route di bawah butuh login sebagai tenant biasa
router.use(authMiddleware, userGuard);

// GET /api/subscriptions/status — status langganan + sisa hari + flag banner H-7
router.get('/status', getStatus);

// GET /api/subscriptions/plans — daftar paket aktif
router.get('/plans', getPlans);

// GET /api/subscriptions/qris — QRIS payload dari env (tidak hardcode di frontend)
router.get('/qris', getQrisInfo);

// POST /api/subscriptions/pay — upload bukti bayar (multipart/form-data)
router.post('/pay', handleUpload, submitPayment);

// GET /api/subscriptions/payments — riwayat pembayaran tenant
router.get('/payments', getMyPayments);

module.exports = router;
