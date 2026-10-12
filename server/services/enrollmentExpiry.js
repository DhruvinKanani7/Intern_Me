import Enrollment from '../models/Enrollment.js';
import logger from '../config/logger.js';

export const expireOverdueEnrollments = async () => {
  const now = new Date();
  try {
    const result = await Enrollment.updateMany(
      {
        status: 'active',
        end_date: { $lt: now }
      },
      {
        $set: {
          status: 'expired',
          updated_at: now
        }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info({ expiredCount: result.modifiedCount }, 'Marked overdue enrollments as expired');
    }

    return result.modifiedCount;
  } catch (err) {
    logger.error({ err }, 'Error checking and expiring overdue enrollments');
    throw err;
  }
};

export default { expireOverdueEnrollments };
