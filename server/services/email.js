import { Resend } from 'resend';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { escapeHtml, safeHref } from '../utils/helpers.js';

const resend = new Resend(env.RESEND_API_KEY || process.env.RESEND_API_KEY);

const baseWrapper = (title, bodyHtml) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa;">
  <div style="background: #1a1a2e; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">InternCert</h1>
  </div>
  <div style="background: #ffffff; padding: 32px 24px; border: 1px solid #e5e5e5;">
    <h2 style="color: #1a1a2e; margin-top: 0;">${escapeHtml(title)}</h2>
    ${bodyHtml}
  </div>
  <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
    &copy; ${new Date().getFullYear()} InternCert. All rights reserved.
  </div>
</div>
`;

const send = async (to, subject, html, text) => {
  const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.debug({ to, subject }, 'Skipping email send: RESEND_API_KEY is not configured');
    return null;
  }

  const from = env.EMAIL_FROM || process.env.EMAIL_FROM || 'no-reply@interncert.com';
  const cappedSubject = String(subject || '').slice(0, 120);

  return resend.emails.send({
    from,
    to,
    subject: cappedSubject,
    html,
    text: text || ''
  });
};

export const sendVerificationEmail = async (toEmail, token) => {
  const frontendUrl = env.FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const safeLink = safeHref(link);

  const html = baseWrapper(
    'Verify Your Email',
    `<p style="color:#555;">Thanks for registering with InternCert. Please verify your email address to continue.</p>
     <p style="text-align:center; margin: 24px 0;">
       <a href="${safeLink}" style="background:#4c6ef5; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Verify Email</a>
     </p>
     <p style="color:#999; font-size:12px;">This link expires in 24 hours. If the button doesn't work, copy this link: ${escapeHtml(link)}</p>`
  );

  const text = `Thanks for registering with InternCert.\n\nPlease verify your email address using this link (expires in 24 hours):\n${link}\n\nIf you did not request this, please ignore this email.`;

  return send(toEmail, 'Verify Your Email — InternCert', html, text);
};

export const sendEnrollmentConfirmation = async (
  toEmail,
  { name, internshipCode, internshipName, duration, startDate, endDate, categoryCode }
) => {
  const safeName = escapeHtml(name);
  const safeInternship = escapeHtml(internshipName);
  const safeCode = escapeHtml(internshipCode);
  const safeCategory = escapeHtml(categoryCode || '');

  const startStr = new Date(startDate).toDateString();
  const endStr = new Date(endDate).toDateString();

  const html = baseWrapper(
    'Enrollment Confirmed!',
    `<p style="color:#555;">Hi ${safeName}, congratulations on enrolling in <strong>${safeInternship}</strong> (${duration} Month${duration > 1 ? 's' : ''}).</p>
     <p style="color:#555;">Duration: ${startStr} — ${endStr}</p>
     <div style="background:#f0f4ff; border: 2px solid #c9a227; border-radius: 8px; padding: 16px; text-align:center; margin: 24px 0;">
       <p style="margin:0 0 4px 0; color:#1a1a2e; font-size:13px; font-weight:bold;">YOUR UNIQUE INTERNSHIP CODE</p>
       <p style="margin:0; color:#1a1a2e; font-size:22px; font-weight:bold; letter-spacing:1px;">${safeCode}</p>
     </div>
     <p style="color:#555; font-weight:bold;">For each task, post on LinkedIn in this EXACT format:</p>
     <pre style="background:#16213e; color:#fff; padding:16px; border-radius:8px; font-size:13px; white-space:pre-wrap;">#${safeCategory.toLowerCase()} ${safeCode} task:1
[Your post content here]</pre>
     <p style="color:#999; font-size:12px;">Replace "task:1" with the number of the task you are submitting.</p>`
  );

  const text = `Hi ${name},\n\nCongratulations on enrolling in ${internshipName} (${duration} Months).\nDuration: ${startStr} - ${endStr}\n\nYour Unique Internship Code: ${internshipCode}\n\nFormat for LinkedIn submissions:\n#${categoryCode.toLowerCase()} ${internshipCode} task:1\n[Your post content here]`;

  return send(toEmail, 'Enrollment Confirmed — InternCert', html, text);
};

