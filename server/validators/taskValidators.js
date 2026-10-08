import { z } from 'zod';
import { isValidLinkedInUrl } from '../utils/helpers.js';

export const submitTaskSchema = z.object({
  linkedin_url: z
    .string({ required_error: 'LinkedIn URL is required' })
    .max(2048, 'LinkedIn URL cannot exceed 2048 characters')
    .refine(isValidLinkedInUrl, {
      message: 'Must be a valid https:// LinkedIn profile or post URL'
    })
});
