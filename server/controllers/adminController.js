import mongoose from 'mongoose';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import TaskSubmission from '../models/TaskSubmission.js';
import Internship from '../models/Internship.js';
import Payment from '../models/Payment.js';
import Certificate from '../models/Certificate.js';
import Outbox from '../models/Outbox.js';
import AuditLog from '../models/AuditLog.js';
import certificateGenerator from '../services/certificateGenerator.js';
import { sendTaskApproved, sendTaskRejected } from '../services/email.js';
import { logAuditEvent } from '../services/auditLogger.js';
import {
  generateMfaSetup,
  verifyMfaToken,
  generateBackupCodes
} from '../services/mfaService.js';
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
  const session = await mongoose.startSession();
  session.startTransaction();

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
      await session.abortTransaction();
      return res.status(400).json(errorResponse('action must be "approve" or "reject"'));
    }

    // Atomic update: only transition if status is currently 'pending' (Task 4.1 / F8)
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const submission = await TaskSubmission.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      {
        $set: {
          status: newStatus,
          reviewed_by: req.user.id,
          reviewed_at: new Date(),
          review_notes: notes
        }
      },
      { session, new: true }
    );

    if (!submission) {
      await session.abortTransaction();
      const existing = await TaskSubmission.findById(req.params.id);
      if (!existing) return res.status(404).json(errorResponse('Submission not found'));
      return res.status(409).json(errorResponse('Submission has already been reviewed'));
    }

    const enrollment = await Enrollment.findById(submission.enrollment_id).session(session);
    if (!enrollment) {
      await session.abortTransaction();
      return res.status(404).json(errorResponse('Enrollment not found'));
    }

    // SEC-12: Concurrency & Stale Check
    // Verify that submission task_number matches enrollment's current_task
    if (submission.task_number !== enrollment.current_task) {
      await session.abortTransaction();
      return res.status(409).json(
        errorResponse('Stale review attempt: submission task number does not match enrollment current task')
      );
    }

    const user = await User.findById(enrollment.user_id).session(session);
    const isLastTask = submission.task_number === enrollment.total_tasks;

    if (action === 'approve') {
      if (isLastTask) {
        enrollment.transitionTo('completed');
        await enrollment.save({ session });

        // Task 4.4 / SEC-13: Write Outbox certificate generation event atomically in the transaction
        await Outbox.create(
          [
            {
              event_type: 'generate_certificate',
              payload: {
                enrollment_id: enrollment._id,
                user_id: enrollment.user_id
              },
              idempotency_key: `cert-outbox-${enrollment._id}`
            }
          ],
          { session }
        );
      } else {
        // Advance current_task exactly once
        enrollment.current_task = submission.task_number + 1;

        // Task 4.3: Set due_at deadline for the newly current task
        const internship = await Internship.findById(enrollment.internship_id).session(session);
        const durationKey = `${enrollment.duration_months}m`;
        const nextTaskDef = internship?.syllabus?.[durationKey]?.find(
          (t) => t.task_number === enrollment.current_task
        );
        const deadlineDays = nextTaskDef?.deadline_days || 7;
        enrollment.current_task_due_at = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000);
        await enrollment.save({ session });
      }
    } else {
      // Rejection keeps current_task unchanged
      await enrollment.save({ session });
    }

    // Task 4.5: Append-only audit log
    await logAuditEvent({
      actorId: req.user.id,
      action: `task_review_${action}`,
      targetType: 'TaskSubmission',
      targetId: submission._id,
      beforeState: { status: 'pending', task_number: submission.task_number },
      afterState: { status: submission.status, current_task: enrollment.current_task },
      reason: notes,
      req,
      session
    });

    await session.commitTransaction();

    // Send notifications outside the transaction asynchronously
    if (user?.college_email) {
      if (action === 'approve') {
        void sendTaskApproved(user.college_email, {
          name: user.full_name,
          taskNumber: submission.task_number,
          nextTask: isLastTask ? null : submission.task_number + 1,
          isLastTask
        });
      } else {
        void sendTaskRejected(user.college_email, {
          name: user.full_name,
          taskNumber: submission.task_number,
          reason: notes
        });
      }
    }

    return res.json(successResponse({ data: submission }));
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

export const createInternship = async (req, res, next) => {
  try {
    const safeData = filterAllowedFields(req.body);
    const internship = await Internship.create(safeData);

    await logAuditEvent({
      actorId: req.user.id,
      action: 'internship_created',
      targetType: 'Internship',
      targetId: internship._id,
      afterState: safeData,
      req
    });

    return res.status(201).json(successResponse({ data: internship }));
  } catch (err) {
    next(err);
  }
};

