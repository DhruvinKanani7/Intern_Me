import { z } from 'zod';

const syllabusTaskSchema = z.object({
  task_number: z.coerce.number().int().min(1, 'Task number must be at least 1'),
  title: z.string().min(1, 'Task title is required').max(150, 'Task title too long'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description too long'),
  instructions: z.string().min(1, 'Instructions are required').max(5000, 'Instructions too long'),
  resources: z.array(z.string().max(2048, 'Resource URL too long')).default([]),
  deadline_days: z.coerce.number().int().min(1).max(365)
});

const syllabusSchema = z.object({
  '1m': z.array(syllabusTaskSchema).default([]),
  '3m': z.array(syllabusTaskSchema).default([]),
  '5m': z.array(syllabusTaskSchema).default([])
});

// Explicit writable fields for internship creation (F26)
export const createInternshipSchema = z
  .object({
    category_code: z.string().min(2).max(50),
    category_name: z.string().min(2).max(150),
    description: z.string().min(10).max(5000),
    icon: z.string().max(10).default('📘'),
    price_1m: z.coerce.number().min(0),
    price_3m: z.coerce.number().min(0),
    price_5m: z.coerce.number().min(0),
    total_tasks_1m: z.coerce.number().int().min(1).default(4),
    total_tasks_3m: z.coerce.number().int().min(1).default(8),
    total_tasks_5m: z.coerce.number().int().min(1).default(14),
    is_active: z.boolean().default(true),
    syllabus: syllabusSchema.optional()
  })
  .strict(); // Rejects forbidden/privileged fields like _id, created_at, role, etc.

// Explicit writable fields for internship updates (F26)
export const updateInternshipSchema = z
  .object({
    category_code: z.string().min(2).max(50).optional(),
    category_name: z.string().min(2).max(150).optional(),
    description: z.string().min(10).max(5000).optional(),
    icon: z.string().max(10).optional(),
    price_1m: z.coerce.number().min(0).optional(),
    price_3m: z.coerce.number().min(0).optional(),
    price_5m: z.coerce.number().min(0).optional(),
    total_tasks_1m: z.coerce.number().int().min(1).optional(),
    total_tasks_3m: z.coerce.number().int().min(1).optional(),
    total_tasks_5m: z.coerce.number().int().min(1).optional(),
    is_active: z.boolean().optional(),
    deleted_at: z.union([z.date(), z.string().datetime(), z.null()]).optional(),
    syllabus: syllabusSchema.optional()
  })
  .strict();

export const reviewTaskSchema = z
  .object({
    status: z.enum(['approved', 'rejected']).optional(),
    action: z.enum(['approve', 'reject']).optional(),
    notes: z.string().max(2000, 'Review notes cannot exceed 2000 characters').optional()
  })
  .refine((data) => Boolean(data.status || data.action), {
    message: 'Status must be approved or rejected'
  });

