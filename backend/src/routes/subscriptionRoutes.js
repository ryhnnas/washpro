const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getStatus, getPlans, submitPayment, getMyPayments } = require('../controllers/subscriptionController');

// Semua route di bawah butuh login sebagai tenant biasa
router.use(authMiddleware);

// GET /api/subscriptions/status — status langganan + sisa hari + flag banner H-7
router.get('/status', getStatus);

// GET /api/subscriptions/plans — daftar paket aktif
router.get('/plans', getPlans);

// POST /api/subscriptions/pay — upload bukti bayar
router.post('/pay', submitPayment);

// GET /api/subscriptions/payments — riwayat pembayaran tenant
router.get('/payments', getMyPayments);

module.exports = router;
