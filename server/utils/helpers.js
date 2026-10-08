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

// Strict LinkedIn URL validation (Task 3.1 / F12 / SEC-07)
export const isValidLinkedInUrl = (url) => {
  if (typeof url !== 'string') return false;
  try {
    const trimmed = url.trim();
    const parsed = new URL(trimmed);

    // Strictly require https: protocol (reject javascript:, http:, data:)
    if (parsed.protocol !== 'https:') return false;

    // Strict hostname allowlist
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== 'linkedin.com' && hostname !== 'www.linkedin.com') {
      return false;
    }

    // Must match valid LinkedIn profile or post paths
    const pathname = parsed.pathname;
    const validPatterns = [
      /^\/in\/[a-zA-Z0-9_\u0080-\uFFFF-]+\/?$/,
      /^\/posts\/[a-zA-Z0-9_\u0080-\uFFFF-]+/,
      /^\/feed\/update\/urn:li:(activity|share):[0-9]+/,
      /^\/pulse\/[a-zA-Z0-9_\u0080-\uFFFF-]+/
    ];

    return validPatterns.some((pattern) => pattern.test(pathname));
  } catch {
    return false;
  }
};

// Normalize LinkedIn URL into canonical form (Task 3.1)
export const normalizeLinkedInUrl = (url) => {
  if (!isValidLinkedInUrl(url)) return null;
  const parsed = new URL(url.trim());
  parsed.protocol = 'https:';
  parsed.hostname = 'www.linkedin.com';
  // Strip tracking and session query parameters
  parsed.search = '';
  parsed.hash = '';
  // Canonical form without trailing slash
  return parsed.toString().replace(/\/$/, '');
};

// HTML entity escaping for email templates & output sanitization (Task 3.2 / F13 / SEC-08)
export const escapeHtml = (unsafe) => {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Safe href URL validator (Task 3.2)
export const safeHref = (url) => {
  if (!url || typeof url !== 'string') return '#';
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return escapeHtml(parsed.href);
    }
    return '#';
  } catch {
    return '#';
  }
};

// Regex escaping to prevent ReDoS and regex syntax injection (Task 3.3 / F20)
export const escapeRegex = (str, maxLength = 64) => {
  if (typeof str !== 'string') return '';
  const truncated = str.trim().slice(0, maxLength);
  return truncated.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Shared pagination parser with bounded limits (Task 3.5 / F25 / F33)
export const parsePagination = (query = {}, defaultLimit = 20, maxLimit = 100) => {
  const parsedPage = parseInt(query.page, 10);
  const page = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);

  const parsedLimit = parseInt(query.limit, 10);
  const rawLimit = isNaN(parsedLimit) ? defaultLimit : parsedLimit;
  const limit = Math.min(Math.max(1, rawLimit), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
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
