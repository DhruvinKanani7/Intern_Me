import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generateSync } from 'otplib';
import app from '../../index.js';
import env from '../../config/env.js';
import User from '../../models/User.js';
import Payment from '../../models/Payment.js';
import Enrollment from '../../models/Enrollment.js';
import Certificate from '../../models/Certificate.js';
import AuditLog from '../../models/AuditLog.js';
import Testimonial from '../../models/Testimonial.js';
import { generateMfaSetup } from '../../services/mfaService.js';
import {
  createTestUser,
  createTestAdmin,
  createTestInternship
} from '../helpers/seed.js';

const authHeader = (user) => {
  const token = jwt.sign(
    { id: String(user._id), role: user.role, token_version: user.token_version ?? 0 },
    process.env.JWT_SECRET || env.JWT_SECRET
  );
  return { Authorization: `Bearer ${token}` };
};

const signWebhook = (payload) => {
  const secret = env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
  const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
};

describe('Phase 7: Product-Contract Completion (F29, F30, F31, F35)', () => {
  // ── 7.1 Refund Lifecycle [F29] ───────────────────────────────────────────────
  describe('7.1: Refund Lifecycle, Policy Windows, and Admin Step-Up MFA', () => {
    it('requires admin MFA step-up to process a refund', async () => {
      const admin = await createTestAdmin({ college_email: 'admin.refundmfa@interncert.com' });
      const { secret } = await generateMfaSetup(admin);
      admin.mfa_secret = secret;
      admin.mfa_enabled = true;
      await admin.save();

      const student = await createTestUser();
      const internship = await createTestInternship();

      const enrollment = await Enrollment.create({
        user_id: student._id,
        internship_id: internship._id,
        internship_code: 'IC-REFUND-MFA',
        duration_months: 1,
        amount_paid: 999,
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        current_task: 1,
        total_tasks: 4
      });

      const payment = await Payment.create({
        user_id: student._id,
        internship_id: internship._id,
        enrollment_id: enrollment._id,
        razorpay_order_id: `order_test_${Date.now()}_mfa`,
        razorpay_payment_id: `pay_test_${Date.now()}_mfa`,
        amount: 999,
        status: 'paid',
        paid_at: new Date()
      });

      // 1. Without MFA token -> 403
      const noMfaRes = await request(app)
        .post(`/api/admin/payments/${payment._id}/refund`)
        .set(authHeader(admin))
        .send({ reason: 'Student cancelled within 7 days' });

      expect(noMfaRes.status).toBe(403);
      expect(noMfaRes.body.success).toBe(false);
      expect(noMfaRes.body.message).toMatch(/MFA verification required/i);

      // 2. With invalid MFA token -> 403
      const badMfaRes = await request(app)
        .post(`/api/admin/payments/${payment._id}/refund`)
        .set(authHeader(admin))
        .set('x-admin-mfa-token', '000000')
        .send({ reason: 'Student cancelled within 7 days' });

      expect(badMfaRes.status).toBe(403);
      expect(badMfaRes.body.success).toBe(false);

      // 3. With valid MFA token -> 200 OK
      const validTotp = generateSync({ secret: admin.mfa_secret });
      const successRes = await request(app)
        .post(`/api/admin/payments/${payment._id}/refund`)
        .set(authHeader(admin))
        .set('x-admin-mfa-token', validTotp)
        .send({ reason: 'Student cancelled within 7 days' });

      expect(successRes.status).toBe(200);
      expect(successRes.body.success).toBe(true);

      // Verify payment transitioned to 'refunded'
      const updatedPayment = await Payment.findById(payment._id);
      expect(updatedPayment.status).toBe('refunded');
      expect(updatedPayment.refunded_amount).toBe(999);

      // Verify enrollment transitioned to 'closed'
      const updatedEnrollment = await Enrollment.findById(enrollment._id);
      expect(updatedEnrollment.status).toBe('closed');

      // Verify audit log entry was written
      const auditLog = await AuditLog.findOne({
        target_id: payment._id,
        action: 'payment_refunded'
      });
      expect(auditLog).toBeDefined();
      expect(auditLog.actor_id.toString()).toBe(admin._id.toString());
      expect(auditLog.reason).toBe('Student cancelled within 7 days');
    });

    it('enforces 30-day refund policy window unless forced', async () => {
      const admin = await createTestAdmin({ college_email: 'admin.policy@interncert.com' });
      const { secret } = await generateMfaSetup(admin);
      admin.mfa_secret = secret;
      admin.mfa_enabled = true;
      await admin.save();

      const student = await createTestUser();
      const internship = await createTestInternship();

      // Payment created 45 days ago
      const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      const payment = await Payment.create({
        user_id: student._id,
        internship_id: internship._id,
        razorpay_order_id: `order_test_${Date.now()}_old`,
        razorpay_payment_id: `pay_test_${Date.now()}_old`,
        amount: 999,
        status: 'paid',
        paid_at: oldDate,
        created_at: oldDate
      });

      const validTotp = generateSync({ secret: admin.mfa_secret });

      // Normal refund rejected due to expired window
      const res = await request(app)
        .post(`/api/admin/payments/${payment._id}/refund`)
        .set(authHeader(admin))
        .set('x-admin-mfa-token', validTotp)
        .send({ reason: 'Too late' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Refund window has expired/i);

      // Payment remains paid
      const pAfter = await Payment.findById(payment._id);
      expect(pAfter.status).toBe('paid');

      // Admin override with force: true succeeds
      const forceTotp = generateSync({ secret: admin.mfa_secret });
      const forceRes = await request(app)
        .post(`/api/admin/payments/${payment._id}/refund`)
        .set(authHeader(admin))
        .set('x-admin-mfa-token', forceTotp)
        .send({ reason: 'Special executive approval', force: true });

      expect(forceRes.status).toBe(200);
      const pForced = await Payment.findById(payment._id);
      expect(pForced.status).toBe('refunded');
    });

    it('handles partial refunds correctly', async () => {
      const admin = await createTestAdmin({ college_email: 'admin.partial@interncert.com' });
      const { secret } = await generateMfaSetup(admin);
      admin.mfa_secret = secret;
      admin.mfa_enabled = true;
      await admin.save();

      const student = await createTestUser();
      const internship = await createTestInternship();

      const payment = await Payment.create({
        user_id: student._id,
        internship_id: internship._id,
        razorpay_order_id: `order_test_${Date.now()}_part`,
        razorpay_payment_id: `pay_test_${Date.now()}_part`,
        amount: 1000,
        status: 'paid',
        paid_at: new Date()
      });

      const totp = generateSync({ secret: admin.mfa_secret });
      const res = await request(app)
        .post(`/api/admin/payments/${payment._id}/refund`)
        .set(authHeader(admin))
        .set('x-admin-mfa-token', totp)
        .send({ amount: 400, reason: 'Partial fee adjustment' });

      expect(res.status).toBe(200);
      const pUpdated = await Payment.findById(payment._id);
      expect(pUpdated.status).toBe('partially_refunded');
      expect(pUpdated.refunded_amount).toBe(400);
    });

    it('processes signed refund.processed webhook and closes active enrollment', async () => {
      const student = await createTestUser();
      const internship = await createTestInternship();

      const enrollment = await Enrollment.create({
        user_id: student._id,
        internship_id: internship._id,
        internship_code: 'IC-WEBHOOK-RFND',
        duration_months: 1,
        amount_paid: 999,
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        current_task: 1,
        total_tasks: 4
      });

      const orderId = `order_hook_rfnd_${Date.now()}`;
      const paymentId = `pay_hook_rfnd_${Date.now()}`;
      const payment = await Payment.create({
        user_id: student._id,
        internship_id: internship._id,
        enrollment_id: enrollment._id,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        amount: 999,
        status: 'paid',
        paid_at: new Date()
      });

      const webhookPayload = {
        entity: 'event',
        account_id: 'acc_test',
        event: 'refund.processed',
        contains: ['payment', 'refund'],
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: orderId,
              amount: 99900,
              status: 'refunded'
            }
          },
          refund: {
            entity: {
              id: `rfnd_${Date.now()}`,
              amount: 99900,
              status: 'processed'
            }
          }
        }
      };

      const rawBody = JSON.stringify(webhookPayload);
      const signature = signWebhook(rawBody);

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('refund_recorded');

      const pInDb = await Payment.findById(payment._id);
      expect(pInDb.status).toBe('refunded');

      const eInDb = await Enrollment.findById(enrollment._id);
      expect(eInDb.status).toBe('closed');
    });
  });

  // ── 7.3 Real Metrics and Testimonials [F31] ─────────────────────────────────
  describe('7.3: Real Stats and Approved Testimonials', () => {
    it('GET /api/stats aggregates real database counts', async () => {
      const student1 = await createTestUser();
      const student2 = await createTestUser();
      const internship = await createTestInternship();

      const res = await request(app).get('/api/stats');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data || res.body;
      expect(data.totalStudents).toBeGreaterThanOrEqual(2);
      expect(data.totalPrograms).toBeGreaterThanOrEqual(1);
      expect(typeof data.certificatesIssued).toBe('number');
      expect(typeof data.averageRating).toBe('number');
    });

    it('GET /api/testimonials returns only approved testimonials', async () => {
      // Create one approved and one pending testimonial
      const approved = await Testimonial.create({
        name: 'Approved Student',
        role: 'Software Engineer',
        company: 'Google',
        rating: 5,
        text: 'Authentic program and great learning.',
        is_approved: true
      });

      const pending = await Testimonial.create({
        name: 'Pending Student',
        role: 'Intern',
        rating: 4,
        text: 'Waiting for moderation.',
        is_approved: false
      });

      const res = await request(app).get('/api/testimonials');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const list = res.body.data || res.body;
      const names = list.map((t) => t.name);
      expect(names).toContain('Approved Student');
      expect(names).not.toContain('Pending Student');
    });

    it('allows admin to manage and approve testimonials', async () => {
      const admin = await createTestAdmin();
      const testimonial = await Testimonial.create({
        name: 'Review Candidate',
        role: 'Cloud Architect',
        rating: 5,
        text: 'Real-world deployment experience.',
        is_approved: false
      });

      // Admin approves testimonial
      const approveRes = await request(app)
        .post(`/api/admin/testimonials/${testimonial._id}/approve`)
        .set(authHeader(admin));

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);

      const inDb = await Testimonial.findById(testimonial._id);
      expect(inDb.is_approved).toBe(true);

      // Testimonial now appears in public endpoint
      const pubRes = await request(app).get('/api/testimonials');
      const list = pubRes.body.data || pubRes.body;
      expect(list.some((t) => t.name === 'Review Candidate')).toBe(true);

      // Admin deletes testimonial
      const delRes = await request(app)
        .delete(`/api/admin/testimonials/${testimonial._id}`)
        .set(authHeader(admin));

      expect(delRes.status).toBe(200);
      const deleted = await Testimonial.findById(testimonial._id);
      expect(deleted).toBeNull();
    });
  });

  // ── 7.4 Profile Updates [F35] ───────────────────────────────────────────────
  describe('7.4: User Profile Updates', () => {
    it('allows student to update profile and persists changes', async () => {
      const student = await createTestUser();

      const updateRes = await request(app)
        .put('/api/auth/profile')
        .set(authHeader(student))
        .send({
          full_name: 'Dr. Jane Developer',
          college_name: 'IIT Kharagpur',
          course: 'Artificial Intelligence',
          year_of_study: 3
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);

      // Verify GET /api/auth/me returns updated profile
      const meRes = await request(app)
        .get('/api/auth/me')
        .set(authHeader(student));

      expect(meRes.status).toBe(200);
      const profile = meRes.body.data || meRes.body;
      expect(profile.full_name).toBe('Dr. Jane Developer');
      expect(profile.college_name).toBe('IIT Kharagpur');
      expect(profile.course).toBe('Artificial Intelligence');
      expect(profile.year_of_study).toBe(3);
    });
  });
});
