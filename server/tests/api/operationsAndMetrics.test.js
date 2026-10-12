import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../../index.js';
import User from '../../models/User.js';
import Outbox from '../../models/Outbox.js';
import AuditLog from '../../models/AuditLog.js';
import { metricsService } from '../../services/metricsService.js';
import { runRetentionPruning } from '../../services/dataRetentionService.js';
import { createDatabaseBackup } from '../../scripts/backup.js';
import { restoreDatabase } from '../../scripts/restore.js';

describe('Phase 8: Observability, Metrics & Data Safety (Task 8.5, 8.6)', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Outbox.deleteMany({});
    await AuditLog.collection.deleteMany({});
  });

  describe('8.5 Observability & Operational Metrics', () => {
    it('GET /api/metrics returns structured JSON snapshot with system and request metrics', async () => {
      // Warmup request to ensure metrics counter has recorded at least 1 request
      await request(app).get('/api/metrics');

      const res = await request(app)
        .get('/api/metrics')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(typeof res.body.uptimeSeconds).toBe('number');
      expect(res.body.process).toBeDefined();
      expect(typeof res.body.process.heapUsedMb).toBe('number');
      expect(res.body.counters).toBeDefined();
      expect(res.body.counters.httpRequestsTotal).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/metrics returns prometheus text format when requested', async () => {
      const res = await request(app)
        .get('/api/metrics')
        .set('Accept', 'text/plain');

      expect(res.status).toBe(200);
      expect(res.text).toContain('http_requests_total');
      expect(res.text).toContain('payment_attempts_total');
      expect(res.text).toContain('process_uptime_seconds');
    });

    it('metricsService tracks payment failures and webhook failures accurately', () => {
      const beforeFailures = metricsService.counters.paymentFailures;
      metricsService.recordPaymentFailure('GATEWAY_TIMEOUT');
      expect(metricsService.counters.paymentFailures).toBe(beforeFailures + 1);

      const beforeWebhooks = metricsService.counters.webhookFailures;
      metricsService.recordWebhookFailure('BAD_SIGNATURE');
      expect(metricsService.counters.webhookFailures).toBe(beforeWebhooks + 1);
    });
  });

  describe('8.6 Data Safety: Retention Policy, Backup & Restore Drill', () => {
    it('runRetentionPruning purges stale unverified users and expired reset tokens', async () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

      // Old unverified user (should be purged)
      await User.create({
        full_name: 'Stale Unverified',
        college_email: 'stale@college.edu',
        password: 'Password123!',
        enrollment_no: 'STALE01',
        email_verified: false,
        created_at: eightDaysAgo,
      });

      // Recent unverified user (should be preserved)
      await User.create({
        full_name: 'Recent Unverified',
        college_email: 'recent@college.edu',
        password: 'Password123!',
        enrollment_no: 'RECENT01',
        email_verified: false,
        created_at: oneDayAgo,
      });

      // User with expired reset token
      const expiredUser = await User.create({
        full_name: 'Expired Reset',
        college_email: 'expired@college.edu',
        password: 'Password123!',
        enrollment_no: 'EXPIRED01',
        email_verified: true,
        reset_token: 'somehash',
        reset_token_expires: oneDayAgo,
      });

      const stats = await runRetentionPruning();
      expect(stats.unverifiedUsersPurged).toBe(1);
      expect(stats.resetTokensCleared).toBe(1);

      const staleCheck = await User.findOne({ college_email: 'stale@college.edu' });
      expect(staleCheck).toBeNull();

      const recentCheck = await User.findOne({ college_email: 'recent@college.edu' });
      expect(recentCheck).not.toBeNull();

      const tokenCheck = await User.findById(expiredUser._id);
      expect(tokenCheck.reset_token).toBeUndefined();
    });

    it('backup and restore drill successfully takes snapshot and rehydrates collections', async () => {
      await User.create({
        full_name: 'Drill Student',
        college_email: 'drill@college.edu',
        password: 'Password123!',
        enrollment_no: 'DRILL01',
        email_verified: true,
      });

      const tempDir = path.resolve('scratch_backups_test');
      const backupResult = await createDatabaseBackup({ outputDir: tempDir });

      expect(fs.existsSync(backupResult.backupPath)).toBe(true);
      expect(typeof backupResult.hash).toBe('string');
      expect(backupResult.collectionCounts.users).toBe(1);

      // Modify database to simulate data loss / mutation
      await User.deleteMany({});
      const afterDelete = await User.countDocuments();
      expect(afterDelete).toBe(0);

      // Perform restore drill
      const restoreResult = await restoreDatabase({ backupPath: backupResult.backupPath });
      expect(restoreResult.verifiedHash).toBe(backupResult.hash);

      const afterRestore = await User.countDocuments();
      expect(afterRestore).toBe(1);

      const restoredUser = await User.findOne({ college_email: 'drill@college.edu' });
      expect(restoredUser.full_name).toBe('Drill Student');

      // Cleanup test backup files
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });
});
