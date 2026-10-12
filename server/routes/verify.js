import express from 'express';
import { verifyCertificate } from '../controllers/verifyController.js';
import { verifyCertificateSchema } from '../validators/verifyValidators.js';
import validate from '../middleware/validate.js';
import { verifyLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/:code', verifyLimiter, validate(verifyCertificateSchema), verifyCertificate);

export default router;
