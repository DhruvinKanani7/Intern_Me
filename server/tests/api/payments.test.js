import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import app from '../../index.js';
import Payment from '../../models/Payment.js';
import Enrollment from '../../models/Enrollment.js';
import { validateEnv } from '../../config/env.js';
import { createTestUser, createTestInternship } from '../helpers/seed.js';

const authHeader = (user) => {
  const token = jwt.sign(
    { id: String(user._id), role: user.role, token_version: user.token_version ?? 0 },
    process.env.JWT_SECRET
  );
  return { Authorization: `Bearer ${token}` };
};

const createValidPaymentSignature = (orderId, paymentId) => {
  const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
  return crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
};

const createValidWebhookSignature = (bodyString) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
  return crypto
    .createHmac('sha256', secret)
    .update(bodyString)
    .digest('hex');
};

describe('Phase 1: Payment Integrity (SEC-01 to SEC-06)', () => {
  // ── SEC-01: Boot without Razorpay secrets ──────────────────────────────────
  it('SEC-01: Boot without Razorpay secrets refuses to start in live mode', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with ${code}`);
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      validateEnv({
        NODE_ENV: 'development',
        PAYMENTS_MODE: 'live',
        MONGODB_URI: 'mongodb://localhost:27017/test',
        JWT_SECRET: 'a-super-secret-key-that-is-at-least-32-chars-long',
        FRONTEND_URL: 'http://localhost:5173',
        RAZORPAY_KEY_ID: '', // Missing
        RAZORPAY_KEY_SECRET: ''
      });
    }).toThrow('process.exit called with 1');

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  // ── SEC-02: Call dev-complete route absent ─────────────────────────────────
  it('SEC-02: Call dev-complete returns 404 Route not found', async () => {
    const user = await createTestUser();

    const res = await request(app)
      .post('/api/enroll/dev-complete-order')
      .set(authHeader(user))
      .send({ orderId: 'order_test_123' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Route not found');
  });

  // ── SEC-03: Verify another user's order ────────────────────────────────────
  it("SEC-03: Verifying another user's order is rejected without mutation", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const internship = await createTestInternship();

    // User A creates order
    const orderRes = await request(app)
      .post('/api/enroll/create-order')
      .set(authHeader(userA))
      .send({ categoryCode: internship.category_code, duration: 1 });

    expect(orderRes.status).toBe(200);
    const orderId = orderRes.body.data.orderId;
    const paymentId = 'pay_fake_attacker_123';
    const signature = createValidPaymentSignature(orderId, paymentId);

    // User B tries to verify User A's order
    const attackRes = await request(app)
      .post('/api/enroll/verify-payment')
      .set(authHeader(userB))
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature
      });

    expect(attackRes.status).toBe(404);
    expect(attackRes.body.success).toBe(false);

    // Assert no enrollment created for User B
    const userBEnrollment = await Enrollment.findOne({ user_id: userB._id });
    expect(userBEnrollment).toBeNull();

    // Assert Payment remains in 'created' state owned by User A
    const payment = await Payment.findOne({ razorpay_order_id: orderId });
    expect(payment.status).toBe('created');
    expect(String(payment.user_id)).toBe(String(userA._id));
  });

  // ── SEC-04: 10 Concurrent Replays ──────────────────────────────────────────
  it('SEC-04: 10 concurrent replays result in exactly 1 paid Payment and 1 Enrollment', async () => {
    const user = await createTestUser();
    const internship = await createTestInternship();

    const orderRes = await request(app)
      .post('/api/enroll/create-order')
      .set(authHeader(user))
      .send({ categoryCode: internship.category_code, duration: 1 });

    const orderId = orderRes.body.data.orderId;
    const paymentId = `pay_${Date.now()}`;
    const signature = createValidPaymentSignature(orderId, paymentId);

    // Dispatch 10 concurrent verification requests simultaneously
    const requests = Array.from({ length: 10 }, () =>
      request(app)
        .post('/api/enroll/verify-payment')
        .set(authHeader(user))
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature
        })
    );

    const responses = await Promise.all(requests);

    // All requests should return 200 (either created or idempotent replay response)
    responses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // Verify database invariants: exactly 1 paid payment, exactly 1 enrollment
    const payments = await Payment.find({ razorpay_order_id: orderId });
    expect(payments.length).toBe(1);
    expect(payments[0].status).toBe('paid');

    const enrollments = await Enrollment.find({
      user_id: user._id,
      internship_id: internship._id
    });
    expect(enrollments.length).toBe(1);
  });

  // ── SEC-05: Wrong amount/currency ──────────────────────────────────────────
  it('SEC-05: Wrong amount or currency is rejected and marks payment failed', async () => {
    const user = await createTestUser();
    const internship = await createTestInternship({ price_1m: 5000 });

    const orderRes = await request(app)
      .post('/api/enroll/create-order')
      .set(authHeader(user))
      .send({ categoryCode: internship.category_code, duration: 1 });

    const orderId = orderRes.body.data.orderId;

    // Tamper with the payment record amount to create mismatch with provider order
    await Payment.updateOne({ razorpay_order_id: orderId }, { amount: 100 });

    const paymentId = `pay_tampered_${Date.now()}`;
    const signature = createValidPaymentSignature(orderId, paymentId);

    const verifyRes = await request(app)
      .post('/api/enroll/verify-payment')
      .set(authHeader(user))
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature
      });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.success).toBe(false);
    expect(verifyRes.body.message).toContain('mismatch');

    const payment = await Payment.findOne({ razorpay_order_id: orderId });
    expect(payment.status).toBe('failed');

    const enrollment = await Enrollment.findOne({ user_id: user._id });
    expect(enrollment).toBeNull();
  });

  // ── SEC-06: Close tab after capture (Webhook-only completion) ──────────────
  it('SEC-06: Webhook completes enrollment if user closes tab after capture', async () => {
    const user = await createTestUser();
    const internship = await createTestInternship();

    // 1. Order created
    const orderRes = await request(app)
      .post('/api/enroll/create-order')
      .set(authHeader(user))
      .send({ categoryCode: internship.category_code, duration: 1 });

    const orderId = orderRes.body.data.orderId;

    // 2. User closes tab! Client never calls /api/enroll/verify-payment.
    // 3. Razorpay webhook arrives asynchronously with 'payment.captured' event
    const webhookPayload = {
      event: 'payment.captured',
      id: `evt_${Date.now()}`,
      payload: {
        payment: {
          entity: {
            id: `pay_captured_${Date.now()}`,
            order_id: orderId,
            amount: internship.price_1m * 100,
            currency: 'INR',
            notes: {
              userId: String(user._id),
              internshipId: String(internship._id),
              duration: '1'
            }
          }
        }
      }
    };

    const rawBody = JSON.stringify(webhookPayload);
    const signature = createValidWebhookSignature(rawBody);

    const webhookRes = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(webhookPayload);

    expect(webhookRes.status).toBe(200);

    // 4. State must be complete: payment paid, enrollment created
    const payment = await Payment.findOne({ razorpay_order_id: orderId });
    expect(payment.status).toBe('paid');
    expect(payment.enrollment_id).toBeDefined();

    const enrollment = await Enrollment.findById(payment.enrollment_id);
    expect(enrollment).not.toBeNull();
    expect(String(enrollment.user_id)).toBe(String(user._id));
    expect(enrollment.status).toBe('active');
  });
});
