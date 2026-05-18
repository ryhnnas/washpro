const express = require('express');
const router = express.Router();
const requireSuperAdmin = require('../middleware/superAdminAuth');
const {
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
} = require('../controllers/superAdminController');

// === PUBLIC ===
// POST /api/superadmin/login
router.post('/login', login);

// === PROTECTED (SuperAdmin Only) ===
// GET /api/superadmin/stats
router.get('/stats', requireSuperAdmin, getDashboardStats);

// GET /api/superadmin/businesses?status=ACTIVE&search=...
router.get('/businesses', requireSuperAdmin, getBusinesses);
// POST /api/superadmin/businesses/:businessId/toggle — body: { action: 'SUSPEND'|'ACTIVATE' }
router.post('/businesses/:businessId/toggle', requireSuperAdmin, toggleBusiness);
// DELETE /api/superadmin/businesses/:businessId — hapus toko + seluruh data (cascade)
router.delete('/businesses/:businessId', requireSuperAdmin, deleteBusiness);

// GET /api/superadmin/payments?status=PENDING
router.get('/payments', requireSuperAdmin, getPayments);
// POST /api/superadmin/payments/:paymentId/approve
router.post('/payments/:paymentId/approve', requireSuperAdmin, approvePayment);
// POST /api/superadmin/payments/:paymentId/reject — body: { reason }
router.post('/payments/:paymentId/reject', requireSuperAdmin, rejectPayment);

// GET  /api/superadmin/plans
router.get('/plans', requireSuperAdmin, getPlans);
// POST /api/superadmin/plans — buat/update paket
router.post('/plans', requireSuperAdmin, upsertPlan);

module.exports = router;
