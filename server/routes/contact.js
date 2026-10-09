import express from 'express';
import { sendContactMessage } from '../controllers/contactController.js';
import { contactSchema } from '../validators/contactValidators.js';
import validate from '../middleware/validate.js';
import { contactLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/', contactLimiter, validate(contactSchema), sendContactMessage);

export default router;
