const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getTransactions, getOverdueTransactions, createTransaction, updateStatus, resendReceipt } = require('../controllers/transactionController');

router.get('/', authMiddleware, getTransactions);
router.get('/overdue', authMiddleware, getOverdueTransactions);
router.post('/', authMiddleware, createTransaction);
router.patch('/:id/status', authMiddleware, updateStatus);
router.post('/:id/resend-wa', authMiddleware, resendReceipt);

module.exports = router;
