import Enrollment from '../models/Enrollment.js';
import Payment from '../models/Payment.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const getMyPayments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ user_id: req.user.id }).select('_id');
    const enrollmentIds = enrollments.map((enrollment) => enrollment._id);

    const payments = await Payment.find({ enrollment_id: { $in: enrollmentIds } })
      .populate({
        path: 'enrollment_id',
        populate: { path: 'internship_id', select: 'category_code category_name' }
      })
      .sort({ created_at: -1 });

    return res.json(successResponse({ data: payments }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};
