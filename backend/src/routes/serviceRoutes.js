const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validator');
const { serviceSchema } = require('../schemas/serviceSchema');
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');

router.get('/', authMiddleware, getServices);
router.post('/', authMiddleware, validate(serviceSchema), createService);
router.put('/:id', authMiddleware, validate(serviceSchema), updateService);
router.delete('/:id', authMiddleware, deleteService);

module.exports = router;
