import crypto from 'crypto';
import Internship from '../models/Internship.js';
import Enrollment from '../models/Enrollment.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import TaskSubmission from '../models/TaskSubmission.js';
import razorpayInstance, { createOrder } from '../services/razorpay.js';
import generateInternshipCode from '../services/internshipCode.js';
import { sendEnrollmentConfirmation } from '../services/email.js';
import { successResponse, errorResponse, addDays } from '../utils/helpers.js';

const priceFieldFor = (duration) => `price_${duration}m`;
const taskFieldFor = (duration) => `total_tasks_${duration}m`;

// add the following code at production phase
export const createOrderHandler = async (req, res) => {
  try {
    const { categoryCode, duration } = req.body;
    if (!categoryCode || ![1, 3, 5].includes(Number(duration))) {
      return res.status(400).json(errorResponse('categoryCode and a valid duration (1, 3, or 5) are required'));
    }

    const internship = await Internship.findOne({ category_code: categoryCode.toUpperCase(), is_active: true });
    if (!internship) return res.status(404).json(errorResponse('Internship not found'));

    const existingActive = await Enrollment.findOne({
      user_id: req.user.id,
      internship_id: internship._id,
      status: 'active'
    });
    if (existingActive) {
      return res.status(409).json(errorResponse('You already have an active enrollment for this internship'));
    }

    const price = internship[priceFieldFor(duration)];
    const durationMonths = Number(duration);

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      const internshipCode = await generateInternshipCode(internship.category_code);
      const startDate = new Date();
      const endDate = addDays(startDate, durationMonths * 30);
      const totalTasks = internship[taskFieldFor(durationMonths)];

      const enrollment = await Enrollment.create({
        user_id: req.user.id,
        internship_id: internship._id,
        duration_months: durationMonths,
        amount_paid: price,
        internship_code: internshipCode,
        start_date: startDate,
        end_date: endDate,
        total_tasks: totalTasks
      });

      await Payment.create({
        enrollment_id: enrollment._id,
        razorpay_order_id: `dev_order_${Date.now()}`,
        razorpay_payment_id: `dev_payment_${Date.now()}`,
        amount: price,
        status: 'paid',
        paid_at: new Date()
      });

      const user = await User.findById(req.user.id);
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
        // Enrollment should not fail just because the email provider is unavailable in local/dev.
      }

      return res.status(201).json(
        successResponse({
          data: {
            enrollmentId: enrollment._id,
            internship_code: internshipCode,
            amount: price,
            currency: 'INR',
            devCompleted: true
          }
        })
      );
    }

    const order = await createOrder({
      amount: price,
      receipt: `rcpt_${Date.now()}`,
      notes: { userId: req.user.id, categoryCode: internship.category_code, duration: String(duration) }
    });

    await Payment.create({
      razorpay_order_id: order.id,
      amount: price,
      status: 'created'
    });

    return res.json(
      successResponse({
        data: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          key: process.env.RAZORPAY_KEY_ID
        }
      })
    );
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};
// DEV-ONLY: skips Razorpay entirely and marks the order paid + enrolls the user.
// Guarded so it 404s if NODE_ENV is production — remove this whole function before deploying.

export const devCompleteOrderHandler = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json(errorResponse('Not found'));
  }
  try {
    const { orderId } = req.body;
    const payment = await Payment.findOne({ razorpay_order_id: orderId });
    if (!payment) return res.status(404).json(errorResponse('Payment record not found'));

    payment.razorpay_payment_id = `dev_${Date.now()}`;
    payment.status = 'paid';
    payment.paid_at = new Date();
    await payment.save();

    const order = await razorpayInstance.orders.fetch(orderId);
    const { userId, categoryCode, duration } = order.notes;
    const durationMonths = Number(duration);

    const internship = await Internship.findOne({ category_code: categoryCode });
    const internshipCode = await generateInternshipCode(internship.category_code);
    const startDate = new Date();
    const endDate = addDays(startDate, durationMonths * 30);
    const totalTasks = internship[taskFieldFor(durationMonths)];

    const enrollment = await Enrollment.create({
      user_id: userId,
      internship_id: internship._id,
      duration_months: durationMonths,
      amount_paid: payment.amount,
      internship_code: internshipCode,
      start_date: startDate,
      end_date: endDate,
      total_tasks: totalTasks
    });

    payment.enrollment_id = enrollment._id;
    await payment.save();

    return res.json(successResponse({ enrollmentId: enrollment._id, internship_code: internshipCode }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const verifyPaymentHandler = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const payment = await Payment.findOne({ razorpay_order_id });
    if (!payment) return res.status(404).json(errorResponse('Payment record not found'));

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      payment.status = 'failed';
      await payment.save();
      return res.status(400).json(errorResponse('Payment signature verification failed'));
    }

    payment.razorpay_payment_id = razorpay_payment_id;
    payment.razorpay_signature = razorpay_signature;
    payment.status = 'paid';
    payment.paid_at = new Date();
    await payment.save();

    // Recover which internship/duration this order was for from the notes
    // stored on the Razorpay order at creation time.
    const order = await razorpayInstance.orders.fetch(razorpay_order_id);
    const { userId, categoryCode, duration } = order.notes;
    const durationMonths = Number(duration);

    const internship = await Internship.findOne({ category_code: categoryCode });
    if (!internship) return res.status(404).json(errorResponse('Internship not found for this order'));

    const internshipCode = await generateInternshipCode(internship.category_code);
    const startDate = new Date();
    const endDate = addDays(startDate, durationMonths * 30);
    const totalTasks = internship[taskFieldFor(durationMonths)];

    const enrollment = await Enrollment.create({
      user_id: userId,
      internship_id: internship._id,
      duration_months: durationMonths,
      amount_paid: payment.amount,
      internship_code: internshipCode,
      start_date: startDate,
      end_date: endDate,
      total_tasks: totalTasks
    });

    payment.enrollment_id = enrollment._id;
    await payment.save();

    const user = await User.findById(userId);
    await sendEnrollmentConfirmation(user.college_email, {
      name: user.full_name,
      internshipCode,
      internshipName: internship.category_name,
      duration: durationMonths,
      startDate,
      endDate,
      categoryCode: internship.category_code
    });

    return res.json(successResponse({ enrollmentId: enrollment._id, internship_code: internshipCode }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ user_id: req.user.id }).populate(
      'internship_id',
      'category_code category_name icon'
    );
    return res.json(successResponse({ data: enrollments }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({ _id: req.params.id, user_id: req.user.id }).populate(
      'internship_id'
    );
    if (!enrollment) return res.status(404).json(errorResponse('Enrollment not found'));

    const submissions = await TaskSubmission.find({ enrollment_id: enrollment._id }).sort({ task_number: 1 });

    return res.json(successResponse({ data: { enrollment, submissions } }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};
