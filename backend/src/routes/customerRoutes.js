const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getCustomers,
  createCustomer,
  createCustomerWithMembership,
  updateCustomer,
  activateMembership,
  getMembershipUsage,
  deleteCustomer,
} = require('../controllers/customerController');

router.get('/', authMiddleware, getCustomers);
router.post('/', authMiddleware, createCustomer);
router.post('/with-membership', authMiddleware, createCustomerWithMembership);
router.put('/:id', authMiddleware, updateCustomer);
router.post('/:id/membership/activate', authMiddleware, activateMembership);
router.get('/memberships/:id/usage', authMiddleware, getMembershipUsage);
router.delete('/:id', authMiddleware, deleteCustomer);

module.exports = router;
