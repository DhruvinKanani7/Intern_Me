import { z } from 'zod';

export const verifyCertificateSchema = {
  params: z.object({
    internshipCode: z.string().trim().min(3).max(64)
  })
};
