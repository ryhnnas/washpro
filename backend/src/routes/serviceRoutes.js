const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');

router.get('/', authMiddleware, getServices);
router.post('/', authMiddleware, createService);
router.put('/:id', authMiddleware, updateService);
router.delete('/:id', authMiddleware, deleteService);

module.exports = router;
