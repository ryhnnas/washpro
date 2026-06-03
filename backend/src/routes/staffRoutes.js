const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const { authorizeRole } = require('../middleware/auth');
const validate = require('../middleware/validator');
const { staffSchema, createStaffSchema } = require('../schemas/staffSchema');
const { getStaff, createStaff, deleteStaff, updateStaff } = require('../controllers/staffController');

// Semua rute staff dilindungi dengan autentikasi + subscription aktif + hanya OWNER
router.use(protectedRoute);
router.use(authorizeRole('OWNER'));

router.get('/', getStaff);
router.post('/', validate(createStaffSchema), createStaff);
router.put('/:id', validate(staffSchema), updateStaff);
router.delete('/:id', deleteStaff);

module.exports = router;
