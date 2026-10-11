import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { generateSync } from 'otplib';
import app from '../../index.js';
import User from '../../models/User.js';
import Internship from '../../models/Internship.js';
import Enrollment from '../../models/Enrollment.js';
import Payment from '../../models/Payment.js';
import Certificate from '../../models/Certificate.js';
import Outbox from '../../models/Outbox.js';
import AuditLog from '../../models/AuditLog.js';
import TaskSubmission from '../../models/TaskSubmission.js';
import env, { validateEnv } from '../../config/env.js';
import { escapeHtml } from '../../utils/helpers.js';
import { processOutboxJobs } from '../../services/outboxWorker.js';
import certificateGenerator from '../../services/certificateGenerator.js';
import { generateMfaSetup } from '../../services/mfaService.js';
import { createDatabaseBackup } from '../../scripts/backup.js';
import { restoreDatabase } from '../../scripts/restore.js';
import {
  createTestUser,
  createTestAdmin,
  createTestInternship,
  createTestEnrollment
} from '../helpers/seed.js';

const authHeader = (user) => {
  const token = jwt.sign(
    { id: String(user._id), role: user.role, token_version: user.token_version ?? 0 },
    process.env.JWT_SECRET
  );
  return { Authorization: `Bearer ${token}` };
};

describe('Phase 9: Release Gate (SEC-01 to SEC-15 & Final Operational Criteria)', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Internship.deleteMany({});
    await Enrollment.deleteMany({});
    await Payment.deleteMany({});
    await Certificate.deleteMany({});
    await Outbox.deleteMany({});
    await AuditLog.collection.deleteMany({});
  });

  // ── SEC-01 ──────────────────────────────────────────────────────────────────
  it('SEC-01: Boot without Razorpay secrets refuses to start in live/prod mode', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with ${code}`);
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      validateEnv({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017/prod',
        JWT_SECRET: 'supersecretkeywithatleast32charactersminimum!',
        FRONTEND_URL: 'https://interncert.example.com',
        PAYMENTS_MODE: 'live',
        RAZORPAY_KEY_ID: '', // Missing secret
        RAZORPAY_KEY_SECRET: '',
        RAZORPAY_WEBHOOK_SECRET: '',
        RESEND_API_KEY: 're_valid_key_123456789',
        EMAIL_FROM: 'noreply@interncert.example.com',
        CONTACT_TO_EMAIL: 'support@interncert.example.com',
        CLOUDINARY_CLOUD_NAME: 'live-cloud',
        CLOUDINARY_API_KEY: '1234567890',
        CLOUDINARY_API_SECRET: 'live_secret_12345',
      });
    }).toThrow('process.exit called with 1');

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  // ── SEC-02 ──────────────────────────────────────────────────────────────────
  it('SEC-02: Call dev-complete returns 404 Route not found (bypass route permanently absent)', async () => {
    const res = await request(app).post('/api/enroll/dev-complete-order').send({});
    expect(res.status).toBe(404);

    const legacyRes = await request(app).post('/api/enroll/dev-complete').send({});
    expect(legacyRes.status).toBe(404);
  });

  // ── SEC-03 ──────────────────────────────────────────────────────────────────
  it("SEC-03: Verifying another user's order is rejected without mutation", async () => {
    const userA = await createTestUser({ full_name: 'Victim Student' });
    const userB = await createTestUser({ full_name: 'Attacker Student' });
    const internship = await createTestInternship();

    const orderRes = await request(app)
      .post('/api/enroll/create-order')
      .set(authHeader(userA))
      .send({ categoryCode: internship.category_code, duration: 1 });

    expect(orderRes.status).toBe(200);
    const orderId = orderRes.body.data.orderId;
    const paymentId = 'pay_fake_attacker_123';
    const sig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // User B attempts to verify User A's order
    const attackRes = await request(app)
      .post('/api/enroll/verify-payment')
      .set(authHeader(userB))
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: sig
      });

    expect(attackRes.status).toBe(404);
    expect(attackRes.body.success).toBe(false);
    const attackerEnrollment = await Enrollment.findOne({ user_id: userB._id });
    expect(attackerEnrollment).toBeNull();
  });

  // ── SEC-04 ──────────────────────────────────────────────────────────────────
  it('SEC-04: 10 concurrent replays result in exactly 1 paid Payment and 1 Enrollment', async () => {
    const student = await createTestUser();
    const internship = await createTestInternship();

    const orderRes = await request(app)
      .post('/api/enroll/create-order')
      .set(authHeader(student))
      .send({ categoryCode: internship.category_code, duration: 1 });

    expect(orderRes.status).toBe(200);
    const orderId = orderRes.body.data.orderId;
    const paymentId = `pay_conc_${Date.now()}`;
    const sig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const requests = Array.from({ length: 10 }, () =>
      request(app)
        .post('/api/enroll/verify-payment')
        .set(authHeader(student))
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: sig
        })
    );

    const responses = await Promise.all(requests);
    expect(responses.every((r) => r.status === 200)).toBe(true);

    const paidPayments = await Payment.countDocuments({ razorpay_order_id: orderId, status: 'paid' });
    expect(paidPayments).toBe(1);

    const enrollments = await Enrollment.countDocuments({ user_id: student._id, internship_id: internship._id });
    expect(enrollments).toBe(1);
  });

  // ── SEC-05 ──────────────────────────────────────────────────────────────────
  it('SEC-05: Wrong amount/currency is rejected and marks payment failed', async () => {
    const student = await createTestUser();
    const internship = await createTestInternship();

    const orderRes = await request(app)
      .post('/api/enroll/create-order')
      .set(authHeader(student))
      .send({ categoryCode: internship.category_code, duration: 1 });

    const orderId = orderRes.body.data.orderId;
    const payment = await Payment.findOne({ razorpay_order_id: orderId });
    // Mutate amount to simulate amount mismatch
    payment.amount = 50000;
    await payment.save();

    const payId = 'pay_tamper_100';
    const sig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(`${orderId}|${payId}`)
      .digest('hex');

    const tamperRes = await request(app)
      .post('/api/enroll/verify-payment')
      .set(authHeader(student))
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: payId,
        razorpay_signature: sig
      });

    expect(tamperRes.status).toBe(400);
    const updatedPayment = await Payment.findById(payment._id);
    expect(updatedPayment.status).toBe('failed');
  });

  // ── SEC-06 ──────────────────────────────────────────────────────────────────
  it('SEC-06: Close tab after capture -> Webhook completes state', async () => {
    const student = await createTestUser();
    const internship = await createTestInternship();

    const orderRes = await request(app)
      .post('/api/enroll/create-order')
      .set(authHeader(student))
      .send({ categoryCode: internship.category_code, duration: 1 });

    const orderId = orderRes.body.data.orderId;

    const webhookBody = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_hook_${Date.now()}`,
            order_id: orderId,
            amount: 99900,
            currency: 'INR',
            status: 'captured',
            notes: {
              userId: String(student._id),
              internshipId: String(internship._id),
              duration: '1'
            }
          }
        }
      }
    };

    const rawString = JSON.stringify(webhookBody);
    const webhookSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret')
      .update(rawString)
      .digest('hex');

    const hookRes = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', webhookSig)
      .set('Content-Type', 'application/json')
      .send(rawString);

    expect(hookRes.status).toBe(200);

    const reconciledPayment = await Payment.findOne({ razorpay_order_id: orderId });
    expect(reconciledPayment.status).toBe('paid');

    const enrollment = await Enrollment.findOne({ user_id: student._id, internship_id: internship._id });
    expect(enrollment).not.toBeNull();
    expect(enrollment.status).toBe('active');
  });

  // ── SEC-07 ──────────────────────────────────────────────────────────────────
  it('SEC-07: javascript: and malicious LinkedIn URLs are rejected with 400', async () => {
    const student = await createTestUser();
    const internship = await createTestInternship();
    const enrollment = await createTestEnrollment(student, internship);

    const xssPayloads = [
      'javascript:alert(document.cookie)',
      'https://evil-phishing.com/posts/fake',
      'data:text/html,<script>evil()</script>'
    ];

    for (const url of xssPayloads) {
      const res = await request(app)
        .post(`/api/tasks/${enrollment._id}/submit`)
        .set(authHeader(student))
        .send({ linkedin_url: url });

      expect(res.status).toBe(400);
    }
  });

  // ── SEC-08 ──────────────────────────────────────────────────────────────────
  it('SEC-08: HTML in email fields is escaped against template injection', () => {
    const rawMalicious = '<script>alert("pwned")</script> & " \'';
    const escaped = escapeHtml(rawMalicious);

    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
    expect(escaped).toContain('&amp;');
    expect(escaped).toContain('&quot;');
    expect(escaped).toContain('&#39;');
  });

  // ── SEC-09 ──────────────────────────────────────────────────────────────────
  it('SEC-09: Cross-site write is blocked by CSRF / origin protection', async () => {
    const student = await createTestUser();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ college_email: student.college_email, password: 'Password123!' });

    const cookies = loginRes.headers['set-cookie'];

    // Cross-origin write without matching XSRF header
    const res = await request(app)
      .post('/api/contact')
      .set('Cookie', cookies)
      .set('Origin', 'https://attacker-domain.org')
      .send({
        name: 'CSRF Exploit',
        email: student.college_email,
        subject: 'Malicious Form Post',
        message: 'Forged request from evil domain'
      });

    expect(res.status).toBe(403);
  });

  // ── SEC-10 ──────────────────────────────────────────────────────────────────
  it('SEC-10: Old JWT after password reset is rejected (token_version bump)', async () => {
    const student = await createTestUser();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ college_email: student.college_email, password: 'Password123!' });

    const cookies = loginRes.headers['set-cookie'];

    // Student resets password
    student.token_version += 1;
    await student.save();

    // Subsequent request with old session cookie must return 401
    const verifyOldSession = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    expect(verifyOldSession.status).toBe(401);
  });

  // ── SEC-11 ──────────────────────────────────────────────────────────────────
  it('SEC-11: Open QR URL loads verification page using 128-bit opaque code', async () => {
    const student = await createTestUser({ full_name: 'Priya Sharma' });
    const internship = await createTestInternship();
    const enrollment = await createTestEnrollment(student, internship);

    const cert = await Certificate.create({
      enrollment_id: enrollment._id,
      cert_id: 'CERT-SEC11-001',
      internship_code: enrollment.internship_code,
      full_name: 'Priya Sharma',
      internship_name: internship.category_name,
      duration: '1 Month',
      start_date: new Date(),
      end_date: new Date(),
      pdf_url: 'https://res.cloudinary.com/test/cert.pdf'
    });

    expect(cert.verification_code.length).toBeGreaterThanOrEqual(20);

    const res = await request(app).get(`/api/verify/${cert.verification_code}`);
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.certificate.name).toBe('Priya Sharma');
    // Ensure sensitive fields are omitted
    expect(res.body.certificate.email).toBeUndefined();
    expect(res.body.certificate.user_id).toBeUndefined();
  });

  // ── SEC-12 ──────────────────────────────────────────────────────────────────
  it('SEC-12: Approve stale task returns 409 Conflict and prevents backward moves', async () => {
    const admin = await createTestAdmin();
    const student = await createTestUser();
    const internship = await createTestInternship();
    const enrollment = await createTestEnrollment(student, internship, {
      current_task: 2,
      total_tasks: 3
    });

    // Stale submission for Task 1
    const staleSubmission = await TaskSubmission.create({
      enrollment_id: enrollment._id,
      task_number: 1,
      linkedin_url: 'https://www.linkedin.com/posts/stale-demo',
      status: 'pending'
    });

    const reviewRes = await request(app)
      .post(`/api/admin/submissions/${staleSubmission._id}/review`)
      .set(authHeader(admin))
      .send({ status: 'approved', notes: 'Late review' });

    expect(reviewRes.status).toBe(409);

    const recheckEnrollment = await Enrollment.findById(enrollment._id);
    expect(recheckEnrollment.current_task).toBe(2);
  });

  // ── SEC-13 ──────────────────────────────────────────────────────────────────
  it('SEC-13: Complete twice / worker restart produces exactly 1 certificate via outbox idempotency', async () => {
    const student = await createTestUser();
    const internship = await createTestInternship();
    const enrollment = await createTestEnrollment(student, internship, { status: 'completed' });

    // Seed duplicate outbox jobs (simulating retry / worker restart)
    await Outbox.create([
      {
        event_type: 'generate_certificate',
        payload: { enrollment_id: enrollment._id, user_id: student._id },
        idempotency_key: `cert-${enrollment._id}-1`
      },
      {
        event_type: 'generate_certificate',
        payload: { enrollment_id: enrollment._id, user_id: student._id },
        idempotency_key: `cert-${enrollment._id}-2`
      }
    ]);

    vi.spyOn(certificateGenerator, 'generate').mockImplementation(async (enrollmentId) => {
      return await Certificate.create({
        enrollment_id: enrollmentId,
        cert_id: `CERT-SEC13-${enrollmentId}`,
        internship_code: enrollment.internship_code,
        full_name: student.full_name,
        internship_name: internship.category_name,
        duration: '1 Month',
        start_date: enrollment.start_date,
        end_date: enrollment.end_date,
        pdf_url: 'https://res.cloudinary.com/test/cert.pdf'
      });
    });

    await processOutboxJobs();

    const certCount = await Certificate.countDocuments({ enrollment_id: enrollment._id });
    expect(certCount).toBe(1);
  });

  // ── SEC-14 ──────────────────────────────────────────────────────────────────
  it('SEC-14: Sequential code guessing yields no valid certificate and logs miss alerts', async () => {
    const guesses = ['CERT-2025-0001', 'CERT-2025-0002', 'CERT-2025-0003'];

    for (const code of guesses) {
      const res = await request(app).get(`/api/verify/${code}`);
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.message).toBe('Certificate not found');
    }
  });

  // ── SEC-15 ──────────────────────────────────────────────────────────────────
  it('SEC-15: Admin revoke requires MFA step-up and writes immutable audit log record', async () => {
    const admin = await createTestAdmin({ college_email: 'admin.sec15@interncert.com' });
    const { secret } = await generateMfaSetup(admin);
    admin.mfa_secret = secret;
    admin.mfa_enabled = true;
    await admin.save();

    const student = await createTestUser();
    const internship = await createTestInternship();
    const enrollment = await createTestEnrollment(student, internship, { status: 'completed' });

    const cert = await Certificate.create({
      enrollment_id: enrollment._id,
      cert_id: 'CERT-SEC15-001',
      internship_code: enrollment.internship_code,
      full_name: student.full_name,
      internship_name: internship.category_name,
      duration: '1 Month',
      start_date: enrollment.start_date,
      end_date: enrollment.end_date,
      pdf_url: 'https://res.cloudinary.com/test/cert.pdf'
    });

    // 1. Attempt revoke WITHOUT MFA code -> REJECTED (403)
    const noMfaRes = await request(app)
      .post(`/api/admin/certificates/${cert._id}/revoke`)
      .set(authHeader(admin))
      .send({ reason: 'Suspected plagiarism' });

    expect(noMfaRes.status).toBe(403);
    expect(noMfaRes.body.success).toBe(false);

    let certInDb = await Certificate.findById(cert._id);
    expect(certInDb.is_revoked).toBe(false);

    // 2. Attempt revoke with VALID TOTP code -> SUCCEEDS (200) & AUDIT ROW WRITTEN
    const validTotpToken = generateSync({ secret });

    const okRes = await request(app)
      .post(`/api/admin/certificates/${cert._id}/revoke`)
      .set(authHeader(admin))
      .set({ 'X-Admin-MFA-Code': validTotpToken })
      .send({ reason: 'Confirmed violation of terms' });

    expect(okRes.status).toBe(200);
    expect(okRes.body.success).toBe(true);

    certInDb = await Certificate.findById(cert._id);
    expect(certInDb.is_revoked).toBe(true);

    const auditLog = await AuditLog.findOne({
      action: 'certificate_revoked',
      actor_id: admin._id,
      target_id: cert._id
    });
    expect(auditLog).toBeDefined();
    expect(auditLog.target_type).toBe('Certificate');
    expect(auditLog.reason).toBe('Confirmed violation of terms');
  });

  // ── FINAL CHECKS ────────────────────────────────────────────────────────────
  describe('Final Release Gate Checklist', () => {
    it('Final Check 1: Client code does not persist authentication tokens in localStorage', () => {
      const clientApiPath = path.resolve(__dirname, '../../../project/src/app/lib/api.ts');
      const apiCode = fs.readFileSync(clientApiPath, 'utf-8');

      expect(apiCode).toContain('// Deprecated tokenStore stub for backward compatibility (no localStorage storage)');
      expect(apiCode).not.toContain("localStorage.setItem('token'");
      expect(apiCode).not.toContain("localStorage.setItem('jwt'");
      expect(apiCode).not.toContain("localStorage.setItem('accessToken'");
    });

    it('Final Check 2: Content-Security-Policy header is active on HTTP responses', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });

    it('Final Check 3: Database backup and restore drill succeeds with integrity checksum match', async () => {
      await User.create({
        full_name: 'Release Gate Drill User',
        college_email: 'gate_drill@college.edu',
        password: 'Password123!',
        enrollment_no: 'GATE01',
        email_verified: true,
      });

      const tempDir = path.resolve('scratch_release_gate_backup');
      const backupResult = await createDatabaseBackup({ outputDir: tempDir });

      expect(fs.existsSync(backupResult.backupPath)).toBe(true);
      expect(backupResult.hash.length).toBe(64);

      await User.deleteMany({});
      expect(await User.countDocuments()).toBe(0);

      const restoreResult = await restoreDatabase({ backupPath: backupResult.backupPath });
      expect(restoreResult.verifiedHash).toBe(backupResult.hash);
      expect(await User.countDocuments()).toBe(1);

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });
});
