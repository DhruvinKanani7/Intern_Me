import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import TaskSubmission from '../models/TaskSubmission.js';
import Internship from '../models/Internship.js';
import Payment from '../models/Payment.js';
import Certificate from '../models/Certificate.js';
import certificateGenerator from '../services/certificateGenerator.js';
import { sendTaskApproved, sendTaskRejected } from '../services/email.js';
import {
  escapeRegex,
  parsePagination,
  successResponse,
  errorResponse
} from '../utils/helpers.js';

// Explicit writable fields for internship create/update (Task 3.4 / F26)
const ALLOWED_INTERNSHIP_FIELDS = [
  'category_code',
  'category_name',
  'description',
  'icon',
  'price_1m',
  'price_3m',
  'price_5m',
  'total_tasks_1m',
  'total_tasks_3m',
  'total_tasks_5m',
  'is_active',
  'syllabus'
];

const filterAllowedFields = (input) => {
  const cleaned = {};
  for (const field of ALLOWED_INTERNSHIP_FIELDS) {
    if (input[field] !== undefined) {
      cleaned[field] = input[field];
    }
  }
  return cleaned;
};

export const getDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalInternships,
      activeEnrollments,
      completedEnrollments,
      pendingSubmissions,
      revenueAgg
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Internship.countDocuments({ is_active: true }),
      Enrollment.countDocuments({ status: 'active' }),
      Enrollment.countDocuments({ status: 'completed' }),
      TaskSubmission.countDocuments({ status: 'pending' }),
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;

    return res.json(
      successResponse({
        data: {
          totalUsers,
          totalInternships,
          activeEnrollments,
          completedEnrollments,
          pendingSubmissions,
          totalRevenue
        }
      })
    );
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, 20, 100);
    const rawSearch = req.query.search?.trim();

    let filter = {};
    if (rawSearch) {
      const search = escapeRegex(rawSearch, 64);
      filter = {
        $or: [
          { full_name: { $regex: search, $options: 'i' } },
          { college_email: { $regex: search, $options: 'i' } },
          { enrollment_no: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1, _id: -1 }),
      User.countDocuments(filter)
    ]);

    return res.json(
      successResponse({
        data: { users, total, page, pages: Math.ceil(total / limit) }
      })
    );
  } catch (err) {
    next(err);
  }
};

export const getEnrollments = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, 20, 100);
    const filter = req.query.status ? { status: req.query.status } : {};

    const [enrollments, total] = await Promise.all([
      Enrollment.find(filter)
        .populate('user_id', 'full_name college_email')
        .populate('internship_id', 'category_code category_name')
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1, _id: -1 }),
      Enrollment.countDocuments(filter)
    ]);

    return res.json(
      successResponse({
        data: { enrollments, total, page, pages: Math.ceil(total / limit) }
      })
    );
  } catch (err) {
    next(err);
  }
};

export const getPendingSubmissions = async (req, res, next) => {
  try {
    const submissions = await TaskSubmission.find({ status: 'pending' })
      .populate({
        path: 'enrollment_id',
        populate: [
          { path: 'user_id', select: 'full_name college_email' },
          { path: 'internship_id', select: 'category_code category_name' }
        ]
      })
      .sort({ submitted_at: 1, _id: 1 });

    return res.json(successResponse({ data: submissions }));
  } catch (err) {
    next(err);
  }
};

export const reviewSubmission = async (req, res, next) => {
  try {
    const action =
      req.body.action ||
      (req.body.status === 'approved'
        ? 'approve'
        : req.body.status === 'rejected'
          ? 'reject'
          : null);
    const notes = req.body.notes || req.body.review_notes;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json(errorResponse('action must be "approve" or "reject"'));
    }

    const submission = await TaskSubmission.findById(req.params.id).populate('enrollment_id');
    if (!submission) return res.status(404).json(errorResponse('Submission not found'));

    const enrollment = await Enrollment.findById(
      submission.enrollment_id._id || submission.enrollment_id
    );
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

      if (user?.college_email) {
        await sendTaskApproved(user.college_email, {
          name: user.full_name,
          taskNumber: submission.task_number,
          nextTask: isLastTask ? null : submission.task_number + 1,
          isLastTask
        });
      }
    } else if (user?.college_email) {
      await sendTaskRejected(user.college_email, {
        name: user.full_name,
        taskNumber: submission.task_number,
        reason: notes
      });
    }

    return res.json(successResponse({ data: submission }));
  } catch (err) {
    next(err);
  }
};

export const createInternship = async (req, res, next) => {
  try {
    // Task 3.4 / F26: Pick only explicitly allowed fields, rejecting arbitrary or privileged injection
    const safeData = filterAllowedFields(req.body);
    const internship = await Internship.create(safeData);
    return res.status(201).json(successResponse({ data: internship }));
  } catch (err) {
    next(err);
  }
};

export const updateInternship = async (req, res, next) => {
  try {
    // Task 3.4 / F26: Pick only explicitly allowed fields
    const safeData = filterAllowedFields(req.body);
    const internship = await Internship.findByIdAndUpdate(req.params.id, safeData, {
      new: true,
      runValidators: true
    });
    if (!internship) return res.status(404).json(errorResponse('Internship not found'));
    return res.json(successResponse({ data: internship }));
  } catch (err) {
    next(err);
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, 20, 100);
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
        .sort({ created_at: -1, _id: -1 }),
      Payment.countDocuments(filter)
    ]);

    return res.json(
      successResponse({
        data: { payments, total, page, pages: Math.ceil(total / limit) }
      })
    );
  } catch (err) {
    next(err);
  }
};

export const getCertificates = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, 20, 100);

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
        .sort({ created_at: -1, _id: -1 }),
      Certificate.countDocuments({})
    ]);

    return res.json(
      successResponse({
        data: { certificates, total, page, pages: Math.ceil(total / limit) }
      })
    );
  } catch (err) {
    next(err);
  }
};

export const revokeCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) return res.status(404).json(errorResponse('Certificate not found'));

    certificate.is_revoked = true;
    await certificate.save();

    return res.json(successResponse({}, 'Certificate revoked successfully'));
  } catch (err) {
    next(err);
  }
};
