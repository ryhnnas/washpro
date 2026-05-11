const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validator');
const { createTransactionSchema, updateStatusSchema } = require('../schemas/transactionSchema');
const { 
  getTransactions, 
  getOverdueTransactions, 
  createTransaction, 
  updateStatus, 
  resendReceipt, 
  getExportData 
} = require('../controllers/transactionController');

router.get('/', authMiddleware, getTransactions);
router.get('/export', authMiddleware, getExportData);
router.get('/overdue', authMiddleware, getOverdueTransactions);
router.post('/', authMiddleware, validate(createTransactionSchema), createTransaction);
router.patch('/:id/status', authMiddleware, validate(updateStatusSchema), updateStatus);
router.post('/:id/resend-wa', authMiddleware, resendReceipt);

module.exports = router;
