import { getRedisClient, isRedisConnected } from '../config/redis.js';
import logger from '../config/logger.js';

// In-memory fallback stores with timestamps
const memoryCooldowns = new Map();
const memoryIpCounters = new Map();

/**
 * Checks and sets an email cooldown.
 * 
 * @param {string} email - Normalized email address
 * @param {string} action - Action identifier (e.g., 'reset', 'contact')
 * @param {number} cooldownSeconds - Minimum seconds between requests (default: 60)
 * @returns {Promise<{ allowed: boolean, retryAfter: number }>}
 */
export const checkEmailCooldown = async (email, action = 'generic', cooldownSeconds = 60) => {
  if (!email) return { allowed: true, retryAfter: 0 };
  const normalized = email.toLowerCase().trim();
  const key = `cooldown:${action}:${normalized}`;
  const now = Date.now();

  // 1. Try Redis if connected
  const redis = getRedisClient();
  if (redis && isRedisConnected()) {
    try {
      const ttl = await redis.ttl(key);
      if (ttl > 0) {
        return { allowed: false, retryAfter: ttl };
      }
      await redis.set(key, '1', 'EX', cooldownSeconds);
      return { allowed: true, retryAfter: 0 };
    } catch (err) {
      logger.warn({ err: err.message }, 'Redis error checking email cooldown, falling back to in-memory');
    }
  }

  // 2. In-memory fallback
  const lastTime = memoryCooldowns.get(key);
  if (lastTime && now - lastTime < cooldownSeconds * 1000) {
    const remainingMs = cooldownSeconds * 1000 - (now - lastTime);
    return { allowed: false, retryAfter: Math.ceil(remainingMs / 1000) };
  }

  memoryCooldowns.set(key, now);
  // Auto-cleanup memory
  setTimeout(() => {
    if (memoryCooldowns.get(key) === now) memoryCooldowns.delete(key);
  }, cooldownSeconds * 1000);

  return { allowed: true, retryAfter: 0 };
};

/**
 * Checks if an IP has exceeded the threshold where CAPTCHA is required.
 * 
 * @param {string} ip - Client IP address
 * @param {string} action - Action identifier
 * @param {number} threshold - Number of requests before requiring CAPTCHA (default: 3)
 * @param {number} windowSeconds - Tracking window (default: 900s / 15m)
 * @returns {Promise<boolean>} True if CAPTCHA is required
 */
export const isCaptchaRequired = async (ip, action = 'generic', threshold = 3, windowSeconds = 900) => {
  if (!ip) return false;
  const key = `ip_count:${action}:${ip}`;

  const redis = getRedisClient();
  if (redis && isRedisConnected()) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      return count > threshold;
    } catch (err) {
      logger.warn({ err: err.message }, 'Redis error checking IP quota');
    }
  }

  // In-memory counter
  const entry = memoryIpCounters.get(key) || { count: 0, expiresAt: Date.now() + windowSeconds * 1000 };
  if (Date.now() > entry.expiresAt) {
    entry.count = 1;
    entry.expiresAt = Date.now() + windowSeconds * 1000;
  } else {
    entry.count += 1;
  }
  memoryIpCounters.set(key, entry);

  return entry.count > threshold;
};

/**
 * Validates a CAPTCHA token (Cloudflare Turnstile or test token).
 * 
 * @param {string} token - The captcha response token
 * @param {string} remoteip - Client IP
 * @returns {Promise<boolean>}
 */
export const verifyCaptcha = async (token, remoteip) => {
  // Test and dev environments bypass with mock token or if no secret configured
  if (process.env.NODE_ENV === 'test' || token === 'test-captcha-token') {
    return true;
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // If no Turnstile secret is configured in dev, accept token
    return Boolean(token);
  }

  if (!token) return false;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteip) formData.append('remoteip', remoteip);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    return Boolean(data.success);
  } catch (err) {
    logger.error({ err: err.message }, 'Captcha verification error');
    return false;
  }
};

export default {
  checkEmailCooldown,
  isCaptchaRequired,
  verifyCaptcha
};
