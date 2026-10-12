import rateLimit from 'express-rate-limit';
import { createRateLimitStore } from '../config/redis.js';
import logger from '../config/logger.js';

const isTest = process.env.NODE_ENV === 'test';

// ── Policy: Login (5 attempts / 15m) ──────────────────────────────────────────
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('rl:login:'),
  message: { success: false, message: 'Too many login attempts. Please try again later.' }
});

// ── Policy: Registration (3 attempts / 15m) ───────────────────────────────────
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('rl:register:'),
  message: { success: false, message: 'Too many registration attempts. Please try again later.' }
});

// ── Policy: Password Reset (3 attempts / 15m) ─────────────────────────────────
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('rl:reset:'),
  message: { success: false, message: 'Too many password reset requests. Please try again later.' }
});

// ── Policy: Certificate Verification (30 attempts / 15m) ──────────────────────
export const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('rl:verify:'),
  message: { success: false, message: 'Too many verification attempts. Please try again later.' }
});

// ── Policy: Contact Inquiries (5 attempts / 15m) ──────────────────────────────
export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('rl:contact:'),
  message: { success: false, message: 'Too many contact messages. Please try again later.' }
});

// ── Policy: Admin Operations (100 attempts / 15m) ─────────────────────────────
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('rl:admin:'),
  message: { success: false, message: 'Admin rate limit exceeded. Please slow down.' }
});

// ── Policy: Payments (20 attempts / 15m) ──────────────────────────────────────
export const paymentsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('rl:payments:'),
  message: { success: false, message: 'Too many payment requests. Please try again later.' }
});

// ── Policy: General API ───────────────────────────────────────────────────────
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('rl:general:'),
  handler: (req, res) => {
    logger.warn({ ip: req.ip, url: req.originalUrl }, 'General API rate limit exceeded');
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down.'
    });
  }
});


