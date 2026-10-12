import { z } from 'zod';
import { LENGTH_LIMITS } from './constants.js';

const passwordSchema = z
  .string()
  .min(LENGTH_LIMITS.PASSWORD_MIN, `Password must be at least ${LENGTH_LIMITS.PASSWORD_MIN} characters`)
  .max(LENGTH_LIMITS.PASSWORD_MAX, `Password must be at most ${LENGTH_LIMITS.PASSWORD_MAX} characters`)
  .refine(
    (pwd) => /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\d/.test(pwd),
    'Password must include uppercase, lowercase, and a number'
  );

const collegeEmailSchema = z
  .string()
  .email('Invalid email address')
  .max(LENGTH_LIMITS.EMAIL)
  .refine(
    (email) => /^[^\s@]+@[^\s@]+\.(edu|ac\.in)$/i.test(email.trim()),
    'Email must be a valid college email ending in .edu or .ac.in'
  );

export const registerSchema = {
  body: z.object({
    full_name: z.string().trim().min(2).max(LENGTH_LIMITS.NAME),
    college_email: collegeEmailSchema,
    enrollment_no: z.string().trim().min(2).max(LENGTH_LIMITS.ENROLLMENT_NO),
    password: passwordSchema,
    course: z.string().trim().max(LENGTH_LIMITS.TEXT_SHORT).optional(),
    college_name: z.string().trim().max(LENGTH_LIMITS.TEXT_SHORT).optional(),
    year_of_study: z.union([z.string().trim().max(50), z.number()]).optional()
  })
};

export const loginSchema = {
  body: z.object({
    college_email: z.string().trim().email().max(LENGTH_LIMITS.EMAIL),
    password: z.string().min(1).max(LENGTH_LIMITS.PASSWORD_MAX)
  })
};

export const verifyEmailSchema = {
  body: z.object({
    token: z.string().trim().min(1).max(256)
  })
};

export const forgotPasswordSchema = {
  body: z.object({
    college_email: z.string().trim().email().max(LENGTH_LIMITS.EMAIL)
  })
};

export const resetPasswordSchema = {
  body: z.object({
    token: z.string().trim().min(1).max(256),
    new_password: passwordSchema
  })
};
