import InternshipCodeCounter from '../models/InternshipCodeCounter.js';
import Enrollment from '../models/Enrollment.js';

// Generates codes in the format: IC-[CATEGORY]-[4-DIGIT NUMBER]-[YEAR]-[4-CHAR RANDOM]
// Example: IC-DS-0305-2025-A7X3
const generateInternshipCode = async (categoryCode) => {
  const counter = await InternshipCodeCounter.findOneAndUpdate(
    { category_code: categoryCode },
    { $inc: { last_number: 1 } },
    { upsert: true, new: true }
  );

  const paddedNumber = String(counter.last_number).padStart(4, '0');
  const year = new Date().getFullYear();

  let attempts = 0;
  let code;
  let exists = true;

  while (exists && attempts < 3) {
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    code = `IC-${categoryCode}-${paddedNumber}-${year}-${randomPart}`;
    // eslint-disable-next-line no-await-in-loop
    exists = await Enrollment.exists({ internship_code: code });
    attempts += 1;
  }

  if (exists) {
    throw new Error('Failed to generate a unique internship code after 3 attempts');
  }

  return code;
};

export default generateInternshipCode;
