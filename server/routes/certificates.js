import express from 'express';
import auth from '../middleware/auth.js';
import {
  downloadCertificate,
  getCertificateByEnrollment,
  getMyCertificates
} from '../controllers/certificateController.js';

const router = express.Router();

router.get('/my', auth, getMyCertificates);
router.get('/:id/download', auth, downloadCertificate);
router.get('/:enrollmentId', auth, getCertificateByEnrollment);

export default router;
