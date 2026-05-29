const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
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

router.get('/', protectedRoute, getCustomers);
router.post('/', protectedRoute, validate(customerSchema), createCustomer);
router.post('/with-membership', protectedRoute, validate(createWithMembershipSchema), createCustomerWithMembership);
router.put('/:id', protectedRoute, validate(customerSchema), updateCustomer);
router.post('/:id/membership/activate', protectedRoute, validate(activateMembershipSchema), activateMembership);
router.get('/memberships/:id/usage', protectedRoute, getMembershipUsage);
router.delete('/:id', protectedRoute, deleteCustomer);

module.exports = router;
