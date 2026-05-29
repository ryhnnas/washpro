const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const {
  getStatus,
  connectQR,
  connectPairing,
  disconnect,
  sendTestMessage
} = require('../controllers/whatsappController');

router.get('/status', protectedRoute, getStatus);
router.post('/connect/qr', protectedRoute, connectQR);
router.post('/connect/pairing', protectedRoute, connectPairing);
router.post('/disconnect', protectedRoute, disconnect);
router.post('/test-message', protectedRoute, sendTestMessage);

module.exports = router;
