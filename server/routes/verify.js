import express from 'express';
import { verifyCertificate } from '../controllers/verifyController.js';

const router = express.Router();

router.get('/:internshipCode', verifyCertificate);

export default router;
