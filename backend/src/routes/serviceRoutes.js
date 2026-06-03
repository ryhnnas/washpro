const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const validate = require('../middleware/validator');
const { serviceSchema } = require('../schemas/serviceSchema');
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');

router.get('/', protectedRoute, getServices);
router.post('/', protectedRoute, validate(serviceSchema), createService);
router.put('/:id', protectedRoute, validate(serviceSchema), updateService);
router.delete('/:id', protectedRoute, deleteService);

module.exports = router;
