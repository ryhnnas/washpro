const express = require('express');
const router = express.Router();
const protected = require('../middleware/protected');
const { authorizeRole } = require('../middleware/auth');
const { getReportCharts } = require('../controllers/transactionController');

router.get('/charts', protected, authorizeRole('OWNER'), getReportCharts);

module.exports = router;
