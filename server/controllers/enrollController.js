import mongoose from 'mongoose';
import Internship from '../models/Internship.js';
import Enrollment from '../models/Enrollment.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import TaskSubmission from '../models/TaskSubmission.js';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { createOrder, fetchOrder, verifyPaymentSignature } from '../services/razorpay.js';
import generateInternshipCode from '../services/internshipCode.js';
import { sendEnrollmentConfirmation } from '../services/email.js';
import { successResponse, errorResponse, addDays } from '../utils/helpers.js';
import { AppError } from '../utils/AppError.js';

const priceFieldFor = (duration) => `price_${duration}m`;
const taskFieldFor = (duration) => `total_tasks_${duration}m`;

// ── Create Razorpay Order ──────────────────────────────────────────────────────
export const createOrderHandler = async (req, res, next) => {
  try {
    const { categoryCode, duration } = req.body;
    const durationMonths = Number(duration);

    const internship = await Internship.findOne({
      category_code: categoryCode.toUpperCase(),
      is_active: true
    });
    if (!internship) {
      return res.status(404).json(errorResponse('Internship not found'));
    }

    // Check if user already has an active enrollment
    const existingActive = await Enrollment.findOne({
      user_id: req.user.id,
      internship_id: internship._id,
      status: 'active'
    });
    if (existingActive) {
      return res.status(409).json(errorResponse('You already have an active enrollment for this internship'));
    }

    const price = internship[priceFieldFor(durationMonths)];
    if (!price || price <= 0) {
      return res.status(400).json(errorResponse('Invalid price configured for selected duration'));
    }

    // Create Razorpay Order (Task 1.1: Free enroll bypass branch deleted)
    const order = await createOrder({
      amount: price,
      receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      notes: {
        userId: String(req.user.id),
        internshipId: String(internship._id),
        categoryCode: internship.category_code,
        duration: String(durationMonths)
      }
    });

    // Create payment tracking record in 'created' state
    await Payment.create({
      user_id: req.user.id,
      internship_id: internship._id,
      razorpay_order_id: order.id,
      amount: price,
      currency: order.currency || 'INR',
      status: 'created'
    });

    return res.json(
      successResponse({
        data: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency || 'INR',
          key: env.RAZORPAY_KEY_ID || 'mock_key'
        }
      })
    );
  } catch (err) {
    next(err);
  }
};

