import crypto from 'crypto';

// Validation helpers used across controllers
export const isValidCollegeEmail = (email) => {
  if (typeof email !== 'string') return false;
  const lower = email.toLowerCase().trim();
  return /^[^\s@]+@[^\s@]+\.(edu|ac\.in)$/.test(lower);
};

export const isStrongPassword = (password) => {
  if (typeof password !== 'string' || password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasUpper && hasLower && hasNumber;
};

export const isValidLinkedInUrl = (url) => {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      (parsed.hostname === 'linkedin.com' ||
        parsed.hostname === 'www.linkedin.com' ||
        parsed.hostname.endsWith('.linkedin.com'))
    );
  } catch {
    return false;
  }
};

// Cryptographically secure token generation (F18)
export const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

// SHA-256 hash helper for one-time tokens stored at rest (F18)
export const hashToken = (token) => {
  if (!token) return '';
  return crypto.createHash('sha256').update(String(token)).digest('hex');
};

export const generateOTP = () => {
  return String(crypto.randomInt(100000, 1000000));
};

export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const successResponse = (data = {}, message = null) => {
  const payload = { success: true, ...data };
  if (message) payload.message = message;
  return payload;
};

export const errorResponse = (message) => ({ success: false, message });
