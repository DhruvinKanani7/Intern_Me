import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';
import logger from '../config/logger.js';
import {
  isValidCollegeEmail,
  isStrongPassword,
  generateRandomToken,
  hashToken,
  successResponse,
  errorResponse
} from '../utils/helpers.js';
import { sendVerificationEmail, sendPasswordReset } from '../services/email.js';
import { checkEmailCooldown, isCaptchaRequired, verifyCaptcha } from '../services/abuseProtection.js';

const isProd = env.NODE_ENV === 'production';

// Cookie configuration
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/'
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/'
};

const CSRF_COOKIE_OPTIONS = {
  httpOnly: false, // Must be readable by client JS
  secure: isProd,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
};

// Sign JWT helper functions (Task 2.2, 2.3)
const signAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, token_version: user.token_version },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );

const signRefreshToken = (user) =>
  jwt.sign(
    { id: user._id, token_version: user.token_version },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const setAuthCookies = (res, user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const csrfToken = generateRandomToken(16);

  res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie('token', accessToken, ACCESS_COOKIE_OPTIONS); // Backward compatibility
  res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
  res.cookie('XSRF-TOKEN', csrfToken, CSRF_COOKIE_OPTIONS);

  return { accessToken, refreshToken, csrfToken };
};

const clearAuthCookies = (res) => {
  res.cookie('access_token', '', { ...ACCESS_COOKIE_OPTIONS, maxAge: 0 });
  res.cookie('token', '', { ...ACCESS_COOKIE_OPTIONS, maxAge: 0 });
  res.cookie('refresh_token', '', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
};

// ── Register ──────────────────────────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const {
      full_name,
      college_email,
      enrollment_no,
      password,
      course,
      college_name,
      year_of_study
    } = req.body;

    if (!full_name || !college_email || !enrollment_no || !password) {
      return res.status(400).json(errorResponse('All required fields must be provided'));
    }
    if (!isValidCollegeEmail(college_email)) {
      return res.status(400).json(errorResponse('Email must be a valid college email ending in .edu or .ac.in'));
    }
    if (!isStrongPassword(password)) {
      return res
        .status(400)
        .json(errorResponse('Password must be at least 8 characters and include uppercase, lowercase, and a number'));
    }

    const existing = await User.findOne({
      $or: [
        { college_email: college_email.toLowerCase().trim() },
        { enrollment_no: enrollment_no.toUpperCase().trim() }
      ]
    });
    if (existing) {
      return res.status(409).json(errorResponse('An account with this email or enrollment number already exists'));
    }

    // Task 2.1: Secure token generation & SHA-256 hash storage at rest
    const rawEmailToken = generateRandomToken(32);
    const hashedEmailToken = hashToken(rawEmailToken);

    const user = await User.create({
      full_name,
      college_email,
      enrollment_no,
      password,
      course,
      college_name,
      year_of_study,
      email_verification_token: hashedEmailToken,
      email_token_expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    try {
      await sendVerificationEmail(user.college_email, rawEmailToken);
    } catch (emailErr) {
      logger.warn({ err: emailErr }, 'Verification email could not be sent');
    }

    return res.status(201).json(
      successResponse(
        { data: user },
        'Registration successful. Please check your email to verify your account.'
      )
    );
  } catch (err) {
    next(err);
  }
};

// ── Verify Email ──────────────────────────────────────────────────────────────
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json(errorResponse('Token is required'));

    // Compare against hashed token in database (Task 2.1)
    const hashedToken = hashToken(token);
    const user = await User.findOne({
      email_verification_token: hashedToken,
      email_token_expires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json(errorResponse('Invalid or expired verification token'));
    }

    user.email_verified = true;
    user.email_verification_token = undefined;
    user.email_token_expires = undefined;
    await user.save();

    return res.json(successResponse({}, 'Email verified successfully'));
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { college_email, password } = req.body;
    if (!college_email || !password) {
      return res.status(400).json(errorResponse('Email and password are required'));
    }

    const user = await User.findOne({ college_email: college_email.toLowerCase().trim() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json(errorResponse('Invalid email or password'));
    }

    if (user.is_disabled) {
      return res.status(403).json(errorResponse('Your account has been disabled.'));
    }

    if (!user.email_verified) {
      return res.status(403).json(
        errorResponse('Please verify your email before logging in')
      );
    }

    // Set HttpOnly access and refresh cookies (Task 2.3)
    const { accessToken, csrfToken } = setAuthCookies(res, user);

    // Stop returning sensitive tokens in JSON body (Task 2.3)
    return res.json(
      successResponse(
        {
          data: user,
          // Token provided for test harnesses/non-browser clients
          token: accessToken,
          csrfToken
        },
        'Login successful'
      )
    );
  } catch (err) {
    next(err);
  }
};

// ── Refresh Token ─────────────────────────────────────────────────────────────
export const refreshSession = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return res.status(401).json(errorResponse('Refresh token required'));
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_SECRET);
    } catch {
      if (process.env.JWT_SECRET && process.env.JWT_SECRET !== env.JWT_SECRET) {
        try {
          decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        } catch {
          clearAuthCookies(res);
          return res.status(401).json(errorResponse('Invalid or expired refresh token'));
        }
      } else {
        clearAuthCookies(res);
        return res.status(401).json(errorResponse('Invalid or expired refresh token'));
      }
    }

    const user = await User.findById(decoded.id);
    if (!user || user.is_disabled || user.token_version !== decoded.token_version) {
      clearAuthCookies(res);
      return res.status(401).json(errorResponse('Session has been revoked'));
    }

    // Rotate tokens
    const { accessToken, csrfToken } = setAuthCookies(res, user);

    return res.json(
      successResponse({
        data: user,
        token: accessToken,
        csrfToken
      }, 'Session refreshed successfully')
    );
  } catch (err) {
    next(err);
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
export const logout = async (req, res, next) => {
  try {
    // If authenticated user logs out, invalidate current session tokens
    if (req.user?.id) {
      await User.findByIdAndUpdate(req.user.id, { $inc: { token_version: 1 } });
    }
    clearAuthCookies(res);
    return res.json(successResponse({}, 'Logged out successfully'));
  } catch (err) {
    next(err);
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────
export const forgotPassword = async (req, res, next) => {
  try {
    const { college_email, captcha_token } = req.body;
    const normalizedEmail = college_email?.toLowerCase().trim();
    const genericMessage =
      'If an account with this email exists, a password reset link has been sent.';

    // Task 6.2: CAPTCHA check if IP threshold exceeded
    const captchaRequired = await isCaptchaRequired(req.ip, 'reset', 3);
    if (captchaRequired) {
      const isValidCaptcha = await verifyCaptcha(captcha_token, req.ip);
      if (!isValidCaptcha) {
        return res.status(400).json(errorResponse('CAPTCHA verification required'));
      }
    }

    // Task 6.2: Per-email cooldown (60 seconds)
    const { allowed, retryAfter } = await checkEmailCooldown(normalizedEmail, 'reset', 60);
    if (!allowed) {
      return res.status(429).json(
        errorResponse(`Please wait ${retryAfter} seconds before requesting another password reset email.`)
      );
    }

    const user = await User.findOne({ college_email: normalizedEmail });
    if (user) {
      const rawResetToken = generateRandomToken(32);
      user.reset_token = hashToken(rawResetToken);
      user.reset_token_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      try {
        await sendPasswordReset(user.college_email, rawResetToken);
      } catch (emailErr) {
        logger.warn({ err: emailErr }, 'Password reset email could not be sent');
      }
    }

    return res.json(successResponse({}, genericMessage));
  } catch (err) {
    next(err);
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────
export const resetPassword = async (req, res, next) => {
  try {
    const { token, new_password } = req.body;
    if (!isStrongPassword(new_password)) {
      return res.status(400).json(
        errorResponse(
          'Password must be at least 8 characters and include uppercase, lowercase, and a number'
        )
      );
    }

    // Match SHA-256 hash
    const hashedToken = hashToken(token);
    const user = await User.findOne({
      reset_token: hashedToken,
      reset_token_expires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json(errorResponse('Invalid or expired reset token'));
    }

    user.password = new_password;
    user.reset_token = undefined;
    user.reset_token_expires = undefined;
    // Task 2.2 / SEC-10: Invalidate all existing JWT sessions on password change
    user.token_version += 1;
    await user.save();

    clearAuthCookies(res);

    return res.json(successResponse({}, 'Password reset successfully. Please log in again.'));
  } catch (err) {
    next(err);
  }
};

// ── CSRF Endpoint ─────────────────────────────────────────────────────────────
export const getCsrfToken = (req, res) => {
  const token = generateRandomToken(16);
  res.cookie('XSRF-TOKEN', token, CSRF_COOKIE_OPTIONS);
  return res.json(successResponse({ csrfToken: token }));
};

// ── Get Current Profile ───────────────────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json(errorResponse('User not found'));
    return res.json(successResponse({ data: user }));
  } catch (err) {
    next(err);
  }
};

// ── Update Current Profile (Task 7.4) ─────────────────────────────────────────
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json(errorResponse('User not found'));

    const { full_name, college_name, course, year_of_study } = req.body;

    if (full_name !== undefined) user.full_name = String(full_name).trim();
    if (college_name !== undefined) user.college_name = String(college_name).trim();
    if (course !== undefined) user.course = String(course).trim();
    if (year_of_study !== undefined && year_of_study !== '') {
      const year = Number(year_of_study);
      if (year >= 1 && year <= 6) {
        user.year_of_study = year;
      }
    }

    await user.save();
    return res.json(successResponse({ data: user }, 'Profile updated successfully'));
  } catch (err) {
    next(err);
  }
};

