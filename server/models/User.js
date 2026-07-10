import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const userSchema = new Schema({
  full_name: { type: String, required: true, trim: true },
  college_email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  enrollment_no: { type: String, required: true, unique: true, uppercase: true, trim: true },
  email_verified: { type: Boolean, default: false },
  course: { type: String, trim: true },
  college_name: { type: String, trim: true },
  year_of_study: { type: Number, min: 1, max: 6 },
  password: { type: String, required: true, minlength: 8 },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  email_verification_token: String,
  email_token_expires: Date,
  reset_token: String,
  reset_token_expires: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  this.updated_at = Date.now();
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare candidate password with hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.email_verification_token;
  delete obj.reset_token;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
