import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index.js';
import env from '../../config/env.js';
import Enrollment from '../../models/Enrollment.js';
import TaskSubmission from '../../models/TaskSubmission.js';
import Certificate from '../../models/Certificate.js';
import Outbox from '../../models/Outbox.js';
import AuditLog from '../../models/AuditLog.js';
import certificateGenerator from '../../services/certificateGenerator.js';
import { processOutboxJobs } from '../../services/outboxWorker.js';
import { expireOverdueEnrollments } from '../../services/enrollmentExpiry.js';
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

describe('Phase 4: Workflow Integrity (SEC-12, SEC-13, Expiry, Deadlines, AuditLog)', () => {
  // ── SEC-12: Task-Review State Machine ──────────────────────────────────────
  describe('SEC-12: Task-Review state machine & stale review prevention', () => {
    it('approving a pending task advances current_task exactly once and sets next task deadline', async () => {
      const student = await createTestUser();
      const admin = await createTestAdmin();
      const internship = await createTestInternship();

      const enrollment = await Enrollment.create({
        user_id: student._id,
        internship_id: internship._id,
        internship_code: 'IC-WD-0001-2025-ABCD',
        duration_months: 1,
        total_tasks: 4,
        current_task: 1,
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount_paid: 999,
        status: 'active'
      });

      const submission = await TaskSubmission.create({
        enrollment_id: enrollment._id,
        task_number: 1,
        linkedin_url: 'https://www.linkedin.com/posts/student_task_1',
        status: 'pending'
      });

      const res = await request(app)
        .post(`/api/admin/submissions/${submission._id}/review`)
        .set(authHeader(admin))
        .send({ status: 'approved', notes: 'Great job!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedEnrollment = await Enrollment.findById(enrollment._id);
      expect(updatedEnrollment.current_task).toBe(2);
      expect(updatedEnrollment.current_task_due_at).toBeDefined();
    });

    it('rejects stale review with 409 if submission task_number does not match current_task (SEC-12)', async () => {
      const student = await createTestUser();
      const admin = await createTestAdmin();
      const internship = await createTestInternship();

      const enrollment = await Enrollment.create({
        user_id: student._id,
        internship_id: internship._id,
        internship_code: 'IC-WD-0002-2025-STAL',
        duration_months: 1,
        total_tasks: 4,
        current_task: 2, // Enrollment already moved to task 2
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount_paid: 999,
        status: 'active'
      });

      // Old submission for task 1
      const staleSubmission = await TaskSubmission.create({
        enrollment_id: enrollment._id,
        task_number: 1,
        linkedin_url: 'https://www.linkedin.com/posts/student_task_1',
        status: 'pending'
      });

      const res = await request(app)
        .post(`/api/admin/submissions/${staleSubmission._id}/review`)
        .set(authHeader(admin))
        .send({ status: 'approved', notes: 'Approved old task' });

      // Must be rejected with 409 Conflict
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Stale review attempt/i);

      // Verify current_task did NOT move backwards
      const checkEnrollment = await Enrollment.findById(enrollment._id);
      expect(checkEnrollment.current_task).toBe(2);
    });

    it('rejects reviewing a submission that is not pending with 409', async () => {
      const admin = await createTestAdmin();
      const student = await createTestUser();
      const internship = await createTestInternship();

      const enrollment = await Enrollment.create({
        user_id: student._id,
        internship_id: internship._id,
        internship_code: 'IC-WD-0003-2025-ALRD',
        duration_months: 1,
        total_tasks: 4,
        current_task: 1,
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount_paid: 999,
        status: 'active'
      });

      const alreadyApproved = await TaskSubmission.create({
        enrollment_id: enrollment._id,
        task_number: 1,
        linkedin_url: 'https://www.linkedin.com/posts/task_done',
        status: 'approved'
      });

      const res = await request(app)
        .post(`/api/admin/submissions/${alreadyApproved._id}/review`)
        .set(authHeader(admin))
        .send({ status: 'approved', notes: 'Double review' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already been reviewed/i);
    });
  });

  // ── SEC-13: Outbox Pattern & Idempotent Certificate Generation ─────────────
  describe('SEC-13: Outbox pattern & idempotent certificate generation', () => {
    it('approving final task creates Outbox job and completes enrollment; worker generates exactly 1 certificate', async () => {
      const student = await createTestUser();
      const admin = await createTestAdmin();
      const internship = await createTestInternship();

      const enrollment = await Enrollment.create({
        user_id: student._id,
        internship_id: internship._id,
        internship_code: 'IC-WD-0004-2025-LAST',
        duration_months: 1,
        total_tasks: 1, // Single task program for quick final task test
        current_task: 1,
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount_paid: 999,
        status: 'active'
      });

      const submission = await TaskSubmission.create({
        enrollment_id: enrollment._id,
        task_number: 1,
        linkedin_url: 'https://www.linkedin.com/posts/final_task',
        status: 'pending'
      });

      // Approve final task
      const res = await request(app)
        .post(`/api/admin/submissions/${submission._id}/review`)
        .set(authHeader(admin))
        .send({ status: 'approved', notes: 'Final task completed!' });

      expect(res.status).toBe(200);

      // 1. Enrollment status must be 'completed'
      const updatedEnrollment = await Enrollment.findById(enrollment._id);
      expect(updatedEnrollment.status).toBe('completed');

      // 2. An Outbox job must have been written atomically
      const outboxJob = await Outbox.findOne({
        idempotency_key: `cert-outbox-${enrollment._id}`
      });
      expect(outboxJob).toBeDefined();
      expect(outboxJob.status).toBe('pending');
      expect(outboxJob.event_type).toBe('generate_certificate');

      // Mock certificateGenerator.generate to avoid live Cloudinary / SMTP network calls
      const generateSpy = vi
        .spyOn(certificateGenerator, 'generate')
        .mockImplementation(async (enrollmentId) => {
          return await Certificate.create({
            enrollment_id: enrollmentId,
            cert_id: `CERT-TEST-${enrollmentId}`,
            internship_code: enrollment.internship_code,
            full_name: student.full_name,
            internship_name: internship.category_name,
            duration: '1 Month',
            start_date: enrollment.start_date,
            end_date: enrollment.end_date,
            qr_code_url: 'https://interncert.example.com/verify/test',
            pdf_url: 'https://res.cloudinary.com/test/cert.pdf'
          });
        });

      // 3. Process the outbox worker
      const workerResult = await processOutboxJobs();
      expect(workerResult.processedCount).toBe(1);

      // Outbox job must now be completed
      const completedJob = await Outbox.findById(outboxJob._id);
      expect(completedJob.status).toBe('completed');

      // Exactly 1 Certificate record in DB
      const certCount = await Certificate.countDocuments({ enrollment_id: enrollment._id });
      expect(certCount).toBe(1);

      // 4. SEC-13 Idempotency assertion: re-running worker does NOT generate duplicate
      const secondRun = await processOutboxJobs();
      expect(secondRun.processedCount).toBe(0);

      const finalCertCount = await Certificate.countDocuments({ enrollment_id: enrollment._id });
      expect(finalCertCount).toBe(1);

      generateSpy.mockRestore();
    });
  });

  // ── Task 4.2: Enrollment Expiry ───────────────────────────────────────────
  describe('Task 4.2: Enrollment expiry enforcement and background transition', () => {
    it('rejects task submission when current date is past enrollment end_date (403)', async () => {
      const student = await createTestUser();
      const internship = await createTestInternship();

      // Enrollment that ended yesterday
      const expiredEnrollment = await Enrollment.create({
        user_id: student._id,
        internship_id: internship._id,
        internship_code: 'IC-WD-0005-2025-EXPD',
        duration_months: 1,
        total_tasks: 4,
        current_task: 1,
        start_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        amount_paid: 999,
        status: 'active'
      });

      const res = await request(app)
        .post(`/api/tasks/${expiredEnrollment._id}/submit`)
        .set(authHeader(student))
        .send({ linkedin_url: 'https://www.linkedin.com/posts/too_late_task' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/expired/i);
    });

    it('expireOverdueEnrollments transitions active overdue enrollments to expired', async () => {
      const student = await createTestUser();
      const internship = await createTestInternship();

      const overdue = await Enrollment.create({
        user_id: student._id,
        internship_id: internship._id,
        internship_code: 'IC-WD-0006-2025-OVER',
        duration_months: 1,
        total_tasks: 4,
        current_task: 1,
        start_date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        amount_paid: 999,
        status: 'active'
      });

      const modifiedCount = await expireOverdueEnrollments();
      expect(modifiedCount).toBeGreaterThanOrEqual(1);

      const refreshed = await Enrollment.findById(overdue._id);
      expect(refreshed.status).toBe('expired');
    });
  });

  // ── Task 4.3: Per-Task Deadlines & Admin Extension ────────────────────────
  describe('Task 4.3: Per-task deadlines and administrative extensions', () => {
    it('rejects submission when current_task_due_at has passed without extension (400)', async () => {
      const student = await createTestUser();
      const internship = await createTestInternship();

      // Enrollment with a task deadline that expired 2 hours ago
      const enrollment = await Enrollment.create({
        user_id: student._id,
        internship_id: internship._id,
        internship_code: 'IC-WD-0007-2025-DLNE',
        duration_months: 1,
        total_tasks: 4,
        current_task: 1,
        current_task_due_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount_paid: 999,
        status: 'active'
      });

      const res = await request(app)
        .post(`/api/tasks/${enrollment._id}/submit`)
        .set(authHeader(student))
        .send({ linkedin_url: 'https://www.linkedin.com/posts/late_task' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/deadline.*passed/i);
    });

    it('admin can extend deadline, and submission then succeeds', async () => {
      const student = await createTestUser();
      const admin = await createTestAdmin();
      const internship = await createTestInternship();

      const enrollment = await Enrollment.create({
        user_id: student._id,
        internship_id: internship._id,
        internship_code: 'IC-WD-0008-2025-EXTN',
        duration_months: 1,
        total_tasks: 4,
        current_task: 1,
        current_task_due_at: new Date(Date.now() - 1000),
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount_paid: 999,
        status: 'active'
      });

      // Admin grants 7 days extension
      const extendRes = await request(app)
        .post(`/api/admin/enrollments/${enrollment._id}/extend`)
        .set(authHeader(admin))
        .send({ additional_days: 7, reason: 'Medical leave approved' });

      expect(extendRes.status).toBe(200);
      expect(extendRes.body.success).toBe(true);

      // Student now submits successfully
      const submitRes = await request(app)
        .post(`/api/tasks/${enrollment._id}/submit`)
        .set(authHeader(student))
        .send({ linkedin_url: 'https://www.linkedin.com/posts/now_extended_task' });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.success).toBe(true);
    });
  });

  // ── Task 4.5: Append-only AuditLog ────────────────────────────────────────
  describe('Task 4.5: Append-only AuditLog verification', () => {
    it('records immutable audit log on admin action and prevents modification/deletion', async () => {
      const admin = await createTestAdmin();
      const internship = await createTestInternship();

      // Perform admin update
      await request(app)
        .put(`/api/admin/internships/${internship._id}`)
        .set(authHeader(admin))
        .send({ category_name: 'Audit Log Test Program' });

      // Verify audit log row was written
      const auditLog = await AuditLog.findOne({
        action: 'internship_updated',
        target_id: String(internship._id)
      });
      expect(auditLog).toBeDefined();
      expect(String(auditLog.actor_id)).toBe(String(admin._id));

      // Attempting to modify or delete audit log MUST throw error
      await expect(
        AuditLog.updateOne({ _id: auditLog._id }, { action: 'tampered' })
      ).rejects.toThrow(/append-only/i);

      await expect(
        AuditLog.deleteOne({ _id: auditLog._id })
      ).rejects.toThrow(/append-only/i);

      // Verify GET /api/admin/audit-logs returns log entry
      const listRes = await request(app)
        .get('/api/admin/audit-logs')
        .set(authHeader(admin));

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.logs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
