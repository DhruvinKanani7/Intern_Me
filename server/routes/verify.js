import express from 'express';
import { verifyCertificate } from '../controllers/verifyController.js';
import { verifyCertificateSchema } from '../validators/verifyValidators.js';
import validate from '../middleware/validate.js';

const router = express.Router();

router.get('/:internshipCode', validate(verifyCertificateSchema), verifyCertificate);

export default router;
