import { successResponse, errorResponse } from '../utils/helpers.js';
import { sendContactMessageEmail } from '../services/email.js';

export const sendContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(400).json(errorResponse('Name, email, subject, and message are required'));
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json(errorResponse('Please provide a valid email address'));
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
    return res.status(500).json(errorResponse(err.message));
  }
};
