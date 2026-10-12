import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;
    const token = req.cookies?.access_token || req.cookies?.token || bearer;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (jwtErr) {
      if (process.env.JWT_SECRET && process.env.JWT_SECRET !== env.JWT_SECRET) {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } else {
        throw jwtErr;
      }
    }

    // Session version validation (Task 2.2 / F19 / SEC-10)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account no longer exists' });
    }

    if (user.is_disabled) {
      return res.status(403).json({ success: false, message: 'Account has been disabled' });
    }

    // Reject token if token_version has been incremented (e.g. password reset/logout)
    if (decoded.token_version !== undefined && user.token_version !== decoded.token_version) {
      return res.status(401).json({
        success: false,
        message: 'Session invalidated. Please log in again.'
      });
    }

    req.user = {
      id: user._id,
      role: user.role,
      token_version: user.token_version
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token'
    });
  }
};

export default auth;