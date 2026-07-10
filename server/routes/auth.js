import express from 'express';
import {
  register,
  verifyEmail,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe
} from '../controllers/authController.js';
import auth from '../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', registerLimiter, register);
router.post('/verify-email', verifyEmail);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', auth, getMe);

export default router;
