const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validator');
const { staffSchema, createStaffSchema } = require('../schemas/staffSchema');
const { getStaff, createStaff, deleteStaff, updateStaff } = require('../controllers/staffController');

// Semua rute staff dilindungi dengan otentikasi JWT
router.use(authMiddleware);

router.get('/', getStaff);
router.post('/', validate(createStaffSchema), createStaff);
router.put('/:id', validate(staffSchema), updateStaff);
router.delete('/:id', deleteStaff);

module.exports = router;
