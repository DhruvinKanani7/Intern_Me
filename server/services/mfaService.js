import crypto from 'crypto';
import QRCode from 'qrcode';
import { generateSecret, generateURI, verifySync } from 'otplib';

/**
 * Generates a new TOTP secret and QR code for an admin user.
 * 
 * @param {Object} user - User document
 * @returns {Promise<{ secret: string, otpauthUrl: string, qrCodeDataUrl: string }>}
 */
export const generateMfaSetup = async (user) => {
  const secret = generateSecret();
  const label = user.college_email || 'admin@interncert.com';
  const otpauthUrl = generateURI({
    secret,
    label,
    issuer: 'InternCert'
  });

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    margin: 1,
    width: 250
  });

  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl
  };
};

/**
 * Validates a 6-digit TOTP code against a secret.
 * 
 * @param {string} secret - Base32 secret
 * @param {string} token - 6-digit token from user
 * @returns {boolean} True if token is valid
 */
export const verifyMfaToken = (secret, token) => {
  if (!secret || !token) return false;
  const cleanToken = String(token).trim();
  // Standard TOTP token must be exactly 6 digits
  if (!/^\d{6}$/.test(cleanToken)) return false;
  try {
    const result = verifySync({ token: cleanToken, secret });
    return Boolean(result?.valid);
  } catch {
    return false;
  }
};

/**
 * Generates 8 one-time backup codes for account recovery.
 * 
 * @param {number} count 
 * @returns {{ rawCodes: string[], hashedCodes: string[] }}
 */
export const generateBackupCodes = (count = 8) => {
  const rawCodes = [];
  const hashedCodes = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars
    const hashed = crypto.createHash('sha256').update(raw).digest('hex');
    rawCodes.push(raw);
    hashedCodes.push(hashed);
  }

  return { rawCodes, hashedCodes };
};

/**
 * Verifies and consumes a backup code.
 * 
 * @param {string[]} storedHashedCodes 
 * @param {string} candidateRawCode 
 * @returns {{ valid: boolean, remainingHashedCodes: string[] }}
 */
export const verifyBackupCode = (storedHashedCodes = [], candidateRawCode) => {
  if (!candidateRawCode || !storedHashedCodes.length) {
    return { valid: false, remainingHashedCodes: storedHashedCodes };
  }

  const candidateHash = crypto
    .createHash('sha256')
    .update(candidateRawCode.trim().toUpperCase())
    .digest('hex');

  const matchIndex = storedHashedCodes.indexOf(candidateHash);
  if (matchIndex === -1) {
    return { valid: false, remainingHashedCodes: storedHashedCodes };
  }

  // Remove used backup code (one-time use)
  const remaining = [...storedHashedCodes];
  remaining.splice(matchIndex, 1);

  return { valid: true, remainingHashedCodes: remaining };
};

export default {
  generateMfaSetup,
  verifyMfaToken,
  generateBackupCodes,
  verifyBackupCode
};
