const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const { authorizeRole } = require('../middleware/auth');
const { getReportCharts } = require('../controllers/transactionController');

router.get('/charts', protectedRoute, authorizeRole('OWNER'), getReportCharts);

module.exports = router;
