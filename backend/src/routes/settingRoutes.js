const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validator');
const { updateSettingSchema } = require('../schemas/settingSchema');
const { getSettings, updateSettings } = require('../controllers/settingController');

router.get('/', authMiddleware, authMiddleware.authorizeRole('OWNER'), getSettings);
router.put('/', authMiddleware, authMiddleware.authorizeRole('OWNER'), validate(updateSettingSchema), updateSettings);

module.exports = router;
