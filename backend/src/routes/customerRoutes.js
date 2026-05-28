const express = require('express');
const router = express.Router();
const protected = require('../middleware/protected');
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

router.get('/', protected, getCustomers);
router.post('/', protected, validate(customerSchema), createCustomer);
router.post('/with-membership', protected, validate(createWithMembershipSchema), createCustomerWithMembership);
router.put('/:id', protected, validate(customerSchema), updateCustomer);
router.post('/:id/membership/activate', protected, validate(activateMembershipSchema), activateMembership);
router.get('/memberships/:id/usage', protected, getMembershipUsage);
router.delete('/:id', protected, deleteCustomer);

module.exports = router;
