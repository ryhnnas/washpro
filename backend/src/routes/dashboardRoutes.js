const express = require('express');
const router = express.Router();
const protected = require('../middleware/protected');
const { authorizeRole } = require('../middleware/auth');
const { getDashboardStats, getRevenueTrend } = require('../controllers/dashboardController');

router.get('/stats', protected, authorizeRole('OWNER'), getDashboardStats);
router.get('/revenue-trend', protected, authorizeRole('OWNER'), getRevenueTrend);

module.exports = router;
