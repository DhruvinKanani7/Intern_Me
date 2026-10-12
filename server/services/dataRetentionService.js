import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import Outbox from '../models/Outbox.js';
import logger from '../config/logger.js';

/**
 * Data retention policy service (Task 8.6)
 * - Prunes unverified registrations older than retention window (default 7 days)
 * - Cleans up expired password reset tokens
 * - Prunes processed outbox emails older than 30 days
 * - Prunes audit log records older than retention window (default 180 days)
 */
export async function runRetentionPruning({
  unverifiedUserMaxDays = 7,
  processedOutboxMaxDays = 30,
  auditLogMaxDays = 180,
} = {}) {
  const stats = {
    unverifiedUsersPurged: 0,
    resetTokensCleared: 0,
    outboxEmailsPurged: 0,
    auditLogsPurged: 0,
  };

  const now = new Date();

  // 1. Purge unverified users older than max days
  const unverifiedThreshold = new Date(now.getTime() - unverifiedUserMaxDays * 24 * 60 * 60 * 1000);
  const unverifiedResult = await User.deleteMany({
    email_verified: false,
    created_at: { $lt: unverifiedThreshold },
  });
  stats.unverifiedUsersPurged = unverifiedResult.deletedCount || 0;

  // 2. Clear expired reset tokens from users
  const resetTokenResult = await User.updateMany(
    {
      $or: [
        { reset_token_expires: { $lt: now }, reset_token: { $ne: null } },
        { reset_password_token_expires_at: { $lt: now }, reset_password_token: { $ne: null } },
      ],
    },
    {
      $unset: {
        reset_token: 1,
        reset_token_expires: 1,
        reset_password_token: 1,
        reset_password_token_expires_at: 1,
      },
    }
  );
  stats.resetTokensCleared = resetTokenResult.modifiedCount || 0;

  // 3. Purge processed outbox records older than max days
  const outboxThreshold = new Date(now.getTime() - processedOutboxMaxDays * 24 * 60 * 60 * 1000);
  const outboxResult = await Outbox.deleteMany({
    status: 'sent',
    processed_at: { $lt: outboxThreshold },
  });
  stats.outboxEmailsPurged = outboxResult.deletedCount || 0;

  // 4. Prune aged audit logs older than retention period (using raw collection to bypass append-only hook)
  const auditThreshold = new Date(now.getTime() - auditLogMaxDays * 24 * 60 * 60 * 1000);
  const auditResult = await AuditLog.collection.deleteMany({
    created_at: { $lt: auditThreshold },
  });
  stats.auditLogsPurged = auditResult.deletedCount || 0;

  logger.info({ event: 'DATA_RETENTION_PRUNING_COMPLETED', stats }, 'Data retention cleanup executed');
  return stats;
}
