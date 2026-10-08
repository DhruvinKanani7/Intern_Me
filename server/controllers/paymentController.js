import mongoose from 'mongoose';
import Enrollment from '../models/Enrollment.js';
import Payment from '../models/Payment.js';
import Internship from '../models/Internship.js';
import User from '../models/User.js';
import logger from '../config/logger.js';
import { verifyWebhookSignature } from '../services/razorpay.js';
import generateInternshipCode from '../services/internshipCode.js';
import { sendEnrollmentConfirmation } from '../services/email.js';
import { successResponse, errorResponse, addDays } from '../utils/helpers.js';

const taskFieldFor = (duration) => `total_tasks_${duration}m`;

export const getMyPayments = async (req, res, next) => {
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
    next(err);
  }
};

// ── Signed Razorpay Webhook Handler (Task 1.6 / F5) ───────────────────────────
export const handlePaymentWebhook = async (req, res, next) => {
  let session = null;
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json(errorResponse('Missing webhook signature'));
    }

    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const isValid = verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      logger.warn({ ip: req.ip }, 'Invalid Razorpay webhook signature rejected');
      return res.status(400).json(errorResponse('Invalid webhook signature'));
    }

    const event = req.body;
    const eventId = event.id || req.headers['x-razorpay-event-id'] || `evt_${Date.now()}`;
    const eventType = event.event;

    const paymentEntity = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;
    const orderId = paymentEntity?.order_id || orderEntity?.id;
    const paymentId = paymentEntity?.id;

    if (!orderId) {
      return res.json({ status: 'ignored_no_order_id' });
    }

    const payment = await Payment.findOne({ razorpay_order_id: orderId });
    if (!payment) {
      return res.json({ status: 'ignored_unknown_order' });
    }

    // Deduplicate webhook event replay
    if (payment.processed_events && payment.processed_events.includes(eventId)) {
      return res.json({ status: 'already_processed' });
    }

    // Handle payment capture / order paid (SEC-06: Tab closed after payment capture)
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      if (payment.status === 'created') {
        session = await mongoose.startSession();
        session.startTransaction();

        payment.transitionTo('paid');
        if (paymentId) payment.razorpay_payment_id = paymentId;

        // Create enrollment if not already created
        if (!payment.enrollment_id) {
          const internship = await Internship.findById(payment.internship_id).session(session);
          if (internship) {
            const durationMonths = Number(orderEntity?.notes?.duration || paymentEntity?.notes?.duration || 1);
            const totalTasks = internship[taskFieldFor(durationMonths)] || internship.total_tasks_1m;
            const internshipCode = await generateInternshipCode(internship.category_code);
            const startDate = new Date();
            const endDate = addDays(startDate, durationMonths * 30);

            const [enrollment] = await Enrollment.create(
              [
                {
                  user_id: payment.user_id,
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

            payment.enrollment_id = enrollment._id;
          }
        }

        payment.processed_events.push(eventId);
        await payment.save({ session });
        await session.commitTransaction();

        // Send confirmation email
        const user = await User.findById(payment.user_id);
        const internship = await Internship.findById(payment.internship_id);
        if (user && internship) {
          const enrollment = await Enrollment.findById(payment.enrollment_id);
          if (enrollment) {
            try {
              await sendEnrollmentConfirmation(user.college_email, {
                name: user.full_name,
                internshipCode: enrollment.internship_code,
                internshipName: internship.category_name,
                duration: enrollment.duration_months,
                startDate: enrollment.start_date,
                endDate: enrollment.end_date,
                categoryCode: internship.category_code
              });
            } catch (emailErr) {
              logger.warn({ err: emailErr }, 'Webhook: Confirmation email could not be sent');
            }
          }
        }

        return res.json({ status: 'success', processed: eventType });
      }
    } else if (eventType === 'payment.failed') {
      if (payment.status === 'created') {
        payment.transitionTo('failed');
        payment.processed_events.push(eventId);
        await payment.save();
        return res.json({ status: 'failed_recorded' });
      }
    } else if (eventType === 'refund.processed') {
      if (payment.status === 'paid') {
        payment.transitionTo('refunded');
        payment.refunded_amount = payment.amount;
        payment.processed_events.push(eventId);
        await payment.save();
        return res.json({ status: 'refund_recorded' });
      }
    }

    // Default: record event ID and acknowledge
    payment.processed_events.push(eventId);
    await payment.save();
    return res.json({ status: 'acknowledged', event: eventType });
  } catch (err) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    next(err);
  } finally {
    if (session) {
      session.endSession();
    }
  }
};
