import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables before validation
dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(5000),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required'),
    PAYMENTS_MODE: z.enum(['live', 'mock']).default('mock'),
    RAZORPAY_KEY_ID: z.string().optional().default(''),
    RAZORPAY_KEY_SECRET: z.string().optional().default(''),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
    RESEND_API_KEY: z.string().optional().default(''),
    EMAIL_FROM: z.string().optional().default(''),
    CONTACT_TO_EMAIL: z.string().optional().default(''),
    CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
    CLOUDINARY_API_KEY: z.string().optional().default(''),
    CLOUDINARY_API_SECRET: z.string().optional().default(''),
    TRUST_PROXY: z.string().default('1')
  })
  .superRefine((data, ctx) => {
    const isProd = data.NODE_ENV === 'production';
    const isLivePayments = data.PAYMENTS_MODE === 'live' || isProd;

    // JWT secret length check (>= 32 characters in production)
    if (isProd && data.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be at least 32 characters in production'
      });
    }

    // FRONTEND_URL must be https in production
    if (isProd) {
      try {
        const url = new URL(data.FRONTEND_URL);
        if (url.protocol !== 'https:') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['FRONTEND_URL'],
            message: 'FRONTEND_URL must use https:// in production'
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FRONTEND_URL'],
          message: 'FRONTEND_URL must be a valid URL'
        });
      }
    }

    // Razorpay credentials check when live or production
    if (isLivePayments) {
      if (!data.RAZORPAY_KEY_ID || data.RAZORPAY_KEY_ID.includes('xxxxxxxx')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['RAZORPAY_KEY_ID'],
          message: 'Valid RAZORPAY_KEY_ID is required when payments are live or in production'
        });
      }
      if (!data.RAZORPAY_KEY_SECRET || data.RAZORPAY_KEY_SECRET.includes('xxxxxxxx')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['RAZORPAY_KEY_SECRET'],
          message: 'Valid RAZORPAY_KEY_SECRET is required when payments are live or in production'
        });
      }
      if (!data.RAZORPAY_WEBHOOK_SECRET || data.RAZORPAY_WEBHOOK_SECRET.includes('xxxxxxxx')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['RAZORPAY_WEBHOOK_SECRET'],
          message: 'Valid RAZORPAY_WEBHOOK_SECRET is required when payments are live or in production'
        });
      }
    }

    // Resend and Cloudinary keys required in production
    if (isProd) {
      if (!data.RESEND_API_KEY || data.RESEND_API_KEY.includes('xxxxxxxx')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['RESEND_API_KEY'],
          message: 'RESEND_API_KEY is required in production'
        });
      }
      if (!data.EMAIL_FROM) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['EMAIL_FROM'],
          message: 'EMAIL_FROM is required in production'
        });
      }
      if (!data.CONTACT_TO_EMAIL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CONTACT_TO_EMAIL'],
          message: 'CONTACT_TO_EMAIL is required in production'
        });
      }
      if (!data.CLOUDINARY_CLOUD_NAME || data.CLOUDINARY_CLOUD_NAME === 'your-cloud-name') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLOUDINARY_CLOUD_NAME'],
          message: 'CLOUDINARY_CLOUD_NAME is required in production'
        });
      }
      if (!data.CLOUDINARY_API_KEY || data.CLOUDINARY_API_KEY.includes('xxxxxxxx')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLOUDINARY_API_KEY'],
          message: 'CLOUDINARY_API_KEY is required in production'
        });
      }
      if (!data.CLOUDINARY_API_SECRET || data.CLOUDINARY_API_SECRET.includes('xxxxxxxx')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLOUDINARY_API_SECRET'],
          message: 'CLOUDINARY_API_SECRET is required in production'
        });
      }
    }
  });

export function validateEnv(customEnv = process.env) {
  const result = envSchema.safeParse(customEnv);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => ` - [${issue.path.join('.')}]: ${issue.message}`)
      .join('\n');
    console.error(`\n❌ Environment validation failed:\n${formatted}\n`);
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
export default env;
