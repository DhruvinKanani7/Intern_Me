import Payment from '../models/Payment.js';
import Enrollment from '../models/Enrollment.js';
import { createRefund } from './razorpay.js';
import { logAuditEvent } from './auditLogger.js';
import { AppError } from '../utils/AppError.js';
import logger from '../config/logger.js';

export const REFUND_POLICY = {
  FULL_REFUND_DAYS: 7,
  PARTIAL_REFUND_DAYS: 30,
  MAX_PROGRESS_RATIO: 0.3
};

/**
 * Validates refund eligibility based on the platform policy:
 * - 100% refund within 7 days of payment.
 * - Partial/full refund within 30 days if less than 30% of the program completed.
 */
export const checkRefundEligibility = async (payment, enrollment, requestedAmount, force = false) => {
  if (force) {
    return { eligible: true, reason: 'Admin manual policy override' };
  }

  const paymentTime = payment.paid_at || payment.created_at || new Date();
  const daysSincePayment = (Date.now() - new Date(paymentTime).getTime()) / (1000 * 60 * 60 * 24);

  // Policy 1: Within 7 days, full refund no questions asked
  if (daysSincePayment <= REFUND_POLICY.FULL_REFUND_DAYS) {
    return { eligible: true, tier: 'full_guarantee' };
  }

  // Policy 2: Between 7 and 30 days, check progress
  if (daysSincePayment <= REFUND_POLICY.PARTIAL_REFUND_DAYS) {
    if (enrollment) {
      const currentTask = enrollment.current_task || 1;
      const totalTasks = enrollment.total_tasks || 1;
      const progress = (currentTask - 1) / totalTasks;

      if (progress > REFUND_POLICY.MAX_PROGRESS_RATIO) {
        throw new AppError(
          `Refund not eligible: program progress (${Math.round(progress * 100)}%) exceeds allowable limit (${REFUND_POLICY.MAX_PROGRESS_RATIO * 100}%)`,
          400
        );
      }
    }
    return { eligible: true, tier: 'conditional_window' };
  }

  // Beyond 30 days: window expired
  throw new AppError(
    `Refund window has expired (${Math.floor(daysSincePayment)} days since payment; limit is ${REFUND_POLICY.PARTIAL_REFUND_DAYS} days)`,
    400
  );
};

/**
 * Process a refund for a payment with state machine transition, enrollment closure, and audit logging.
 */
export const processRefund = async ({ paymentId, amount, reason, actorId, force = false, req }) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new AppError('Payment record not found', 404);
  }

  if (payment.status === 'refunded') {
    throw new AppError('Payment has already been fully refunded', 400);
  }

  if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
    throw new AppError(`Cannot refund payment in '${payment.status}' status`, 400);
  }

  const remainingBalance = payment.amount - (payment.refunded_amount || 0);
  const refundAmount = amount ? Number(amount) : remainingBalance;

  if (refundAmount <= 0) {
    throw new AppError('Refund amount must be greater than zero', 400);
  }

  if (refundAmount > remainingBalance) {
    throw new AppError(
      `Refund amount (₹${refundAmount}) exceeds available balance (₹${remainingBalance})`,
      400
    );
  }

  const enrollment = payment.enrollment_id
    ? await Enrollment.findById(payment.enrollment_id)
    : null;

  // Validate policy window
  await checkRefundEligibility(payment, enrollment, refundAmount, force);

  // Call Razorpay refund API / mock
  const razorpayPaymentId = payment.razorpay_payment_id || payment.razorpay_order_id;
  let refundResult;
  try {
    refundResult = await createRefund({
      paymentId: razorpayPaymentId,
      amount: refundAmount,
      notes: {
        reason: reason || 'Customer requested refund',
        refundedBy: actorId?.toString() || 'admin'
      }
    });
  } catch (err) {
    logger.error({ err, paymentId: payment._id }, 'Razorpay refund API call failed');
    throw new AppError(err.message || 'Razorpay refund execution failed', 502);
  }

  // State machine transition
  const newRefundedTotal = (payment.refunded_amount || 0) + refundAmount;
  const isFullRefund = newRefundedTotal >= payment.amount;

  payment.refunded_amount = newRefundedTotal;
  if (isFullRefund) {
    payment.transitionTo('refunded');
  } else {
    payment.transitionTo('partially_refunded');
  }

  if (refundResult?.id) {
    payment.processed_events = payment.processed_events || [];
    payment.processed_events.push(refundResult.id);
  }
  await payment.save();

  // If enrollment is active/expired and payment is fully refunded, close enrollment
  if (enrollment && isFullRefund && (enrollment.status === 'active' || enrollment.status === 'expired')) {
    enrollment.transitionTo('closed');
    await enrollment.save();
    logger.info({ enrollmentId: enrollment._id }, 'Enrollment closed due to payment refund');
  }

  // Append-only audit log
  await logAuditEvent({
    actorId,
    action: 'payment_refunded',
    targetType: 'Payment',
    targetId: payment._id,
    reason: reason || 'Customer refund processed',
    details: {
      amount: refundAmount,
      isFullRefund,
      refundId: refundResult?.id,
      enrollmentId: enrollment?._id,
      remainingBalance: payment.amount - payment.refunded_amount
    },
    req
  });

  return {
    payment,
    refund: refundResult,
    isFullRefund,
    refundedAmount: refundAmount
  };
};

export default {
  REFUND_POLICY,
  checkRefundEligibility,
  processRefund
};
