const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const validate = require('../middleware/validator');
const { requireStaffPermission, requireOwner, requireAnyStaff } = require('../middleware/staffPermission');
const {
  createTransactionSchema,
  updateStatusSchema,
  cancelTransactionSchema,
  finalizePaymentSchema
} = require('../schemas/transactionSchema');
const {
  getTransactions,
  getOverdueTransactions,
  createTransaction,
  updateStatus,
  resendReceipt,
  getExportData,
  cancelTransaction,
  finalizePayment,
} = require('../controllers/transactionController');

router.get('/', protectedRoute, requireAnyStaff(), getTransactions);
router.get('/export', protectedRoute, requireStaffPermission('REPORTS', { write: false }), getExportData);
router.get('/overdue', protectedRoute, requireAnyStaff(), getOverdueTransactions);
router.post('/', protectedRoute, requireAnyStaff(), validate(createTransactionSchema), createTransaction);
router.patch('/:id/status', protectedRoute, requireAnyStaff(), validate(updateStatusSchema), updateStatus);
router.post('/:id/resend-wa', protectedRoute, requireAnyStaff(), resendReceipt);
router.patch('/:id/cancel', protectedRoute, requireAnyStaff(), validate(cancelTransactionSchema), cancelTransaction);
router.patch('/:id/finalize-payment', protectedRoute, requireAnyStaff(), validate(finalizePaymentSchema), finalizePayment);

module.exports = router;
