const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getStatus,
  connectQR,
  connectPairing,
  disconnect,
  sendTestMessage
} = require('../controllers/whatsappController');

router.get('/status', authMiddleware, getStatus);
router.post('/connect/qr', authMiddleware, connectQR);
router.post('/connect/pairing', authMiddleware, connectPairing);
router.post('/disconnect', authMiddleware, disconnect);
router.post('/test-message', authMiddleware, sendTestMessage);

module.exports = router;
