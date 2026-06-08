const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protected');
const { requireOwner } = require('../middleware/staffPermission');
const {
  getStatus,
  connectQR,
  connectPairing,
  disconnect,
  sendTestMessage,
} = require('../controllers/whatsappController');

router.use(protectedRoute);
router.use(requireOwner());

router.get('/status', getStatus);
router.post('/connect/qr', connectQR);
router.post('/connect/pairing', connectPairing);
router.post('/disconnect', disconnect);
router.post('/test-message', sendTestMessage);

module.exports = router;
