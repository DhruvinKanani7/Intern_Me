import { z } from 'zod';
import { LENGTH_LIMITS } from './constants.js';

export const contactSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(LENGTH_LIMITS.NAME),
    email: z.string().trim().email('Invalid email address').max(LENGTH_LIMITS.EMAIL),
    subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(LENGTH_LIMITS.TITLE),
    message: z.string().trim().min(10, 'Message must be at least 10 characters').max(LENGTH_LIMITS.DESCRIPTION)
  })
};
