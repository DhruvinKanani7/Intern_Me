import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';

const { Schema } = mongoose;

const VALID_TRANSITIONS = {
  created: ['paid', 'failed'],
  paid: ['refunded', 'partially_refunded'],
  partially_refunded: ['refunded'],
  failed: [],
  refunded: []
};

const paymentSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  internship_id: { type: Schema.Types.ObjectId, ref: 'Internship', required: true, index: true },
  enrollment_id: { type: Schema.Types.ObjectId, ref: 'Enrollment', index: true },
  razorpay_order_id: { type: String, required: true, unique: true, index: true },
  razorpay_payment_id: { type: String, unique: true, sparse: true, index: true },
  razorpay_signature: { type: String },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR', uppercase: true },
  status: {
    type: String,
    enum: ['created', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'created',
    index: true
  },
  refunded_amount: { type: Number, default: 0, min: 0 },
  processed_events: [{ type: String }],
  paid_at: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

paymentSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

// State machine transition validator
paymentSchema.methods.transitionTo = function (nextStatus) {
  const currentStatus = this.status;

  // Allow idempotent transition to the same status
  if (currentStatus === nextStatus) {
    return this;
  }

  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      `Illegal payment status transition from '${currentStatus}' to '${nextStatus}'`,
      400
    );
  }

  this.status = nextStatus;
  if (nextStatus === 'paid' && !this.paid_at) {
    this.paid_at = new Date();
  }
  return this;
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
