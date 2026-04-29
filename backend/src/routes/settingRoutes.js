const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getSettings, updateSettings, testWhatsapp, sendTestMessage } = require('../controllers/settingController');

router.get('/', authMiddleware, getSettings);
router.put('/', authMiddleware, updateSettings);
router.get('/whatsapp/test', authMiddleware, testWhatsapp);
router.post('/whatsapp/test-message', authMiddleware, sendTestMessage);

module.exports = router;
