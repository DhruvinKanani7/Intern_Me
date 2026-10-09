import express from 'express';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';
import validate from '../middleware/validate.js';
import {
  createInternshipSchema,
  updateInternshipSchema,
  reviewTaskSchema
} from '../validators/adminValidators.js';
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
  revokeCertificate,
  extendDeadline,
  getAuditLogs,
  setupAdminMfa,
  enableAdminMfa,
  disableAdminMfa
} from '../controllers/adminController.js';

import { adminLimiter } from '../middleware/rateLimiter.js';
import requireAdminMfa from '../middleware/requireAdminMfa.js';

const router = express.Router();

router.use(adminLimiter, auth, admin);

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.get('/enrollments', getEnrollments);
router.post('/enrollments/:id/extend', extendDeadline);
router.get('/submissions/pending', getPendingSubmissions);
router.post('/submissions/:id/review', validate(reviewTaskSchema), reviewSubmission);
router.post('/internships', validate(createInternshipSchema), createInternship);
router.put('/internships/:id', validate(updateInternshipSchema), updateInternship);
router.get('/payments', getPayments);
router.get('/certificates', getCertificates);
// Task 6.3 / SEC-15: MFA step-up required for certificate revocation
router.post('/certificates/:id/revoke', requireAdminMfa, revokeCertificate);
router.get('/audit-logs', getAuditLogs);

// MFA Enrollment & Management
router.post('/mfa/setup', setupAdminMfa);
router.post('/mfa/enable', enableAdminMfa);
router.post('/mfa/disable', disableAdminMfa);

export default router;
