import express from 'express';
import auth from '../middleware/auth.js';
import { getMyPayments, handlePaymentWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.get('/my', auth, getMyPayments);

// Signed Webhook endpoint (Raw body parsed and HMAC signature verified)
router.post('/webhook', handlePaymentWebhook);

export default router;
