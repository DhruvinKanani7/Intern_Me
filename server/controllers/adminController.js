import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import TaskSubmission from '../models/TaskSubmission.js';
import Internship from '../models/Internship.js';
import Payment from '../models/Payment.js';
import Certificate from '../models/Certificate.js';
import certificateGenerator from '../services/certificateGenerator.js';
import { sendTaskApproved, sendTaskRejected } from '../services/email.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

const paginate = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, parseInt(query.limit, 10) || 20);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const getDashboard = async (req, res) => {
  try {
    const [totalUsers, totalInternships, activeEnrollments, completedEnrollments, pendingSubmissions, revenueAgg] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Internship.countDocuments({ is_active: true }),
      Enrollment.countDocuments({ status: 'active' }),
      Enrollment.countDocuments({ status: 'completed' }),
      TaskSubmission.countDocuments({ status: 'pending' }),
      Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;

    return res.json(
      successResponse({
        data: { totalUsers, totalInternships, activeEnrollments, completedEnrollments, pendingSubmissions, totalRevenue }
      })
    );
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const getUsers = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const search = req.query.search?.trim();

    const filter = search
      ? {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { college_email: { $regex: search, $options: 'i' } },
            { enrollment_no: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).sort({ created_at: -1 }),
      User.countDocuments(filter)
    ]);

    return res.json(successResponse({ data: { users, total, page, pages: Math.ceil(total / limit) } }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const getEnrollments = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = req.query.status ? { status: req.query.status } : {};

    const [enrollments, total] = await Promise.all([
      Enrollment.find(filter)
        .populate('user_id', 'full_name college_email')
        .populate('internship_id', 'category_code category_name')
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 }),
      Enrollment.countDocuments(filter)
    ]);

    return res.json(successResponse({ data: { enrollments, total, page, pages: Math.ceil(total / limit) } }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const getPendingSubmissions = async (req, res) => {
  try {
    const submissions = await TaskSubmission.find({ status: 'pending' })
      .populate({
        path: 'enrollment_id',
        populate: [
          { path: 'user_id', select: 'full_name college_email' },
          { path: 'internship_id', select: 'category_code category_name' }
        ]
      })
      .sort({ submitted_at: 1 });

    return res.json(successResponse({ data: submissions }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const reviewSubmission = async (req, res) => {
  try {
    const { action, notes } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json(errorResponse('action must be "approve" or "reject"'));
    }

    const submission = await TaskSubmission.findById(req.params.id).populate('enrollment_id');
    if (!submission) return res.status(404).json(errorResponse('Submission not found'));

    const enrollment = await Enrollment.findById(submission.enrollment_id._id || submission.enrollment_id);
    const user = await User.findById(enrollment.user_id);

    submission.status = action === 'approve' ? 'approved' : 'rejected';
    submission.reviewed_by = req.user.id;
    submission.reviewed_at = new Date();
    submission.review_notes = notes;
    await submission.save();

    if (action === 'approve') {
      const isLastTask = submission.task_number === enrollment.total_tasks;

      if (isLastTask) {
        enrollment.status = 'completed';
        await enrollment.save();
        await certificateGenerator.generate(enrollment._id);
      } else {
        enrollment.current_task = submission.task_number + 1;
        await enrollment.save();
      }

      await sendTaskApproved(user.college_email, {
        name: user.full_name,
        taskNumber: submission.task_number,
        nextTask: isLastTask ? null : submission.task_number + 1,
        isLastTask
      });
    } else {
      await sendTaskRejected(user.college_email, {
        name: user.full_name,
        taskNumber: submission.task_number,
        reason: notes
      });
    }

    return res.json(successResponse({ data: submission }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const createInternship = async (req, res) => {
  try {
    const internship = await Internship.create(req.body);
    return res.status(201).json(successResponse({ data: internship }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const updateInternship = async (req, res) => {
  try {
    const internship = await Internship.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!internship) return res.status(404).json(errorResponse('Internship not found'));
    return res.json(successResponse({ data: internship }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const getPayments = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = req.query.status ? { status: req.query.status } : {};

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate({
          path: 'enrollment_id',
          populate: [
            { path: 'user_id', select: 'full_name college_email' },
            { path: 'internship_id', select: 'category_code category_name' }
          ]
        })
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 }),
      Payment.countDocuments(filter)
    ]);

    // NO REFUND DATA — payments are returned as-is with no refund fields, ever.
    return res.json(successResponse({ data: { payments, total, page, pages: Math.ceil(total / limit) } }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const getCertificates = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);

    const [certificates, total] = await Promise.all([
      Certificate.find({})
        .populate({
          path: 'enrollment_id',
          populate: [
            { path: 'user_id', select: 'full_name college_email' },
            { path: 'internship_id', select: 'category_code category_name' }
          ]
        })
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 }),
      Certificate.countDocuments({})
    ]);

    return res.json(successResponse({ data: { certificates, total, page, pages: Math.ceil(total / limit) } }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const revokeCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) return res.status(404).json(errorResponse('Certificate not found'));

    certificate.is_revoked = true;
    await certificate.save();

    return res.json(successResponse({}, 'Certificate revoked successfully'));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};
