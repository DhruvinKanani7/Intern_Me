import express from 'express';
import {
  getPublicStats,
  getApprovedTestimonials,
  createTestimonial
} from '../controllers/statsController.js';

const router = express.Router();

router.get('/stats', getPublicStats);
router.get('/testimonials', getApprovedTestimonials);
router.post('/testimonials', createTestimonial);

export default router;
