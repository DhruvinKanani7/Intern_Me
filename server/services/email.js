import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const baseWrapper = (title, bodyHtml) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa;">
  <div style="background: #1a1a2e; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">InternCert</h1>
  </div>
  <div style="background: #ffffff; padding: 32px 24px; border: 1px solid #e5e5e5;">
    <h2 style="color: #1a1a2e; margin-top: 0;">${title}</h2>
    ${bodyHtml}
  </div>
  <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
    &copy; ${new Date().getFullYear()} InternCert. All rights reserved.
  </div>
</div>
`;

const send = async (to, subject, html) => {
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html
  });
};

export const sendVerificationEmail = async (toEmail, token) => {
  const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  const html = baseWrapper(
    'Verify Your Email',
    `<p style="color:#555;">Thanks for registering with InternCert. Please verify your email address to continue.</p>
     <p style="text-align:center; margin: 24px 0;">
       <a href="${link}" style="background:#4c6ef5; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Verify Email</a>
     </p>
     <p style="color:#999; font-size:12px;">This link expires in 24 hours. If the button doesn't work, copy this link: ${link}</p>`
  );
  return send(toEmail, 'Verify Your Email — InternCert', html);
};

export const sendEnrollmentConfirmation = async (
  toEmail,
  { name, internshipCode, internshipName, duration, startDate, endDate, categoryCode }
) => {
  const html = baseWrapper(
    'Enrollment Confirmed!',
    `<p style="color:#555;">Hi ${name}, congratulations on enrolling in <strong>${internshipName}</strong> (${duration} Month${duration > 1 ? 's' : ''}).</p>
     <p style="color:#555;">Duration: ${new Date(startDate).toDateString()} — ${new Date(endDate).toDateString()}</p>
     <div style="background:#f0f4ff; border: 2px solid #c9a227; border-radius: 8px; padding: 16px; text-align:center; margin: 24px 0;">
       <p style="margin:0 0 4px 0; color:#1a1a2e; font-size:13px; font-weight:bold;">YOUR UNIQUE INTERNSHIP CODE</p>
       <p style="margin:0; color:#1a1a2e; font-size:22px; font-weight:bold; letter-spacing:1px;">${internshipCode}</p>
     </div>
     <p style="color:#555; font-weight:bold;">For each task, post on LinkedIn in this EXACT format:</p>
     <pre style="background:#16213e; color:#fff; padding:16px; border-radius:8px; font-size:13px; white-space:pre-wrap;">#${categoryCode.toLowerCase()} ${internshipCode} task:1
[Your post content here]</pre>
     <p style="color:#999; font-size:12px;">Replace "task:1" with the number of the task you are submitting.</p>`
  );
  return send(toEmail, 'Enrollment Confirmed — InternCert', html);
};

export const sendTaskApproved = async (toEmail, { name, taskNumber, nextTask, isLastTask }) => {
  const bodyText = isLastTask
    ? `<p style="color:#555;">You completed the final task. Your certificate is being generated and you'll receive it by email shortly!</p>`
    : `<p style="color:#555;">Your next task is Task ${nextTask}. Log in to your dashboard to view the details.</p>`;
  const html = baseWrapper(
    `Task ${taskNumber} Approved ✅`,
    `<p style="color:#555;">Hi ${name}, great work! Your submission for Task ${taskNumber} has been approved.</p>${bodyText}`
  );
  return send(toEmail, `Task ${taskNumber} Approved — InternCert`, html);
};

export const sendTaskRejected = async (toEmail, { name, taskNumber, reason }) => {
  const html = baseWrapper(
    `Task ${taskNumber} Needs Revision`,
    `<p style="color:#555;">Hi ${name}, your submission for Task ${taskNumber} was not approved.</p>
     <p style="color:#555;"><strong>Reason:</strong> ${reason || 'Please review the task requirements and resubmit.'}</p>
     <p style="color:#555;">Log in to your dashboard to resubmit.</p>`
  );
  return send(toEmail, `Task ${taskNumber} Needs Revision — InternCert`, html);
};

export const sendCertificateEmail = async (toEmail, { name, certId, internshipName, pdfUrl, verifyUrl }) => {
  const html = baseWrapper(
    'Your Certificate is Ready! 🎓',
    `<p style="color:#555;">Congratulations ${name}! You've successfully completed <strong>${internshipName}</strong>.</p>
     <p style="color:#555;">Certificate ID: <strong>${certId}</strong></p>
     <p style="text-align:center; margin: 24px 0;">
       <a href="${pdfUrl}" style="background:#c9a227; color:#1a1a2e; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Download Certificate</a>
     </p>
     <p style="color:#999; font-size:12px;">Anyone can verify this certificate at: ${verifyUrl}</p>`
  );
  return send(toEmail, 'Your Certificate is Ready — InternCert', html);
};

export const sendPasswordReset = async (toEmail, token) => {
  const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const html = baseWrapper(
    'Reset Your Password',
    `<p style="color:#555;">We received a request to reset your password. Click below to set a new one.</p>
     <p style="text-align:center; margin: 24px 0;">
       <a href="${link}" style="background:#4c6ef5; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Reset Password</a>
     </p>
     <p style="color:#999; font-size:12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>`
  );
  return send(toEmail, 'Reset Your Password — InternCert', html);
};

export const sendContactMessageEmail = async ({ name, email, subject, message }) => {
  const toEmail = process.env.CONTACT_TO_EMAIL || process.env.EMAIL_FROM;
  if (!toEmail) return null;

  const html = baseWrapper(
    'New Contact Message',
    `<p style="color:#555;"><strong>Name:</strong> ${name}</p>
     <p style="color:#555;"><strong>Email:</strong> ${email}</p>
     <p style="color:#555;"><strong>Subject:</strong> ${subject}</p>
     <div style="margin-top:16px; padding:16px; background:#f7f7f7; border-radius:8px; color:#333; white-space:pre-wrap;">${message}</div>`
  );

  return send(toEmail, `Contact Form — ${subject}`, html);
};
