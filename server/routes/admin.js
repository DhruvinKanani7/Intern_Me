import express from 'express';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';
import {
  getDashboard,
  getUsers,
  getEnrollments,
  getPendingSubmissions,
  reviewSubmission,
  createInternship,
  updateInternship,
  getPayments,
  getCertificates,
  revokeCertificate
} from '../controllers/adminController.js';

const router = express.Router();

router.use(auth, admin);

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.get('/enrollments', getEnrollments);
router.get('/submissions/pending', getPendingSubmissions);
router.post('/submissions/:id/review', reviewSubmission);
router.post('/internships', createInternship);
router.put('/internships/:id', updateInternship);
router.get('/payments', getPayments);
router.get('/certificates', getCertificates);
router.post('/certificates/:id/revoke', revokeCertificate);

export default router;
