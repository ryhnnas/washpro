const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const { requireStaffPermission } = require('../middleware/staffPermission');
const { getReportCharts } = require('../controllers/transactionController');

router.get('/charts', protectedRoute, requireStaffPermission('REPORTS', { write: false }), getReportCharts);

module.exports = router;
