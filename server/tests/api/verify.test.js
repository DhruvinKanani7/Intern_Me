import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import app from '../../index.js';
import env from '../../config/env.js';
import Certificate from '../../models/Certificate.js';
import Enrollment from '../../models/Enrollment.js';
import logger from '../../config/logger.js';
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

const createTestEnrollment = async (user, internship, overrides = {}) => {
  return await Enrollment.create({
    user_id: user._id,
    internship_id: internship._id,
    internship_code: `IC-TEST-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    duration_months: 1,
    amount_paid: 999,
    status: 'completed',
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end_date: new Date(),
    current_task: 4,
    total_tasks: 4,
    ...overrides
  });
};

describe('Phase 5: Certificate Verification & Privacy (SEC-11, SEC-14)', () => {
  // ── Validation & Not Found ───────────────────────────────────────────────
  it('GET /api/verify/:code returns not found for non-existent certificate and logs miss (SEC-14)', async () => {
    const warnSpy = vi.spyOn(logger, 'warn');

    const res = await request(app).get('/api/verify/IC-NONEXISTENT-999');

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.message).toBe('Certificate not found');

    // SEC-14: Miss-monitoring recorded
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'IC-NONEXISTENT-999',
        event: 'CERTIFICATE_VERIFY_MISS'
      }),
      expect.any(String)
    );
    warnSpy.mockRestore();
  });

  it('GET /api/verify/:code fails validation on code that is too short', async () => {
    const res = await request(app).get('/api/verify/x');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
  });

  it('GET /api/verify/:code fails validation on code with invalid characters (XSS/injection prevention)', async () => {
    const res = await request(app).get(`/api/verify/${encodeURIComponent('<script>alert(1)</script>')}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── SEC-11: Open QR URL & Opaque Verification Code ────────────────────────
  it('SEC-11: verifies certificate successfully using 128-bit opaque verification code', async () => {
    const student = await createTestUser();
    const internship = await createTestInternship();
    const enrollment = await createTestEnrollment(student, internship, {
      internship_code: 'IC-WD-2025-V11'
    });

    const verificationCode = crypto.randomBytes(16).toString('base64url');
    const verifyUrl = `${process.env.FRONTEND_URL}/verify/${verificationCode}`;

    await Certificate.create({
      enrollment_id: enrollment._id,
      cert_id: `CERT-2025-${verificationCode.slice(0, 8)}`,
      verification_code: verificationCode,
      internship_code: enrollment.internship_code,
      full_name: student.full_name,
      internship_name: internship.category_name,
      duration: '1 Month',
      start_date: enrollment.start_date,
      end_date: enrollment.end_date,
      verification_url: verifyUrl,
      qr_code_url: verifyUrl,
      pdf_url: 'https://res.cloudinary.com/test/cert.pdf',
      cloudinary_public_id: 'interncert/certificates/test-cert-id'
    });

    const res = await request(app).get(`/api/verify/${verificationCode}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.status).toBe('valid');
    expect(res.body.is_revoked).toBe(false);
    expect(res.body.certificate.holder_name).toBe(student.full_name);
    expect(res.body.certificate.program_title).toBe(internship.category_name);
    expect(res.body.certificate.verification_code).toBe(verificationCode);
    expect(res.body.certificate.internship_code).toBe(enrollment.internship_code);
  });

  // ── SEC-14: Sequential Enumeration Protection ─────────────────────────────
  it('SEC-14: sequential guessing / predictable patterns do not yield valid certificate lookups', async () => {
    const student = await createTestUser();
    const internship = await createTestInternship();
    const enrollment = await createTestEnrollment(student, internship, {
      internship_code: 'IC-WD-2025-ENUM'
    });

    // Create certificate with opaque 128-bit entropy (base64url)
    const cert = await Certificate.create({
      enrollment_id: enrollment._id,
      cert_id: 'CERT-2025-ENUM1',
      internship_code: enrollment.internship_code,
      full_name: student.full_name,
      internship_name: internship.category_name,
      duration: '1 Month',
      start_date: enrollment.start_date,
      end_date: enrollment.end_date,
      pdf_url: 'https://res.cloudinary.com/test/cert.pdf'
    });

    // Verification code must be 128-bit base64url string (22 characters)
    expect(cert.verification_code).toBeDefined();
    expect(cert.verification_code.length).toBeGreaterThanOrEqual(21);

    // Sequential code guesses (e.g. CERT-2025-ENUM2, 0001, 0002) fail
    const sequentialGuesses = ['CERT-2025-ENUM2', 'CERT-2025-0001', 'CERT-2025-0002'];
    for (const guess of sequentialGuesses) {
      const res = await request(app).get(`/api/verify/${guess}`);
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
    }
  });

  // ── Privacy & Trust Boundaries (F17) ──────────────────────────────────────
  it('Task 5.3: Minimal public response strips student PII and internal database IDs', async () => {
    const student = await createTestUser();
    const internship = await createTestInternship();
    const enrollment = await createTestEnrollment(student, internship, {
      internship_code: 'IC-WD-2025-PRIVACY'
    });

    const cert = await Certificate.create({
      enrollment_id: enrollment._id,
      cert_id: 'CERT-PRIVACY-101',
      internship_code: enrollment.internship_code,
      full_name: student.full_name,
      internship_name: internship.category_name,
      duration: '1 Month',
      start_date: enrollment.start_date,
      end_date: enrollment.end_date,
      pdf_url: 'https://res.cloudinary.com/test/cert.pdf',
      cloudinary_public_id: 'interncert/certificates/cert-privacy-101'
    });

    const res = await request(app).get(`/api/verify/${cert.verification_code}`);

    expect(res.status).toBe(200);
    const certPayload = res.body.certificate;

    // Must NOT contain sensitive student PII or internal references
    expect(certPayload.college_email).toBeUndefined();
    expect(certPayload.user_id).toBeUndefined();
    expect(certPayload.enrollment_id).toBeUndefined();
    expect(certPayload._id).toBeUndefined();
    expect(certPayload.start_date).toBeUndefined();
    expect(certPayload.end_date).toBeUndefined();
    expect(certPayload.startDate).toBeUndefined();
    expect(certPayload.endDate).toBeUndefined();
    expect(certPayload.pdf_url).toBeUndefined();
    expect(certPayload.cloudinary_public_id).toBeUndefined();

    // Must contain minimal necessary verification data
    expect(certPayload.holder_name).toBe(student.full_name);
    expect(certPayload.program_title).toBe(internship.category_name);
    expect(certPayload.duration).toBe('1 Month');
    expect(certPayload.issue_date).toBeDefined();
    expect(certPayload.verification_code).toBe(cert.verification_code);
  });

  // ── Revoked Certificate Handling ──────────────────────────────────────────
  it('returns revoked status and blocks validity for revoked certificate', async () => {
    const student = await createTestUser();
    const internship = await createTestInternship();
    const enrollment = await createTestEnrollment(student, internship, {
      internship_code: 'IC-WD-2025-REVOKED'
    });

    const cert = await Certificate.create({
      enrollment_id: enrollment._id,
      cert_id: 'CERT-REVOKED-101',
      internship_code: enrollment.internship_code,
      full_name: student.full_name,
      internship_name: internship.category_name,
      duration: '1 Month',
      start_date: enrollment.start_date,
      end_date: enrollment.end_date,
      pdf_url: 'https://res.cloudinary.com/test/cert.pdf',
      is_revoked: true,
      revoked_reason: 'Academic integrity violation'
    });

    const res = await request(app).get(`/api/verify/${cert.verification_code}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.status).toBe('revoked');
    expect(res.body.is_revoked).toBe(true);
    expect(res.body.message).toBe('This certificate has been revoked');
    expect(res.body.certificate.status).toBe('Revoked');
  });

  // ── Backward Compatibility with Legacy Code ───────────────────────────────
  it('supports lookup via legacy internship_code for backwards compatibility', async () => {
    const student = await createTestUser();
    const internship = await createTestInternship();
    const enrollment = await createTestEnrollment(student, internship, {
      internship_code: 'IC-LEGACY-CODE-999'
    });

    await Certificate.create({
      enrollment_id: enrollment._id,
      cert_id: 'CERT-LEGACY-999',
      internship_code: enrollment.internship_code,
      full_name: student.full_name,
      internship_name: internship.category_name,
      duration: '1 Month',
      start_date: enrollment.start_date,
      end_date: enrollment.end_date,
      pdf_url: 'https://res.cloudinary.com/test/cert.pdf'
    });

    const res = await request(app).get('/api/verify/IC-LEGACY-CODE-999');

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.certificate.holder_name).toBe(student.full_name);
  });

  // ── Task 5.5: Private Storage & Signed Download Authorization ─────────────
  describe('Task 5.5: Private certificate storage & signed download URLs', () => {
    it('authorized student can download their certificate via signed URL', async () => {
      const student = await createTestUser();
      const internship = await createTestInternship();
      const enrollment = await createTestEnrollment(student, internship, {
        internship_code: 'IC-WD-2025-DOWNLOAD-OK'
      });

      await Certificate.create({
        enrollment_id: enrollment._id,
        cert_id: 'CERT-DOWNLOAD-001',
        internship_code: enrollment.internship_code,
        full_name: student.full_name,
        internship_name: internship.category_name,
        duration: '1 Month',
        start_date: enrollment.start_date,
        end_date: enrollment.end_date,
        pdf_url: 'https://res.cloudinary.com/test/cert.pdf',
        cloudinary_public_id: 'interncert/certificates/cert-download-001'
      });

      const res = await request(app)
        .get(`/api/certificates/${enrollment._id}/download`)
        .set(authHeader(student));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBeDefined();
    });

    it('rejects download attempt from unauthorized student with 403', async () => {
      const studentOwner = await createTestUser();
      const studentAttacker = await createTestUser();
      const internship = await createTestInternship();
      const enrollment = await createTestEnrollment(studentOwner, internship, {
        internship_code: 'IC-WD-2025-DOWNLOAD-STOLEN'
      });

      const cert = await Certificate.create({
        enrollment_id: enrollment._id,
        cert_id: 'CERT-DOWNLOAD-002',
        internship_code: enrollment.internship_code,
        full_name: studentOwner.full_name,
        internship_name: internship.category_name,
        duration: '1 Month',
        start_date: enrollment.start_date,
        end_date: enrollment.end_date,
        pdf_url: 'https://res.cloudinary.com/test/cert.pdf'
      });

      const res = await request(app)
        .get(`/api/certificates/${cert._id}/download`)
        .set(authHeader(studentAttacker));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Certificate access denied');
    });

    it('allows admin to download any certificate for verification', async () => {
      const student = await createTestUser();
      const admin = await createTestAdmin();
      const internship = await createTestInternship();
      const enrollment = await createTestEnrollment(student, internship, {
        internship_code: 'IC-WD-2025-ADMIN-DOWNLOAD'
      });

      const cert = await Certificate.create({
        enrollment_id: enrollment._id,
        cert_id: 'CERT-ADMIN-DOWNLOAD-001',
        internship_code: enrollment.internship_code,
        full_name: student.full_name,
        internship_name: internship.category_name,
        duration: '1 Month',
        start_date: enrollment.start_date,
        end_date: enrollment.end_date,
        pdf_url: 'https://res.cloudinary.com/test/cert.pdf'
      });

      const res = await request(app)
        .get(`/api/certificates/${cert._id}/download`)
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBeDefined();
    });

    it('GET /api/certificates/my enriches results with download_url', async () => {
      const student = await createTestUser();
      const internship = await createTestInternship();
      const enrollment = await createTestEnrollment(student, internship, {
        internship_code: 'IC-WD-2025-MY-CERTS'
      });

      await Certificate.create({
        enrollment_id: enrollment._id,
        cert_id: 'CERT-MY-001',
        internship_code: enrollment.internship_code,
        full_name: student.full_name,
        internship_name: internship.category_name,
        duration: '1 Month',
        start_date: enrollment.start_date,
        end_date: enrollment.end_date,
        pdf_url: 'https://res.cloudinary.com/test/cert.pdf'
      });

      const res = await request(app)
        .get('/api/certificates/my')
        .set(authHeader(student));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].download_url).toBeDefined();
    });
  });
});
