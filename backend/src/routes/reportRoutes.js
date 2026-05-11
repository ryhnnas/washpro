const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getReportCharts } = require('../controllers/transactionController');

router.get('/charts', authMiddleware, getReportCharts);

module.exports = router;
