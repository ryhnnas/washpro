const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const { requireOwner } = require('../middleware/staffPermission');
const validate = require('../middleware/validator');
const { updateSettingSchema } = require('../schemas/settingSchema');
const { getSettings, getPublicSettings, updateSettings } = require('../controllers/settingController');

router.get('/public', protectedRoute, getPublicSettings);
router.get('/', protectedRoute, requireOwner(), getSettings);
router.put('/', protectedRoute, requireOwner(), validate(updateSettingSchema), updateSettings);

module.exports = router;
