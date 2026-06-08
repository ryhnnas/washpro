const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const { requireStaffPermission } = require('../middleware/staffPermission');
const { getDashboardStats, getRevenueTrend } = require('../controllers/dashboardController');

router.get('/stats', protectedRoute, requireStaffPermission('DASHBOARD', { write: false }), getDashboardStats);
router.get('/revenue-trend', protectedRoute, requireStaffPermission('DASHBOARD', { write: false }), getRevenueTrend);

module.exports = router;
