const express = require('express');
const router = express.Router();
const protected = require('../middleware/protected');
const validate = require('../middleware/validator');
const { serviceSchema } = require('../schemas/serviceSchema');
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');

router.get('/', protected, getServices);
router.post('/', protected, validate(serviceSchema), createService);
router.put('/:id', protected, validate(serviceSchema), updateService);
router.delete('/:id', protected, deleteService);

module.exports = router;
