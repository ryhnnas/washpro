const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getDashboardStats, getRevenueTrend } = require('../controllers/dashboardController');

router.get('/stats', authMiddleware, authMiddleware.authorizeRole('OWNER'), getDashboardStats);
router.get('/revenue-trend', authMiddleware, authMiddleware.authorizeRole('OWNER'), getRevenueTrend);

module.exports = router;
