const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getCustomers, createCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController');

router.get('/', authMiddleware, getCustomers);
router.post('/', authMiddleware, createCustomer);
router.put('/:id', authMiddleware, updateCustomer);
router.delete('/:id', authMiddleware, deleteCustomer);

module.exports = router;
