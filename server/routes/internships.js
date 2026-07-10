import express from 'express';
import { listInternships, getInternshipByCode } from '../controllers/internshipController.js';

const router = express.Router();

router.get('/', listInternships);
router.get('/:code', getInternshipByCode);

export default router;
