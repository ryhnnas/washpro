const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validator');
const { customerSchema, activateMembershipSchema, createWithMembershipSchema } = require('../schemas/customerSchema');
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
router.post('/', authMiddleware, validate(customerSchema), createCustomer);
router.post('/with-membership', authMiddleware, validate(createWithMembershipSchema), createCustomerWithMembership);
router.put('/:id', authMiddleware, validate(customerSchema), updateCustomer);
router.post('/:id/membership/activate', authMiddleware, validate(activateMembershipSchema), activateMembership);
router.get('/memberships/:id/usage', authMiddleware, getMembershipUsage);
router.delete('/:id', authMiddleware, deleteCustomer);

module.exports = router;
