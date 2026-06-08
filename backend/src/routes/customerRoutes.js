const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const validate = require('../middleware/validator');
const { requireStaffPermission, requireOwner, requireAnyStaff } = require('../middleware/staffPermission');
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

router.get('/', protectedRoute, requireAnyStaff(), getCustomers);
router.post('/', protectedRoute, requireStaffPermission('CUSTOMERS', { write: true }), validate(customerSchema), createCustomer);
router.post('/with-membership', protectedRoute, requireStaffPermission('CUSTOMERS', { write: true }), validate(createWithMembershipSchema), createCustomerWithMembership);
router.put('/:id', protectedRoute, requireStaffPermission('CUSTOMERS', { write: true }), validate(customerSchema), updateCustomer);
router.post('/:id/membership/activate', protectedRoute, requireStaffPermission('CUSTOMERS', { write: true }), validate(activateMembershipSchema), activateMembership);
router.get('/memberships/:id/usage', protectedRoute, requireStaffPermission('CUSTOMERS', { write: false }), getMembershipUsage);
router.delete('/:id', protectedRoute, requireOwner(), deleteCustomer);

module.exports = router;
