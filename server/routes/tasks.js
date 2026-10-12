import express from 'express';
import auth from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { submitTaskSchema } from '../validators/taskValidators.js';
import { getAllTasks, getCurrentTask, submitTask, getProgress } from '../controllers/taskController.js';

const router = express.Router();

router.get('/:enrollmentId', auth, getAllTasks);
router.get('/:enrollmentId/current', auth, getCurrentTask);
router.post('/:enrollmentId/submit', auth, validate(submitTaskSchema), submitTask);
router.get('/:enrollmentId/progress', auth, getProgress);

export default router;
