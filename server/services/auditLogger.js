import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';

export const logAuditEvent = async ({
  actorId,
  actorRole = 'admin',
  action,
  targetType,
  targetId,
  beforeState,
  afterState,
  reason,
  req,
  session
}) => {
  try {
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress;
    const requestId = req?.id || req?.headers?.['x-request-id'];

    const logEntry = {
      actor_id: actorId,
      actor_role: actorRole,
      action,
      target_type: targetType,
      target_id: String(targetId),
      before_state: beforeState,
      after_state: afterState,
      reason,
      ip: typeof ip === 'string' ? ip.split(',')[0].trim() : undefined,
      request_id: requestId
    };

    const options = session ? { session } : {};
    await AuditLog.create([logEntry], options);
  } catch (err) {
    logger.error({ err, action, targetType, targetId }, 'Failed to record audit log entry');
  }
};

export default logAuditEvent;
