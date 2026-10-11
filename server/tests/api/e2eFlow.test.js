import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../../index.js';
import User from '../../models/User.js';
import Internship from '../../models/Internship.js';
import Enrollment from '../../models/Enrollment.js';
import Payment from '../../models/Payment.js';
import Certificate from '../../models/Certificate.js';
import Outbox from '../../models/Outbox.js';
import env from '../../config/env.js';
import certificateGenerator from '../../services/certificateGenerator.js';
import { processOutboxJobs } from '../../services/outboxWorker.js';

describe('Phase 8.4: Complete End-to-End User Journey (Testing Pyramid Integration)', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Internship.deleteMany({});
    await Enrollment.deleteMany({});
    await Payment.deleteMany({});
    await Certificate.deleteMany({});
    await Outbox.deleteMany({});
  });

  it('runs complete lifecycle: register -> verify email -> enroll -> pay -> submit task -> approve -> issue certificate -> verify QR', async () => {
    // 0. Seed an Internship program
    const program = await Internship.create({
      category_code: 'WD',
      category_name: 'Full Stack Web Development',
      description: 'Hands-on web engineering',
      price_1m: 999,
      price_3m: 1999,
      price_5m: 2999,
      total_tasks_1m: 1, // 1 task for fast test capstone completion
      total_tasks_3m: 4,
      total_tasks_5m: 8,
      is_active: true,
    });

    // 1. Student Registers
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Priya Sharma',
        college_email: 'priya@college.edu',
        password: 'Password123!',
        enrollment_no: 'ENR-2026-001',
      });

    expect(registerRes.status).toBe(201);

    // 2. Obtain verification token and verify email
    const verificationToken = 'priya_verification_test_token_128bit';
    const userInDb = await User.findOne({ college_email: 'priya@college.edu' });
    expect(userInDb).not.toBeNull();
    userInDb.email_verification_token = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    await userInDb.save();

    // Verify email via endpoint
    const verifyEmailRes = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: verificationToken });

    expect(verifyEmailRes.status).toBe(200);

    // 3. Student Logs In
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        college_email: 'priya@college.edu',
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(200);
    const studentCookies = loginRes.headers['set-cookie'];
    expect(studentCookies).toBeDefined();

    const xsrfCookie = studentCookies
      .find((c) => c.startsWith('XSRF-TOKEN='))
      ?.split(';')[0]
      .split('=')[1];
    expect(xsrfCookie).toBeDefined();

    // 4. Create Order for 1-month program
    const orderRes = await request(app)
      .post('/api/enroll/create-order')
      .set('Cookie', studentCookies)
      .set('X-CSRF-Token', xsrfCookie)
      .send({
        categoryCode: 'WD',
        duration: 1,
      });

    expect(orderRes.status).toBe(200);
    const { orderId, amount } = orderRes.body.data;
    expect(orderId).toBeDefined();

    // 5. Simulate Razorpay payment verification
    const mockPaymentId = `pay_mock_${Date.now()}`;
    const signaturePayload = `${orderId}|${mockPaymentId}`;
    const validSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(signaturePayload)
      .digest('hex');

    const paymentRes = await request(app)
      .post('/api/enroll/verify-payment')
      .set('Cookie', studentCookies)
      .set('X-CSRF-Token', xsrfCookie)
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: validSignature,
      });

    expect(paymentRes.status).toBe(200);
    expect(paymentRes.body.success).toBe(true);

    // 6. Check Active Enrollment
    const myEnrollmentsRes = await request(app)
      .get('/api/enroll/my')
      .set('Cookie', studentCookies);

    expect(myEnrollmentsRes.status).toBe(200);
    const myEnrollments = myEnrollmentsRes.body.data || myEnrollmentsRes.body;
    expect(myEnrollments.length).toBe(1);
    const activeEnrollment = myEnrollments[0];
    expect(activeEnrollment.status).toBe('active');

    // 7. Get Tasks & Submit Task 1 Assignment
    const tasksRes = await request(app)
      .get(`/api/tasks/${activeEnrollment._id}`)
      .set('Cookie', studentCookies);

    expect(tasksRes.status).toBe(200);
    const taskList = tasksRes.body.data || tasksRes.body;
    expect(taskList.length).toBe(1);

    const submitRes = await request(app)
      .post(`/api/tasks/${activeEnrollment._id}/submit`)
      .set('Cookie', studentCookies)
      .set('X-CSRF-Token', xsrfCookie)
      .send({
        linkedin_url: 'https://www.linkedin.com/posts/priyasharma_interncert_fullstack-activity-123456789',
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);

    // 8. Admin Logs in and Approves Task
    const adminUser = await User.create({
      full_name: 'Admin Supervisor',
      college_email: 'admin@college.edu',
      password: 'AdminPass123!',
      enrollment_no: 'ADMIN-001',
      role: 'admin',
      email_verified: true,
    });

    const realAdminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        college_email: 'admin@college.edu',
        password: 'AdminPass123!',
      });

    expect(realAdminLogin.status).toBe(200);
    const adminCookies = realAdminLogin.headers['set-cookie'];
    const adminXsrf = adminCookies
      .find((c) => c.startsWith('XSRF-TOKEN='))
      ?.split(';')[0]
      .split('=')[1];

    const pendingRes = await request(app)
      .get('/api/admin/submissions/pending')
      .set('Cookie', adminCookies);

    expect(pendingRes.status).toBe(200);
    const pendingList = pendingRes.body.data || pendingRes.body;
    expect(pendingList.length).toBe(1);
    const submissionId = pendingList[0]._id;

    // Approve the submission
    const approveRes = await request(app)
      .post(`/api/admin/submissions/${submissionId}/review`)
      .set('Cookie', adminCookies)
      .set('X-CSRF-Token', adminXsrf)
      .send({
        status: 'approved',
        notes: 'Excellent capstone demo and repository link!',
      });

    expect(approveRes.status).toBe(200);

    // 9. Process Outbox job to issue certificate with 128-bit Opaque Code
    vi.spyOn(certificateGenerator, 'generate').mockImplementation(async (enrollmentId) => {
      const enr = await Enrollment.findById(enrollmentId);
      const u = await User.findById(enr.user_id);
      const intern = await Internship.findById(enr.internship_id);
      return await Certificate.create({
        enrollment_id: enr._id,
        cert_id: `CERT-TEST-${enr._id}`,
        internship_code: enr.internship_code,
        full_name: u.full_name,
        internship_name: intern.category_name,
        duration: '1 Month',
        start_date: enr.start_date,
        end_date: enr.end_date,
        qr_code_url: 'https://interncert.example.com/verify/test',
        pdf_url: 'https://res.cloudinary.com/test/cert.pdf',
      });
    });

    const outboxResult = await processOutboxJobs();
    expect(outboxResult.processedCount).toBe(1);

    const cert = await Certificate.findOne({ enrollment_id: activeEnrollment._id });
    expect(cert).not.toBeNull();
    expect(cert.is_revoked).toBe(false);
    expect(cert.verification_code).toBeDefined();
    expect(cert.verification_code.length).toBeGreaterThanOrEqual(20);

    // 10. Public Verification Portal lookup (unauthenticated)
    const publicVerifyRes = await request(app).get(`/api/verify/${cert.verification_code}`);
    expect(publicVerifyRes.status).toBe(200);
    expect(publicVerifyRes.body.valid).toBe(true);
    expect(publicVerifyRes.body.certificate.name).toBe('Priya Sharma');
    expect(publicVerifyRes.body.certificate.internship).toBe('Full Stack Web Development');

    // 11. Student Certificate Download via Signed URL
    const downloadRes = await request(app)
      .get(`/api/certificates/${cert._id}/download`)
      .set('Cookie', studentCookies);

    expect(downloadRes.status).toBe(200);
    const downloadData = downloadRes.body.data || downloadRes.body;
    expect(downloadData.url).toBeDefined();
    expect(downloadData.url).toContain('cloudinary.com');
  });
});
