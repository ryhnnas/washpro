const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const { authorizeRole } = require('../middleware/auth');
const { getDashboardStats, getRevenueTrend } = require('../controllers/dashboardController');

router.get('/stats', protectedRoute, authorizeRole('OWNER'), getDashboardStats);
router.get('/revenue-trend', protectedRoute, authorizeRole('OWNER'), getRevenueTrend);

module.exports = router;
