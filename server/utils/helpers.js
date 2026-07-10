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
  return url.toLowerCase().includes('linkedin.com');
};

export const generateRandomToken = (bytes = 16) => {
  // 32-char hex when bytes = 16
  const chars = 'abcdef0123456789';
  let token = '';
  for (let i = 0; i < bytes * 2; i += 1) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
};

export const generateOTP = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
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
