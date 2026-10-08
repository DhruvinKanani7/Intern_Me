import mongoose from 'mongoose';

const { Schema } = mongoose;

const enrollmentSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  internship_id: { type: Schema.Types.ObjectId, ref: 'Internship', required: true, index: true },
  duration_months: { type: Number, required: true, enum: [1, 3, 5] },
  amount_paid: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired', 'closed'],
    default: 'active',
    index: true
  },
  internship_code: { type: String, required: true, unique: true, index: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  current_task: { type: Number, default: 1 },
  total_tasks: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Partial unique index preventing duplicate active/pending enrollments for the same user and internship (F7)
enrollmentSchema.index(
  { user_id: 1, internship_id: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['active', 'pending'] } }
  }
);

enrollmentSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

export default Enrollment;
