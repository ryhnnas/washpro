const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const userGuard = require('../middleware/userGuard');
const { requireOwner } = require('../middleware/staffPermission');
const { handleUpload } = require('../middleware/upload');
const { getStatus, getPlans, submitPayment, getMyPayments, getQrisInfo } = require('../controllers/subscriptionController');

router.use(authMiddleware, userGuard);
router.use(requireOwner());

router.get('/status', getStatus);
router.get('/plans', getPlans);
router.get('/qris', getQrisInfo);
router.post('/pay', handleUpload, submitPayment);
router.get('/payments', getMyPayments);

module.exports = router;
