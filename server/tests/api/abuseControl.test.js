import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { generateSync } from 'otplib';
import app from '../../index.js';
import env from '../../config/env.js';
import User from '../../models/User.js';
import Certificate from '../../models/Certificate.js';
import Enrollment from '../../models/Enrollment.js';
import AuditLog from '../../models/AuditLog.js';
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

describe('Phase 6: Abuse Control & Admin Protection (F23, F24, F28 / SEC-15)', () => {
  // ── Task 6.2: Email Abuse Quotas & Cooldowns (F24) ───────────────────────────
  describe('Task 6.2: Email abuse quotas and cooldown enforcement', () => {
    it('enforces 60-second cooldown between password reset requests for same email', async () => {
      const student = await createTestUser({ college_email: 'cooldown.student1@univ.edu' });

      // First request succeeds
      const firstRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ college_email: student.college_email });

      expect(firstRes.status).toBe(200);

      // Immediate second request is blocked by cooldown (429)
      const secondRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ college_email: student.college_email });

      expect(secondRes.status).toBe(429);
      expect(secondRes.body.success).toBe(false);
      expect(secondRes.body.message).toMatch(/Please wait \d+ seconds/);
    });

    it('enforces 60-second cooldown between contact form submissions for same email', async () => {
      const testEmail = 'cooldown.contact@example.ac.in';
      const payload = {
        name: 'Cooldown Tester',
        email: testEmail,
        subject: 'Inquiry',
        message: 'First test inquiry message'
      };

      // First submission succeeds
      const firstRes = await request(app)
        .post('/api/contact')
        .send(payload);

      expect(firstRes.status).toBe(201);

      // Immediate second submission is blocked by cooldown (429)
      const secondRes = await request(app)
        .post('/api/contact')
        .send({ ...payload, message: 'Second test inquiry message' });

      expect(secondRes.status).toBe(429);
      expect(secondRes.body.success).toBe(false);
      expect(secondRes.body.message).toMatch(/Please wait \d+ seconds/);
    });
  });

  // ── Task 6.3 / SEC-15: Admin MFA & Step-up Authentication ─────────────────────
  describe('Task 6.3 & SEC-15: Admin MFA enrollment and step-up revocation protection', () => {
    it('allows admin to setup and initialize TOTP MFA', async () => {
      const admin = await createTestAdmin({ college_email: 'admin.mfa.setup@interncert.com' });

      const res = await request(app)
        .post('/api/admin/mfa/setup')
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.secret).toBeDefined();
      expect(res.body.data.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
      expect(res.body.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

      // Secret saved on admin user
      const updatedAdmin = await User.findById(admin._id);
      expect(updatedAdmin.mfa_secret).toBe(res.body.data.secret);
      expect(updatedAdmin.mfa_enabled).toBe(false);
    });

    it('enables MFA when valid TOTP token is submitted and generates backup codes', async () => {
      const admin = await createTestAdmin({ college_email: 'admin.mfa.enable@interncert.com' });
      const { secret } = await generateMfaSetup(admin);
      admin.mfa_secret = secret;
      await admin.save();

      // Generate current valid TOTP token
      const currentToken = generateSync({ secret });

      const res = await request(app)
        .post('/api/admin/mfa/enable')
        .set(authHeader(admin))
        .send({ code: currentToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.backupCodes).toBeDefined();
      expect(res.body.data.backupCodes.length).toBe(8);

      // Admin has MFA enabled
      const updatedAdmin = await User.findById(admin._id);
      expect(updatedAdmin.mfa_enabled).toBe(true);
      expect(updatedAdmin.mfa_backup_codes.length).toBe(8);

      // Audit log recorded
      const auditLog = await AuditLog.findOne({
        action: 'admin_mfa_enabled',
        actor_id: admin._id
      });
      expect(auditLog).toBeDefined();
    });

    it('SEC-15: admin revoke certificate requires MFA and writes audit log', async () => {
      // 1. Setup admin with active MFA
      const admin = await createTestAdmin({ college_email: 'admin.sec15@interncert.com' });
      const { secret } = await generateMfaSetup(admin);
      admin.mfa_secret = secret;
      admin.mfa_enabled = true;
      await admin.save();

      // 2. Setup certificate to revoke
      const student = await createTestUser();
      const internship = await createTestInternship();
      const enrollment = await Enrollment.create({
        user_id: student._id,
        internship_id: internship._id,
        internship_code: 'IC-SEC15-REVOKE',
        duration_months: 1,
        amount_paid: 999,
        status: 'completed',
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end_date: new Date(),
        current_task: 4,
        total_tasks: 4
      });

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

      // 3. Attempt revoke WITHOUT MFA code -> REJECTED (403)
      const noMfaRes = await request(app)
        .post(`/api/admin/certificates/${cert._id}/revoke`)
        .set(authHeader(admin))
        .send({ reason: 'Suspected plagiarism' });

      expect(noMfaRes.status).toBe(403);
      expect(noMfaRes.body.success).toBe(false);
      expect(noMfaRes.body.message).toMatch(/MFA verification required/i);

      // Verify certificate is NOT revoked yet
      let certInDb = await Certificate.findById(cert._id);
      expect(certInDb.is_revoked).toBe(false);

      // 4. Attempt revoke with INVALID MFA code -> REJECTED (403)
      const badMfaRes = await request(app)
        .post(`/api/admin/certificates/${cert._id}/revoke`)
        .set(authHeader(admin))
        .set({ 'X-Admin-MFA-Code': '000000' })
        .send({ reason: 'Suspected plagiarism' });

      expect(badMfaRes.status).toBe(403);
      expect(badMfaRes.body.message).toMatch(/Invalid MFA code/i);

      certInDb = await Certificate.findById(cert._id);
      expect(certInDb.is_revoked).toBe(false);

      // 5. Attempt revoke with VALID TOTP code -> SUCCEEDS (200) & AUDIT ROW WRITTEN
      const validTotpToken = generateSync({ secret });

      const okRes = await request(app)
        .post(`/api/admin/certificates/${cert._id}/revoke`)
        .set(authHeader(admin))
        .set({ 'X-Admin-MFA-Code': validTotpToken })
        .send({ reason: 'Confirmed violation of terms' });

      expect(okRes.status).toBe(200);
      expect(okRes.body.success).toBe(true);

      // Verify certificate is now revoked in database
      certInDb = await Certificate.findById(cert._id);
      expect(certInDb.is_revoked).toBe(true);

      // Verify audit row written (SEC-15 requirement)
      const auditLog = await AuditLog.findOne({
        action: 'certificate_revoked',
        actor_id: admin._id,
        target_id: cert._id
      });
      expect(auditLog).toBeDefined();
      expect(auditLog.target_type).toBe('Certificate');
      expect(auditLog.reason).toBe('Confirmed violation of terms');
    });

    it('allows step-up action using single-use backup recovery code and burns code', async () => {
      const admin = await createTestAdmin({ college_email: 'admin.backup@interncert.com' });
      const { secret } = await generateMfaSetup(admin);
      admin.mfa_secret = secret;
      await admin.save();

      // Enable with backup codes
      const token = generateSync({ secret });
      const enableRes = await request(app)
        .post('/api/admin/mfa/enable')
        .set(authHeader(admin))
        .send({ code: token });

      expect(enableRes.status).toBe(200);
      const backupCode = enableRes.body.data.backupCodes[0];

      // Setup certificate
      const student = await createTestUser();
      const internship = await createTestInternship();
      const enrollment = await Enrollment.create({
        user_id: student._id,
        internship_id: internship._id,
        internship_code: 'IC-BACKUP-TEST',
        duration_months: 1,
        amount_paid: 999,
        status: 'completed',
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end_date: new Date(),
        current_task: 4,
        total_tasks: 4
      });

      const cert = await Certificate.create({
        enrollment_id: enrollment._id,
        cert_id: 'CERT-BACKUP-001',
        internship_code: enrollment.internship_code,
        full_name: student.full_name,
        internship_name: internship.category_name,
        duration: '1 Month',
        start_date: enrollment.start_date,
        end_date: enrollment.end_date,
        pdf_url: 'https://res.cloudinary.com/test/cert.pdf'
      });

      // Revoke using backup code
      const res = await request(app)
        .post(`/api/admin/certificates/${cert._id}/revoke`)
        .set(authHeader(admin))
        .set({ 'X-Admin-MFA-Code': backupCode })
        .send({ reason: 'Revoke via backup code' });

      expect(res.status).toBe(200);

      // Second attempt with the SAME backup code is rejected (burned)
      const replayRes = await request(app)
        .post(`/api/admin/certificates/${cert._id}/revoke`)
        .set(authHeader(admin))
        .set({ 'X-Admin-MFA-Code': backupCode })
        .send({ reason: 'Replay attempt' });

      expect(replayRes.status).toBe(403);
    });
  });
});
