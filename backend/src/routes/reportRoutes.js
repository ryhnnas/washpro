const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getReportCharts } = require('../controllers/transactionController');

router.get('/charts', authMiddleware, authMiddleware.authorizeRole('OWNER'), getReportCharts);

module.exports = router;
