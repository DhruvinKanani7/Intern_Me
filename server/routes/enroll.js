import express from 'express';
import auth from '../middleware/auth.js';
import {
  createOrderHandler,
  verifyPaymentHandler,
  getMyEnrollments,
  getEnrollmentById,
  devCompleteOrderHandler
} from '../controllers/enrollController.js';

const router = express.Router();

router.post('/create-order', auth, createOrderHandler);
router.post('/verify-payment', auth, verifyPaymentHandler);
router.get('/my', auth, getMyEnrollments);
router.get('/:id', auth, getEnrollmentById);
router.post('/dev-complete-order', auth, devCompleteOrderHandler);

export default router;