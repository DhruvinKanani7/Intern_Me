import express from 'express';
import { sendContactMessage } from '../controllers/contactController.js';
import { contactSchema } from '../validators/contactValidators.js';
import validate from '../middleware/validate.js';

const router = express.Router();

router.post('/', validate(contactSchema), sendContactMessage);

export default router;
