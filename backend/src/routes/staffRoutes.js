const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getStaff, createStaff, deleteStaff } = require('../controllers/staffController');

// Semua rute staff dilindungi dengan otentikasi JWT
router.use(authMiddleware);

router.get('/', getStaff);
router.post('/', createStaff);
router.delete('/:id', deleteStaff);

module.exports = router;
