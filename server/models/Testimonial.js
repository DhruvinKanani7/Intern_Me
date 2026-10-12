import mongoose from 'mongoose';

const { Schema } = mongoose;

const testimonialSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  role: { type: String, required: true, trim: true, maxlength: 120 },
  company: { type: String, trim: true, maxlength: 100 },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  avatar: { type: String, trim: true },
  program: { type: String, trim: true, maxlength: 100 },
  is_approved: { type: Boolean, default: false, index: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

testimonialSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

const Testimonial = mongoose.model('Testimonial', testimonialSchema);

export default Testimonial;
