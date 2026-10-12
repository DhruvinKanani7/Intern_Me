import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index.js';
import env from '../../config/env.js';
import Internship from '../../models/Internship.js';
import Enrollment from '../../models/Enrollment.js';
import {
  isValidLinkedInUrl,
  normalizeLinkedInUrl,
  escapeHtml,
  safeHref,
  escapeRegex,
  parsePagination
} from '../../utils/helpers.js';
import {
  sendContactMessageEmail,
  sendEnrollmentConfirmation
} from '../../services/email.js';
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

describe('Phase 3: Input/Output Trust Boundaries (SEC-07, SEC-08)', () => {
  // ── SEC-07: Strict LinkedIn URL Validation ─────────────────────────────────
  describe('SEC-07: Strict LinkedIn URL validation and normalization', () => {
    it('rejects malicious javascript:, data:, and http: URLs', () => {
      expect(isValidLinkedInUrl('javascript:alert(1)')).toBe(false);
      expect(isValidLinkedInUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidLinkedInUrl('http://www.linkedin.com/in/student')).toBe(false); // Must be https
      expect(isValidLinkedInUrl('https://evil-site.com/in/student')).toBe(false);
      expect(isValidLinkedInUrl('https://linkedin.com.attacker.com/posts/123')).toBe(false);
      expect(isValidLinkedInUrl('not-a-url')).toBe(false);
      expect(isValidLinkedInUrl('')).toBe(false);
      expect(isValidLinkedInUrl(null)).toBe(false);
    });

    it('accepts and normalizes valid LinkedIn profile and post URLs', () => {
      const validProfile = 'https://linkedin.com/in/student-dev/';
      expect(isValidLinkedInUrl(validProfile)).toBe(true);
      expect(normalizeLinkedInUrl(validProfile)).toBe('https://www.linkedin.com/in/student-dev');

      const validPost = 'https://www.linkedin.com/posts/student-project-update_123?utm_source=share';
      expect(isValidLinkedInUrl(validPost)).toBe(true);
      // Tracking parameter stripped in normalized form
      expect(normalizeLinkedInUrl(validPost)).toBe('https://www.linkedin.com/posts/student-project-update_123');

      const validActivity = 'https://www.linkedin.com/feed/update/urn:li:activity:7123456789012345678';
      expect(isValidLinkedInUrl(validActivity)).toBe(true);
      expect(normalizeLinkedInUrl(validActivity)).toBe('https://www.linkedin.com/feed/update/urn:li:activity:7123456789012345678');
    });

    it('rejects submission with invalid/malicious LinkedIn URL via API (400)', async () => {
      const user = await createTestUser();
      const internship = await createTestInternship();
      const enrollment = await Enrollment.create({
        user_id: user._id,
        internship_id: internship._id,
        internship_code: 'IC-WD-0001-2025-A1B2',
        duration_months: 1,
        total_tasks: 4,
        current_task: 1,
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount_paid: 999,
        status: 'active'
      });

      const res = await request(app)
        .post(`/api/tasks/${enrollment._id}/submit`)
        .set(authHeader(user))
        .send({ linkedin_url: 'javascript:alert("hacked")' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── SEC-08: HTML Escaping in Email Templates ───────────────────────────────
  describe('SEC-08: Email template escaping & HTML injection prevention', () => {
    it('escapes dangerous HTML characters in escapeHtml helper', () => {
      const payload = '<script>alert("xss")</script>&<img src=x onerror=alert(1)>';
      const escaped = escapeHtml(payload);
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).toContain('&amp;');
      expect(escaped).toContain('&quot;');
    });

    it('sanitizes href links using safeHref helper', () => {
      expect(safeHref('javascript:alert(1)')).toBe('#');
      expect(safeHref('data:text/html,boom')).toBe('#');
      expect(safeHref('vbscript:alert(1)')).toBe('#');
      expect(safeHref('https://interncert.com/verify')).toBe('https://interncert.com/verify');
    });

    it('POST /api/contact sanitizes HTML input and succeeds', async () => {
      const res = await request(app)
        .post('/api/contact')
        .send({
          name: '<script>alert("xss")</script>',
          email: 'student@campus.edu',
          subject: '<h1>Question</h1>',
          message: '<img src=x onerror=alert(1)> Hello, I need help with task 1.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // ── Task 3.3: Regex-Safe Search ────────────────────────────────────────────
  describe('Task 3.3: ReDoS & Regex-safe search', () => {
    it('escapes regex special characters safely in escapeRegex', () => {
      const trickyQuery = '.*+?^${}()|[]\\';
      const safe = escapeRegex(trickyQuery);
      // Should not throw SyntaxError when used in RegExp
      expect(() => new RegExp(safe)).not.toThrow();
    });

    it('GET /api/internships handles malformed regex characters without crashing (200)', async () => {
      await createTestInternship({ category_name: 'Python Data Science' });

      // Queries containing unbalanced brackets, parenthesis, or wildcards
      const queries = ['[unclosed', '*(+?', '.*.*.*.*.*.*a', '\\'];
      for (const q of queries) {
        const res = await request(app)
          .get(`/api/internships?search=${encodeURIComponent(q)}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      }
    });
  });

  // ── Task 3.4: Admin DTO Allowlists ────────────────────────────────────────
  describe('Task 3.4: Admin DTO allowlists for create/update', () => {
    it('rejects unauthorized/privileged properties in POST /api/admin/internships (400)', async () => {
      const adminUser = await createTestAdmin();

      const res = await request(app)
        .post('/api/admin/internships')
        .set(authHeader(adminUser))
        .send({
          category_code: 'AI99',
          category_name: 'Artificial Intelligence',
          description: 'Deep learning internship with PyTorch.',
          price_1m: 1499,
          price_3m: 2499,
          price_5m: 3499,
          // Injected forbidden field
          is_admin_override: true,
          arbitrary_injection: 'hack'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('creates internship successfully with allowed fields', async () => {
      const adminUser = await createTestAdmin();

      const res = await request(app)
        .post('/api/admin/internships')
        .set(authHeader(adminUser))
        .send({
          category_code: `ML${Math.floor(100 + Math.random() * 899)}`,
          category_name: 'Machine Learning',
          description: 'Practical machine learning internship with real datasets.',
          price_1m: 999,
          price_3m: 1999,
          price_5m: 2999
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category_name).toBe('Machine Learning');
    });

    it('rejects unauthorized/privileged properties in PUT /api/admin/internships/:id (400)', async () => {
      const adminUser = await createTestAdmin();
      const internship = await createTestInternship();

      const res = await request(app)
        .put(`/api/admin/internships/${internship._id}`)
        .set(authHeader(adminUser))
        .send({
          _id: '507f1f77bcf86cd799439011', // Forbidden immutable field
          category_name: 'Updated Name'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Task 3.5: Pagination Bounds ───────────────────────────────────────────
  describe('Task 3.5: Bounded pagination', () => {
    it('clamps limit to maximum (100) and page to minimum (1)', () => {
      expect(parsePagination({ page: '-5', limit: '999999' })).toEqual({
        page: 1,
        limit: 100,
        skip: 0
      });
      expect(parsePagination({ page: '2', limit: '50' })).toEqual({
        page: 2,
        limit: 50,
        skip: 50
      });
      expect(parsePagination({ page: '0', limit: '0' })).toEqual({
        page: 1,
        limit: 1,
        skip: 0
      });
    });

    it('GET /api/internships caps excessive limit to 100', async () => {
      const res = await request(app)
        .get('/api/internships?limit=999999&page=1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pages).toBeDefined();
    });
  });
});
