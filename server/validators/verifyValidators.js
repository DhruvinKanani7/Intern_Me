import { z } from 'zod';

export const verifyCertificateSchema = {
  params: z.object({
    code: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9_\-]+$/, 'Invalid verification code format').optional(),
    internshipCode: z.string().trim().min(3).max(64).optional()
  }).refine((data) => Boolean(data.code || data.internshipCode), {
    message: 'Verification code is required'
  })
};