export const sendTaskApproved = async (toEmail, { name, taskNumber, nextTask, isLastTask }) => {
  const safeName = escapeHtml(name);
  const bodyText = isLastTask
    ? `<p style="color:#555;">You completed the final task. Your certificate is being generated and you'll receive it by email shortly!</p>`
    : `<p style="color:#555;">Your next task is Task ${escapeHtml(nextTask)}. Log in to your dashboard to view the details.</p>`;

  const html = baseWrapper(
    `Task ${taskNumber} Approved ✅`,
    `<p style="color:#555;">Hi ${safeName}, great work! Your submission for Task ${taskNumber} has been approved.</p>${bodyText}`
  );

  const text = `Hi ${name},\n\nGreat work! Your submission for Task ${taskNumber} has been approved.\n${isLastTask ? 'You completed the final task. Your certificate is being generated.' : `Your next task is Task ${nextTask}.`}`;

  return send(toEmail, `Task ${taskNumber} Approved — InternCert`, html, text);
};

export const sendTaskRejected = async (toEmail, { name, taskNumber, reason }) => {
  const safeName = escapeHtml(name);
  const safeReason = escapeHtml(reason || 'Please review the task requirements and resubmit.');

  const html = baseWrapper(
    `Task ${taskNumber} Needs Revision`,
    `<p style="color:#555;">Hi ${safeName}, your submission for Task ${taskNumber} was not approved.</p>
     <p style="color:#555;"><strong>Reason:</strong> ${safeReason}</p>
     <p style="color:#555;">Log in to your dashboard to resubmit.</p>`
  );

  const text = `Hi ${name},\n\nYour submission for Task ${taskNumber} was not approved.\nReason: ${reason || 'Please review the task requirements and resubmit.'}\n\nPlease log in to your dashboard to resubmit.`;

  return send(toEmail, `Task ${taskNumber} Needs Revision — InternCert`, html, text);
};

export const sendCertificateEmail = async (toEmail, { name, certId, internshipName, pdfUrl, verifyUrl }) => {
  const safeName = escapeHtml(name);
  const safeCertId = escapeHtml(certId);
  const safeInternship = escapeHtml(internshipName);
  const safePdf = safeHref(pdfUrl);
  const safeVerify = safeHref(verifyUrl);

  const html = baseWrapper(
    'Your Certificate is Ready! 🎓',
    `<p style="color:#555;">Congratulations ${safeName}! You've successfully completed <strong>${safeInternship}</strong>.</p>
     <p style="color:#555;">Certificate ID: <strong>${safeCertId}</strong></p>
     <p style="text-align:center; margin: 24px 0;">
       <a href="${safePdf}" style="background:#c9a227; color:#1a1a2e; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Download Certificate</a>
     </p>
     <p style="color:#999; font-size:12px;">Anyone can verify this certificate at: <a href="${safeVerify}">${escapeHtml(verifyUrl)}</a></p>`
  );

  const text = `Congratulations ${name}!\n\nYou have successfully completed ${internshipName}.\nCertificate ID: ${certId}\nDownload Certificate: ${pdfUrl}\nVerify Certificate: ${verifyUrl}`;

  return send(toEmail, 'Your Certificate is Ready — InternCert', html, text);
};

export const sendPasswordReset = async (toEmail, token) => {
  const frontendUrl = env.FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const safeLink = safeHref(link);

  const html = baseWrapper(
    'Reset Your Password',
    `<p style="color:#555;">We received a request to reset your password. Click below to set a new one.</p>
     <p style="text-align:center; margin: 24px 0;">
       <a href="${safeLink}" style="background:#4c6ef5; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Reset Password</a>
     </p>
     <p style="color:#999; font-size:12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>`
  );

  const text = `We received a request to reset your password.\n\nReset your password at (expires in 1 hour):\n${link}\n\nIf you did not request this, please ignore this email.`;

  return send(toEmail, 'Reset Your Password — InternCert', html, text);
};

export const sendContactMessageEmail = async ({ name, email, subject, message }) => {
  const toEmail = env.CONTACT_TO_EMAIL || process.env.CONTACT_TO_EMAIL || env.EMAIL_FROM || process.env.EMAIL_FROM;
  if (!toEmail) return null;

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(String(subject || '').slice(0, 120));
  const safeMessage = escapeHtml(String(message || '').slice(0, 2000));

  const html = baseWrapper(
    'New Contact Message',
    `<p style="color:#555;"><strong>Name:</strong> ${safeName}</p>
     <p style="color:#555;"><strong>Email:</strong> ${safeEmail}</p>
     <p style="color:#555;"><strong>Subject:</strong> ${safeSubject}</p>
     <div style="margin-top:16px; padding:16px; background:#f7f7f7; border-radius:8px; color:#333; white-space:pre-wrap;">${safeMessage}</div>`
  );

  const text = `New Contact Message\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`;

  return send(toEmail, `Contact Form — ${safeSubject}`, html, text);
};
