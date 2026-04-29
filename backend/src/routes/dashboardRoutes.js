const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getDashboardStats, getRevenueTrend } = require('../controllers/dashboardController');

router.get('/stats', authMiddleware, getDashboardStats);
router.get('/revenue-trend', authMiddleware, getRevenueTrend);

module.exports = router;
