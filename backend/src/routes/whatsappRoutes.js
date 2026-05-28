const express = require('express');
const router = express.Router();
const protected = require('../middleware/protected');
const {
  getStatus,
  connectQR,
  connectPairing,
  disconnect,
  sendTestMessage
} = require('../controllers/whatsappController');

router.get('/status', protected, getStatus);
router.post('/connect/qr', protected, connectQR);
router.post('/connect/pairing', protected, connectPairing);
router.post('/disconnect', protected, disconnect);
router.post('/test-message', protected, sendTestMessage);

module.exports = router;
