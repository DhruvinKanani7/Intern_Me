import express from 'express';
import {
  register,
  verifyEmail,
  login,
  logout,
  refreshSession,
  forgotPassword,
  resetPassword,
  getMe,
  getCsrfToken,
  updateProfile
} from '../controllers/authController.js';
import auth from '../middleware/auth.js';
import { loginLimiter, registerLimiter, resetPasswordLimiter } from '../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../validators/authValidators.js';
import validate from '../middleware/validate.js';

const router = express.Router();

router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.post('/refresh', refreshSession);
router.get('/csrf', getCsrfToken);
router.post('/forgot-password', resetPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', resetPasswordLimiter, validate(resetPasswordSchema), resetPassword);
router.get('/me', auth, getMe);
router.put('/me', auth, updateProfile);
router.put('/profile', auth, updateProfile);

export default router;
