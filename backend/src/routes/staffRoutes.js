const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const { requireOwner } = require('../middleware/staffPermission');
const validate = require('../middleware/validator');
const { staffSchema, createStaffSchema } = require('../schemas/staffSchema');
const { getStaff, createStaff, deleteStaff, updateStaff } = require('../controllers/staffController');

router.use(protectedRoute);
router.use(requireOwner());

router.get('/', getStaff);
router.post('/', validate(createStaffSchema), createStaff);
router.put('/:id', validate(staffSchema), updateStaff);
router.delete('/:id', deleteStaff);

module.exports = router;
