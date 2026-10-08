import crypto from 'crypto';
import env from '../config/env.js';

const isProd = env.NODE_ENV === 'production';

// Strict Origin and Referer verification (F11 / SEC-09)
export const originCheck = (req, res, next) => {
  // Allow safe read-only methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt webhooks which authenticate via HMAC signature from external servers
  if (req.originalUrl.startsWith('/api/payments/webhook')) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (origin) {
    try {
      const allowedUrl = new URL(env.FRONTEND_URL);
      const reqUrl = new URL(origin);

      const isAllowed =
        reqUrl.origin === allowedUrl.origin ||
        (!isProd && (reqUrl.hostname === 'localhost' || reqUrl.hostname === '127.0.0.1'));

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Cross-origin request rejected'
        });
      }
    } catch {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invalid request origin'
      });
    }
  } else if (referer && isProd) {
    try {
      const allowedUrl = new URL(env.FRONTEND_URL);
      const refUrl = new URL(referer);
      if (refUrl.origin !== allowedUrl.origin) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Cross-origin referer rejected'
        });
      }
    } catch {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invalid referer'
      });
    }
  }

  next();
};

// Double-submit CSRF cookie generation and validation
export const csrfProtection = (req, res, next) => {
  // Generate or refresh XSRF-TOKEN cookie on GET requests
  if (req.method === 'GET') {
    if (!req.cookies['XSRF-TOKEN']) {
      const token = crypto.randomBytes(16).toString('hex');
      res.cookie('XSRF-TOKEN', token, {
        httpOnly: false, // Must be readable by client JS to attach in request headers
        secure: isProd,
        sameSite: 'lax',
        path: '/'
      });
    }
    return next();
  }

  // Exempt webhook
  if (req.originalUrl.startsWith('/api/payments/webhook')) {
    return next();
  }

  // Verify CSRF on state-changing requests if XSRF-TOKEN cookie exists
  const cookieCsrf = req.cookies['XSRF-TOKEN'];
  if (cookieCsrf) {
    const headerCsrf =
      req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];

    if (!headerCsrf || headerCsrf !== cookieCsrf) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: CSRF token validation failed'
      });
    }
  }

  next();
};

export default { originCheck, csrfProtection };
