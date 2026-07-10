import mongoose from 'mongoose';

const { Schema } = mongoose;

const internshipCodeCounterSchema = new Schema({
  category_code: { type: String, required: true, unique: true },
  last_number: { type: Number, default: 0 }
});

const InternshipCodeCounter = mongoose.model('InternshipCodeCounter', internshipCodeCounterSchema);

export default InternshipCodeCounter;
