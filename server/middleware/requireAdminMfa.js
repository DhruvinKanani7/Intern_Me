import User from '../models/User.js';
import { verifyMfaToken, verifyBackupCode } from '../services/mfaService.js';
import { errorResponse } from '../utils/helpers.js';
import logger from '../config/logger.js';

/**
 * Step-up authentication middleware for high-privilege administrative actions.
 * Enforces TOTP MFA verification (or single-use backup code) before allowing
 * sensitive operations like certificate revocation, refunds, or deletions (SEC-15).
 */
export const requireAdminMfa = async (req, res, next) => {
  try {
    const adminUser = await User.findById(req.user.id);
    if (!adminUser) {
      return res.status(401).json(errorResponse('Admin account not found'));
    }

    const mfaEnforced = process.env.ADMIN_MFA_ENFORCED === 'true';

    // If MFA is enabled on the account OR globally enforced for all admins
    if (adminUser.mfa_enabled || mfaEnforced) {
      if (!adminUser.mfa_enabled) {
        return res.status(403).json(
          errorResponse('MFA enrollment required for sensitive administrative actions', 'MFA_ENROLLMENT_REQUIRED')
        );
      }

      const mfaCode =
        req.headers['x-admin-mfa-code'] ||
        req.headers['x-admin-mfa-token'] ||
        req.headers['x-mfa-code'] ||
        req.body?.mfa_code ||
        req.body?.mfa_token ||
        req.query?.mfa_code;

      if (!mfaCode) {
        return res.status(403).json(
          errorResponse('MFA verification required for sensitive operation', 'MFA_REQUIRED')
        );
      }

      // 1. Verify TOTP time-based token
      const isValidTotp = verifyMfaToken(adminUser.mfa_secret, mfaCode);

      if (isValidTotp) {
        req.mfaVerified = true;
        return next();
      }

      // 2. Fallback: Verify one-time backup recovery code
      const backupResult = verifyBackupCode(adminUser.mfa_backup_codes, mfaCode);
      if (backupResult.valid) {
        adminUser.mfa_backup_codes = backupResult.remainingHashedCodes;
        await adminUser.save();
        req.mfaVerified = true;
        logger.info({ adminId: adminUser._id }, 'Admin consumed single-use MFA backup code');
        return next();
      }

      logger.warn(
        { adminId: adminUser._id, ip: req.ip, event: 'ADMIN_MFA_FAILURE' },
        'Invalid admin MFA code submitted for sensitive operation'
      );

      return res.status(403).json(errorResponse('Invalid MFA code provided', 'MFA_INVALID'));
    }

    // MFA not enabled on account and not globally enforced
    return next();
  } catch (err) {
    next(err);
  }
};

export default requireAdminMfa;
