const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validator');
const { updateSettingSchema } = require('../schemas/settingSchema');
const { getSettings, updateSettings } = require('../controllers/settingController');

router.get('/', authMiddleware, getSettings);
router.put('/', authMiddleware, validate(updateSettingSchema), updateSettings);

module.exports = router;
