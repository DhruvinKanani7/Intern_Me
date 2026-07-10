import express from 'express';
import auth from '../middleware/auth.js';
import { getMyPayments } from '../controllers/paymentController.js';

const router = express.Router();

router.get('/my', auth, getMyPayments);

export default router;
