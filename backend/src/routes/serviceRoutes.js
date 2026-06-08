const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const validate = require('../middleware/validator');
const { requireStaffPermission, requireOwner, requireAnyStaff } = require('../middleware/staffPermission');
const { serviceSchema } = require('../schemas/serviceSchema');
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');

router.get('/', protectedRoute, requireAnyStaff(), getServices);
router.post('/', protectedRoute, requireStaffPermission('SERVICES', { write: true }), validate(serviceSchema), createService);
router.put('/:id', protectedRoute, requireStaffPermission('SERVICES', { write: true }), validate(serviceSchema), updateService);
router.delete('/:id', protectedRoute, requireStaffPermission('SERVICES', { write: true }), deleteService);

module.exports = router;
