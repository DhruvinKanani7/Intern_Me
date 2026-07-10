import mongoose from 'mongoose';

const { Schema } = mongoose;

const certificateSchema = new Schema({
  enrollment_id: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true, unique: true },
  cert_id: { type: String, required: true, unique: true },
  internship_code: { type: String, required: true, unique: true },
  full_name: { type: String, required: true },
  internship_name: { type: String, required: true },
  duration: { type: String, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  qr_code_url: { type: String, required: true },
  pdf_url: { type: String, required: true },
  is_revoked: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

const Certificate = mongoose.model('Certificate', certificateSchema);

export default Certificate;
