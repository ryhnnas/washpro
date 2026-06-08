const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const validate = require('../middleware/validator');
const { requireStaffPermission, requireOwner, requireAnyStaff } = require('../middleware/staffPermission');
const { createTransactionSchema, updateStatusSchema } = require('../schemas/transactionSchema');
const {
  getTransactions,
  getOverdueTransactions,
  createTransaction,
  updateStatus,
  resendReceipt,
  getExportData,
} = require('../controllers/transactionController');

router.get('/', protectedRoute, requireAnyStaff(), getTransactions);
router.get('/export', protectedRoute, requireStaffPermission('REPORTS', { write: false }), getExportData);
router.get('/overdue', protectedRoute, requireAnyStaff(), getOverdueTransactions);
router.post('/', protectedRoute, requireAnyStaff(), validate(createTransactionSchema), createTransaction);
router.patch('/:id/status', protectedRoute, requireAnyStaff(), validate(updateStatusSchema), updateStatus);
router.post('/:id/resend-wa', protectedRoute, requireAnyStaff(), resendReceipt);

module.exports = router;
