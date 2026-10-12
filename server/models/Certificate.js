import mongoose from 'mongoose';

import crypto from 'crypto';

const { Schema } = mongoose;

const certificateSchema = new Schema({
  enrollment_id: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true, unique: true },
  cert_id: { type: String, required: true, unique: true },
  verification_code: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => crypto.randomBytes(16).toString('base64url')
  },
  internship_code: { type: String, required: true, unique: true },
  full_name: { type: String, required: true },
  internship_name: { type: String, required: true },
  duration: { type: String, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  verification_url: { type: String },
  qr_code_url: { type: String },
  qr_data_url: { type: String },
  pdf_url: { type: String, required: true },
  cloudinary_public_id: { type: String },
  is_revoked: { type: Boolean, default: false },
  revoked_reason: { type: String },
  revoked_at: { type: Date },
  created_at: { type: Date, default: Date.now }
});

// Sync verification_url and legacy qr_code_url
certificateSchema.pre('validate', function (next) {
  if (!this.verification_url && this.qr_code_url) {
    this.verification_url = this.qr_code_url;
  }
  if (!this.qr_code_url && this.verification_url) {
    this.qr_code_url = this.verification_url;
  }
  next();
});

const Certificate = mongoose.model('Certificate', certificateSchema);

export default Certificate;
