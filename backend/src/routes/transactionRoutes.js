const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
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

const { authorizeRole } = require('../middleware/auth');

router.get('/', protectedRoute, getTransactions);
router.get('/export', protectedRoute, authorizeRole('OWNER'), getExportData);
router.get('/overdue', protectedRoute, getOverdueTransactions);
router.post('/', protectedRoute, validate(createTransactionSchema), createTransaction);
router.patch('/:id/status', protectedRoute, validate(updateStatusSchema), updateStatus);
router.post('/:id/resend-wa', protectedRoute, resendReceipt);

module.exports = router;
