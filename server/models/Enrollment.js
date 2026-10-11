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
  current_task_due_at: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Enrollment state machine transitions (Task 4.2 / F14 / Task 7.1)
const ALLOWED_TRANSITIONS = {
  active: ['completed', 'expired', 'closed'],
  expired: ['closed'],
  completed: [],
  closed: []
};

enrollmentSchema.methods.transitionTo = function (newStatus) {
  const allowed = ALLOWED_TRANSITIONS[this.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Illegal enrollment status transition from "${this.status}" to "${newStatus}"`
    );
  }
  this.status = newStatus;
  this.updated_at = new Date();
  return this;
};

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
