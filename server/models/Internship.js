import mongoose from 'mongoose';

const { Schema } = mongoose;

const taskSchema = new Schema(
  {
    task_number: { type: Number, required: true },
    title: { type: String, required: true, maxlength: 150 },
    description: { type: String, required: true, maxlength: 5000 },
    instructions: { type: String, required: true, maxlength: 5000 },
    resources: [{ type: String, maxlength: 2048 }],
    deadline_days: { type: Number, required: true }
  },
  { _id: false }
);

const internshipSchema = new Schema({
  category_code: { type: String, required: true, unique: true, uppercase: true, maxlength: 50 },
  category_name: { type: String, required: true, maxlength: 150 },
  description: { type: String, required: true, maxlength: 5000 },
  icon: { type: String, default: '📘', maxlength: 10 },
  syllabus: {
    '1m': [taskSchema],
    '3m': [taskSchema],
    '5m': [taskSchema]
  },
  price_1m: { type: Number, required: true, min: 0 },
  price_3m: { type: Number, required: true, min: 0 },
  price_5m: { type: Number, required: true, min: 0 },
  total_tasks_1m: { type: Number, default: 4 },
  total_tasks_3m: { type: Number, default: 8 },
  total_tasks_5m: { type: Number, default: 14 },
  is_active: { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
});

const Internship = mongoose.model('Internship', internshipSchema);

export default Internship;
