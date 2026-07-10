import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import {
  isValidCollegeEmail,
  isStrongPassword,
  generateRandomToken,
  successResponse,
  errorResponse
} from '../utils/helpers.js';
import { sendVerificationEmail, sendPasswordReset } from '../services/email.js';

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const setTokenCookie = (res, token) => {
// line ~19, setTokenCookie()
res.cookie('token', token, {
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'   // was: 'lax'
});
};

export const register = async (req, res) => {
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

    const emailToken = generateRandomToken(16);
    const user = await User.create({
      full_name,
      college_email,
      enrollment_no,
      password,
      course,
      college_name,
      year_of_study,
      email_verification_token: emailToken,
      email_token_expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    await sendVerificationEmail(user.college_email, emailToken);

    return res.status(201).json(successResponse({ data: user }, 'Registration successful. Please check your email to verify your account.'));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json(errorResponse('Token is required'));

    const user = await User.findOne({
      email_verification_token: token,
      email_token_expires: { $gt: new Date() }
    });
    if (!user) return res.status(400).json(errorResponse('Invalid or expired verification token'));

    user.email_verified = true;
    user.email_verification_token = undefined;
    user.email_token_expires = undefined;
    await user.save();

    return res.json(successResponse({}, 'Email verified successfully'));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const login = async (req, res) => {
  try {
    const { college_email, password } = req.body;
    if (!college_email || !password) {
      return res.status(400).json(errorResponse('Email and password are required'));
    }

    const user = await User.findOne({ college_email: college_email.toLowerCase().trim() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json(errorResponse('Invalid email or password'));
    }

    if (!user.email_verified) {
      return res.status(403).json(
        errorResponse('Please verify your email before logging in')
      );
    }

    const token = signToken(user);
    setTokenCookie(res, token);

    return res.json(successResponse({ data: user, token}, 'Login successful'));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const logout = async (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  return res.json(successResponse({}, 'Logged out successfully'));
};

export const forgotPassword = async (req, res) => {
  try {
    const { college_email } = req.body;
    const genericMessage = 'If an account with this email exists, a reset link has been sent.';

    const user = await User.findOne({ college_email: college_email?.toLowerCase().trim() });
    if (user) {
      const resetToken = generateRandomToken(16);
      user.reset_token = resetToken;
      user.reset_token_expires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      await sendPasswordReset(user.college_email, resetToken);
    }

    return res.json(successResponse({}, genericMessage));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!isStrongPassword(new_password)) {
      return res
        .status(400)
        .json(errorResponse('Password must be at least 8 characters and include uppercase, lowercase, and a number'));
    }

    const user = await User.findOne({
      reset_token: token,
      reset_token_expires: { $gt: new Date() }
    });
    if (!user) return res.status(400).json(errorResponse('Invalid or expired reset token'));

    user.password = new_password;
    user.reset_token = undefined;
    user.reset_token_expires = undefined;
    await user.save();

    return res.json(successResponse({}, 'Password reset successfully'));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json(errorResponse('User not found'));
    return res.json(successResponse({ data: user }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};
