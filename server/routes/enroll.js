import express from 'express';
import auth from '../middleware/auth.js';
import validate, { validateObjectIdParam } from '../middleware/validate.js';
import {
  createOrderSchema,
  verifyPaymentSchema
} from '../validators/enrollValidators.js';
import {
  createOrderHandler,
  verifyPaymentHandler,
  getMyEnrollments,
  getEnrollmentById
} from '../controllers/enrollController.js';

const router = express.Router();

router.post('/create-order', auth, validate(createOrderSchema), createOrderHandler);
router.post('/verify-payment', auth, validate(verifyPaymentSchema), verifyPaymentHandler);
router.get('/my', auth, getMyEnrollments);
router.get('/:id', auth, validateObjectIdParam('id'), getEnrollmentById);

// Task 1.2: dev-complete-order route permanently removed

export default router;