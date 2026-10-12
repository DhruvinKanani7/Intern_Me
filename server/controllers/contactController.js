import { successResponse, errorResponse } from '../utils/helpers.js';
import { sendContactMessageEmail } from '../services/email.js';
import { checkEmailCooldown, isCaptchaRequired, verifyCaptcha } from '../services/abuseProtection.js';

export const sendContactMessage = async (req, res, next) => {
  try {
    const { name, email, subject, message, captcha_token } = req.body;

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(400).json(errorResponse('Name, email, subject, and message are required'));
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json(errorResponse('Please provide a valid email address'));
    }

    // Task 6.2: CAPTCHA check if IP threshold exceeded
    const captchaRequired = await isCaptchaRequired(req.ip, 'contact', 3);
    if (captchaRequired) {
      const isValidCaptcha = await verifyCaptcha(captcha_token, req.ip);
      if (!isValidCaptcha) {
        return res.status(400).json(errorResponse('CAPTCHA verification required'));
      }
    }

    // Task 6.2: Per-email cooldown (60 seconds)
    const { allowed, retryAfter } = await checkEmailCooldown(email, 'contact', 60);
    if (!allowed) {
      return res.status(429).json(
        errorResponse(`Please wait ${retryAfter} seconds before sending another message.`)
      );
    }

    try {
      await sendContactMessageEmail({ name, email, subject, message });
    } catch (emailErr) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(502).json(errorResponse('Message could not be delivered. Please try again later.'));
      }
      console.warn(`Contact email skipped: ${emailErr.message}`);
    }

    return res.status(201).json(successResponse({}, 'Message received successfully'));
  } catch (err) {
    next(err);
  }
};