export const updateInternship = async (req, res, next) => {
  try {
    const safeData = filterAllowedFields(req.body);
    const existing = await Internship.findById(req.params.id);
    if (!existing) return res.status(404).json(errorResponse('Internship not found'));

    const internship = await Internship.findByIdAndUpdate(req.params.id, safeData, {
      new: true,
      runValidators: true
    });

    await logAuditEvent({
      actorId: req.user.id,
      action: 'internship_updated',
      targetType: 'Internship',
      targetId: internship._id,
      beforeState: { category_code: existing.category_code, category_name: existing.category_name },
      afterState: safeData,
      req
    });

    return res.json(successResponse({ data: internship }));
  } catch (err) {
    next(err);
  }
};

export const extendDeadline = async (req, res, next) => {
  try {
    const { additional_days, new_due_date, new_end_date, reason } = req.body;
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json(errorResponse('Enrollment not found'));

    const beforeState = {
      current_task_due_at: enrollment.current_task_due_at,
      end_date: enrollment.end_date
    };

    if (additional_days) {
      const days = parseInt(additional_days, 10);
      const baseTime = enrollment.current_task_due_at
        ? enrollment.current_task_due_at.getTime()
        : Date.now();
      enrollment.current_task_due_at = new Date(baseTime + days * 24 * 60 * 60 * 1000);
    } else if (new_due_date) {
      enrollment.current_task_due_at = new Date(new_due_date);
    }

    if (new_end_date) {
      enrollment.end_date = new Date(new_end_date);
    }

    await enrollment.save();

    await logAuditEvent({
      actorId: req.user.id,
      action: 'deadline_extended',
      targetType: 'Enrollment',
      targetId: enrollment._id,
      beforeState,
      afterState: {
        current_task_due_at: enrollment.current_task_due_at,
        end_date: enrollment.end_date
      },
      reason,
      req
    });

    return res.json(successResponse({ data: enrollment }, 'Deadline extended successfully'));
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, 20, 100);
    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.target_type) filter.target_type = req.query.target_type;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actor_id', 'full_name college_email role')
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1, _id: -1 }),
      AuditLog.countDocuments(filter)
    ]);

    return res.json(
      successResponse({
        data: { logs, total, page, pages: Math.ceil(total / limit) }
      })
    );
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

    await logAuditEvent({
      actorId: req.user.id,
      action: 'certificate_revoked',
      targetType: 'Certificate',
      targetId: certificate._id,
      reason: req.body?.reason,
      req
    });

    return res.json(successResponse({}, 'Certificate revoked successfully'));
  } catch (err) {
    next(err);
  }
};

export const setupAdminMfa = async (req, res, next) => {
  try {
    const adminUser = await User.findById(req.user.id);
    if (!adminUser) return res.status(404).json(errorResponse('Admin not found'));

    const { secret, otpauthUrl, qrCodeDataUrl } = await generateMfaSetup(adminUser);
    adminUser.mfa_secret = secret;
    await adminUser.save();

    return res.json(
      successResponse({
        data: {
          secret,
          otpauthUrl,
          qrCodeDataUrl
        }
      }, 'MFA setup initialized')
    );
  } catch (err) {
    next(err);
  }
};

export const enableAdminMfa = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json(errorResponse('Verification code required'));

    const adminUser = await User.findById(req.user.id);
    if (!adminUser || !adminUser.mfa_secret) {
      return res.status(400).json(errorResponse('MFA setup not initialized'));
    }

    const isValid = verifyMfaToken(adminUser.mfa_secret, code);
    if (!isValid) {
      return res.status(400).json(errorResponse('Invalid MFA verification code'));
    }

    const { rawCodes, hashedCodes } = generateBackupCodes(8);
    adminUser.mfa_enabled = true;
    adminUser.mfa_backup_codes = hashedCodes;
    await adminUser.save();

    await logAuditEvent({
      actorId: adminUser._id,
      action: 'admin_mfa_enabled',
      targetType: 'User',
      targetId: adminUser._id,
      req
    });

    return res.json(
      successResponse({
        data: {
          backupCodes: rawCodes
        }
      }, 'MFA enabled successfully')
    );
  } catch (err) {
    next(err);
  }
};

export const disableAdminMfa = async (req, res, next) => {
  try {
    const { code, password } = req.body;
    const adminUser = await User.findById(req.user.id);
    if (!adminUser) return res.status(404).json(errorResponse('Admin not found'));

    let isAuthorized = false;
    if (code && adminUser.mfa_secret) {
      isAuthorized = verifyMfaToken(adminUser.mfa_secret, code);
    }
    if (!isAuthorized && password) {
      isAuthorized = await adminUser.comparePassword(password);
    }

    if (!isAuthorized) {
      return res.status(401).json(errorResponse('Valid MFA code or password required to disable MFA'));
    }

    adminUser.mfa_enabled = false;
    adminUser.mfa_secret = undefined;
    adminUser.mfa_backup_codes = [];
    await adminUser.save();

    await logAuditEvent({
      actorId: adminUser._id,
      action: 'admin_mfa_disabled',
      targetType: 'User',
      targetId: adminUser._id,
      req
    });

    return res.json(successResponse({}, 'MFA disabled successfully'));
  } catch (err) {
    next(err);
  }
};

