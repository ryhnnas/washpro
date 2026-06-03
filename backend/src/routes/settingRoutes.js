const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const { authorizeRole } = require('../middleware/auth');
const validate = require('../middleware/validator');
const { updateSettingSchema } = require('../schemas/settingSchema');
const { getSettings, getPublicSettings, updateSettings } = require('../controllers/settingController');

// Public settings — accessible by all authenticated roles (OWNER & STAFF)
router.get('/public', protectedRoute, getPublicSettings);

// Full settings — OWNER only
router.get('/', protectedRoute, authorizeRole('OWNER'), getSettings);
router.put('/', protectedRoute, authorizeRole('OWNER'), validate(updateSettingSchema), updateSettings);

module.exports = router;
