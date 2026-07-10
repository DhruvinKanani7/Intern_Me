import express from 'express';
import auth from '../middleware/auth.js';
import { getAllTasks, getCurrentTask, submitTask, getProgress } from '../controllers/taskController.js';

const router = express.Router();

router.get('/:enrollmentId', auth, getAllTasks);
router.get('/:enrollmentId/current', auth, getCurrentTask);
router.post('/:enrollmentId/submit', auth, submitTask);
router.get('/:enrollmentId/progress', auth, getProgress);

export default router;
