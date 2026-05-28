const express = require('express');
const router = express.Router();
const protected = require('../middleware/protected');
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

router.get('/', protected, getTransactions);
router.get('/export', protected, authorizeRole('OWNER'), getExportData);
router.get('/overdue', protected, getOverdueTransactions);
router.post('/', protected, validate(createTransactionSchema), createTransaction);
router.patch('/:id/status', protected, validate(updateStatusSchema), updateStatus);
router.post('/:id/resend-wa', protected, resendReceipt);

module.exports = router;
