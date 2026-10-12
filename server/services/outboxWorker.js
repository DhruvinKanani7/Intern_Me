import Outbox from '../models/Outbox.js';
import Certificate from '../models/Certificate.js';
import certificateGenerator from './certificateGenerator.js';
import logger from '../config/logger.js';

export const processOutboxJobs = async (batchSize = 10) => {
  const now = new Date();
  const jobs = await Outbox.find({
    status: { $in: ['pending', 'failed'] },
    attempts: { $lt: 5 },
    next_run_at: { $lte: now }
  })
    .sort({ created_at: 1 })
    .limit(batchSize);

  let processedCount = 0;
  let failedCount = 0;

  for (const job of jobs) {
    job.status = 'processing';
    job.attempts += 1;
    await job.save();

    try {
      if (job.event_type === 'generate_certificate') {
        const { enrollment_id } = job.payload;

        // Idempotency check: verify if a certificate already exists for this enrollment (SEC-13)
        const existingCert = await Certificate.findOne({ enrollment_id });
        if (!existingCert) {
          await certificateGenerator.generate(enrollment_id);
        } else {
          logger.info(
            { enrollment_id, cert_id: existingCert.cert_id },
            'Certificate already generated; skipping duplicate creation'
          );
        }
      }

      job.status = 'completed';
      job.processed_at = new Date();
      job.last_error = undefined;
      await job.save();
      processedCount += 1;
    } catch (err) {
      failedCount += 1;
      logger.error({ err, jobId: job._id }, 'Outbox job processing failed');

      job.last_error = err.message || 'Unknown processing error';
      if (job.attempts >= job.max_attempts) {
        job.status = 'failed';
      } else {
        job.status = 'pending';
        // Exponential backoff: 2^attempts seconds
        const delaySeconds = Math.pow(2, job.attempts);
        job.next_run_at = new Date(Date.now() + delaySeconds * 1000);
      }
      await job.save();
    }
  }

  return { processedCount, failedCount };
};

export default { processOutboxJobs };
