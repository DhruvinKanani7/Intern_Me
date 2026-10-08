import { z } from 'zod';

export const createOrderSchema = {
  body: z.object({
    categoryCode: z.string().trim().min(2).max(50),
    duration: z.coerce.number().refine((n) => [1, 3, 5].includes(n), {
      message: 'Duration must be 1, 3, or 5 months'
    })
  })
};

export const verifyPaymentSchema = {
  body: z.object({
    razorpay_order_id: z.string().trim().min(1, 'razorpay_order_id is required'),
    razorpay_payment_id: z.string().trim().min(1, 'razorpay_payment_id is required'),
    razorpay_signature: z.string().trim().min(1, 'razorpay_signature is required')
  })
};
