const express = require('express');
const router = express.Router();
const protected = require('../middleware/protected');
const { authorizeRole } = require('../middleware/auth');
const validate = require('../middleware/validator');
const { updateSettingSchema } = require('../schemas/settingSchema');
const { getSettings, updateSettings } = require('../controllers/settingController');

router.get('/', protected, authorizeRole('OWNER'), getSettings);
router.put('/', protected, authorizeRole('OWNER'), validate(updateSettingSchema), updateSettings);

module.exports = router;
