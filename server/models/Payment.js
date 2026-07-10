import mongoose from 'mongoose';

const { Schema } = mongoose;

// NOTE: No "refunded" status. No refund fields. No refund anywhere.
const paymentSchema = new Schema({
  enrollment_id: { type: Schema.Types.ObjectId, ref: 'Enrollment' },
  razorpay_order_id: { type: String, required: true, unique: true },
  razorpay_payment_id: String,
  razorpay_signature: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
  paid_at: Date,
  created_at: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
