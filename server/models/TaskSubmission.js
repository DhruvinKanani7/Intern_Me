import mongoose from 'mongoose';

const { Schema } = mongoose;

const taskSubmissionSchema = new Schema({
  enrollment_id: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  task_number: { type: Number, required: true, min: 1 },
  linkedin_url: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewed_by: { type: Schema.Types.ObjectId, ref: 'User' },
  review_notes: String,
  submitted_at: { type: Date, default: Date.now },
  reviewed_at: Date
});

taskSubmissionSchema.index({ enrollment_id: 1, task_number: 1 }, { unique: true });

const TaskSubmission = mongoose.model('TaskSubmission', taskSubmissionSchema);

export default TaskSubmission;
