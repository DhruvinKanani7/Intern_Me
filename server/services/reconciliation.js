import Payment from '../models/Payment.js';
import Enrollment from '../models/Enrollment.js';
import Internship from '../models/Internship.js';
import { fetchOrder } from './razorpay.js';
import generateInternshipCode from './internshipCode.js';
import logger from '../config/logger.js';
import { addDays } from '../utils/helpers.js';

export const reconcileStuckOrders = async (olderThanMinutes = 30) => {
  const threshold = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  const stuckPayments = await Payment.find({
    status: 'created',
    created_at: { $lt: threshold }
  });

  logger.info({ count: stuckPayments.length }, 'Running payment reconciliation job');

  const results = {
    checked: stuckPayments.length,
    resolved: 0,
    failed: 0
  };

  for (const payment of stuckPayments) {
    try {
      const order = await fetchOrder(payment.razorpay_order_id);

      if (order.status === 'paid') {
        payment.transitionTo('paid');

        if (!payment.enrollment_id) {
          const internship = await Internship.findById(payment.internship_id);
          if (internship) {
            const duration = Number(order.notes?.duration || 1);
            const totalTasks = internship[`total_tasks_${duration}m`] || internship.total_tasks_1m;
            const code = await generateInternshipCode(internship.category_code);
            const startDate = new Date();
            const endDate = addDays(startDate, duration * 30);

            const enrollment = await Enrollment.create({
              user_id: payment.user_id,
              internship_id: internship._id,
              duration_months: duration,
              amount_paid: payment.amount,
              internship_code: code,
              start_date: startDate,
              end_date: endDate,
              total_tasks: totalTasks
            });

            payment.enrollment_id = enrollment._id;
          }
        }
        await payment.save();
        results.resolved += 1;
      } else if (order.status === 'attempted' || order.status === 'created') {
        // If order is older than 24h and still not paid, mark failed
        const ageHours = (Date.now() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60);
        if (ageHours > 24) {
          payment.transitionTo('failed');
          await payment.save();
          results.failed += 1;
        }
      }
    } catch (err) {
      logger.error({ err, orderId: payment.razorpay_order_id }, 'Failed to reconcile order');
    }
  }

  return results;
};

export default reconcileStuckOrders;
