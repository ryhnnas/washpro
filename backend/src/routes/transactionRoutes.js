const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getTransactions, createTransaction, updateStatus } = require('../controllers/transactionController');

router.get('/', authMiddleware, getTransactions);
router.post('/', authMiddleware, createTransaction);
router.patch('/:id/status', authMiddleware, updateStatus);

module.exports = router;
