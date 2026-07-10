import mongoose from 'mongoose';

const { Schema } = mongoose;

const enrollmentSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  internship_id: { type: Schema.Types.ObjectId, ref: 'Internship', required: true },
  duration_months: { type: Number, required: true, enum: [1, 3, 5] },
  amount_paid: { type: Number, required: true },
  status: { type: String, enum: ['active', 'completed', 'expired'], default: 'active' },
  internship_code: { type: String, required: true, unique: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  current_task: { type: Number, default: 1 },
  total_tasks: { type: Number, required: true },
  created_at: { type: Date, default: Date.now }
});

enrollmentSchema.index({ user_id: 1, internship_id: 1 });
// enrollmentSchema.index({ internship_code: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

export default Enrollment;
