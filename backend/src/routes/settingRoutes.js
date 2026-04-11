const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getSettings, updateSettings } = require('../controllers/settingController');

router.get('/', authMiddleware, getSettings);
router.put('/', authMiddleware, updateSettings);

module.exports = router;