// ── Verify Payment & Idempotent Enrollment ─────────────────────────────────────
export const verifyPaymentHandler = async (req, res, next) => {
  let session = null;
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Task 1.5: Owner-bound order lookup (SEC-03: prevents verifying another user's order)
    const payment = await Payment.findOne({
      razorpay_order_id,
      user_id: req.user.id
    });

    if (!payment) {
      return res.status(404).json(errorResponse('Payment order not found or does not belong to you'));
    }

    // Idempotency check: if payment is already paid and enrollment exists, return it immediately (SEC-04)
    if (payment.status === 'paid' && payment.enrollment_id) {
      const existingEnrollment = await Enrollment.findById(payment.enrollment_id);
      if (existingEnrollment) {
        return res.json(
          successResponse({
            enrollmentId: existingEnrollment._id,
            internship_code: existingEnrollment.internship_code
          }, 'Payment already verified')
        );
      }
    }

    // Verify HMAC signature
    const isValidSig = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!isValidSig) {
      payment.status = 'failed';
      await payment.save();
      return res.status(400).json(errorResponse('Payment signature verification failed'));
    }

    // Fetch order from provider and verify amount / currency (SEC-05)
    const orderDetails = await fetchOrder(razorpay_order_id);
    const expectedPaise = Math.round(payment.amount * 100);

    if (orderDetails.amount !== expectedPaise || orderDetails.currency !== payment.currency) {
      payment.status = 'failed';
      await payment.save();
      return res.status(400).json(errorResponse('Payment amount or currency mismatch'));
    }

    // Load internship details
    const internship = await Internship.findById(payment.internship_id);
    if (!internship) {
      return res.status(404).json(errorResponse('Associated internship not found'));
    }

    const durationMonths = Number(orderDetails.notes?.duration || 1);
    const totalTasks = internship[taskFieldFor(durationMonths)] || internship.total_tasks_1m;

    // Start MongoDB transaction for atomic payment status update + enrollment creation
    session = await mongoose.startSession();
    session.startTransaction();

    // In transaction, re-fetch payment and existing enrollment to prevent race conditions
    const sessionPayment = await Payment.findOne({
      razorpay_order_id,
      user_id: req.user.id
    }).session(session);

    if (sessionPayment.status === 'paid' && sessionPayment.enrollment_id) {
      await session.abortTransaction();
      const existingEnrollment = await Enrollment.findById(sessionPayment.enrollment_id);
      return res.json(
        successResponse({
          enrollmentId: existingEnrollment._id,
          internship_code: existingEnrollment.internship_code
        })
      );
    }

    // Replay check for existing active enrollment
    const existingActiveEnrollment = await Enrollment.findOne({
      user_id: req.user.id,
      internship_id: internship._id,
      status: 'active'
    }).session(session);

    if (existingActiveEnrollment) {
      sessionPayment.transitionTo('paid');
      sessionPayment.razorpay_payment_id = razorpay_payment_id;
      sessionPayment.razorpay_signature = razorpay_signature;
      sessionPayment.enrollment_id = existingActiveEnrollment._id;
      await sessionPayment.save({ session });
      await session.commitTransaction();

      return res.json(
        successResponse({
          enrollmentId: existingActiveEnrollment._id,
          internship_code: existingActiveEnrollment.internship_code
        })
      );
    }

    // Generate unique internship code and create enrollment
    const internshipCode = await generateInternshipCode(internship.category_code);
    const startDate = new Date();
    const endDate = addDays(startDate, durationMonths * 30);

    const [enrollment] = await Enrollment.create(
      [
        {
          user_id: req.user.id,
          internship_id: internship._id,
          duration_months: durationMonths,
          amount_paid: payment.amount,
          internship_code: internshipCode,
          start_date: startDate,
          end_date: endDate,
          total_tasks: totalTasks
        }
      ],
      { session }
    );

    // Apply state transition helper (Task 1.3)
    sessionPayment.transitionTo('paid');
    sessionPayment.razorpay_payment_id = razorpay_payment_id;
    sessionPayment.razorpay_signature = razorpay_signature;
    sessionPayment.enrollment_id = enrollment._id;
    await sessionPayment.save({ session });

    await session.commitTransaction();

    // Send confirmation email asynchronously (outside transaction)
    const user = await User.findById(req.user.id);
    if (user) {
      try {
        await sendEnrollmentConfirmation(user.college_email, {
          name: user.full_name,
          internshipCode,
          internshipName: internship.category_name,
          duration: durationMonths,
          startDate,
          endDate,
          categoryCode: internship.category_code
        });
      } catch (emailErr) {
        logger.warn({ err: emailErr }, 'Confirmation email could not be sent');
      }
    }

    return res.json(
      successResponse({
        enrollmentId: enrollment._id,
        internship_code: internshipCode
      })
    );
  } catch (err) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    // Handle concurrent replays (WriteConflict, DuplicateKey 11000, TransientTransactionError)
    const isConcurrentConflict =
      err.code === 11000 ||
      err.code === 112 ||
      err.hasErrorLabel?.('TransientTransactionError') ||
      err.errorLabels?.includes('TransientTransactionError') ||
      err.message?.includes('WriteConflict') ||
      err.message?.includes('Please retry');

    if (isConcurrentConflict) {
      // Re-fetch payment in case a concurrent request successfully completed it
      const completedPayment = await Payment.findOne({
        razorpay_order_id: req.body?.razorpay_order_id,
        user_id: req.user?.id
      });

      if (completedPayment?.enrollment_id) {
        const existingEnrollment = await Enrollment.findById(completedPayment.enrollment_id);
        if (existingEnrollment) {
          return res.json(
            successResponse({
              enrollmentId: existingEnrollment._id,
              internship_code: existingEnrollment.internship_code
            })
          );
        }
      }

      const existingActive = await Enrollment.findOne({
        user_id: req.user?.id,
        status: 'active'
      });
      if (existingActive) {
        return res.json(
          successResponse({
            enrollmentId: existingActive._id,
            internship_code: existingActive.internship_code
          })
        );
      }
    }
    next(err);
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

// ── Enrollment Lookups ────────────────────────────────────────────────────────
export const getMyEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ user_id: req.user.id }).populate(
      'internship_id',
      'category_code category_name icon'
    );
    return res.json(successResponse({ data: enrollments }));
  } catch (err) {
    next(err);
  }
};

export const getEnrollmentById = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne({
      _id: req.params.id,
      user_id: req.user.id
    }).populate('internship_id');

    if (!enrollment) return res.status(404).json(errorResponse('Enrollment not found'));

    const submissions = await TaskSubmission.find({ enrollment_id: enrollment._id }).sort({
      task_number: 1
    });

    return res.json(successResponse({ data: { enrollment, submissions } }));
  } catch (err) {
    next(err);
  }
};
