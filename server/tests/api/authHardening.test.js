import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index.js';
import User from '../../models/User.js';
import env from '../../config/env.js';
import { hashToken } from '../../utils/helpers.js';
import { createTestUser } from '../helpers/seed.js';

describe('Phase 2: Authentication & Session Hardening (SEC-09, SEC-10)', () => {
  // ── SEC-09: CSRF & Origin Protection ───────────────────────────────────────
  describe('SEC-09: Cross-origin and CSRF request protections', () => {
    it('blocks state-changing request from untrusted cross-origin with 403', async () => {
      const user = await createTestUser();
      const token = jwt.sign(
        { id: String(user._id), role: user.role, token_version: user.token_version },
        process.env.JWT_SECRET || env.JWT_SECRET
      );

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Origin', 'https://malicious-attacker-site.com')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden: Cross-origin request rejected/i);
    });

    it('blocks state-changing request when XSRF-TOKEN cookie exists but CSRF header is missing or mismatch', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', ['XSRF-TOKEN=legitimate-token-12345'])
        .set('x-csrf-token', 'tampered-csrf-token')
        .send({
          college_email: 'random@campus.edu',
          password: 'Password123!'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden: CSRF token validation failed/i);
    });

    it('permits state-changing request when XSRF-TOKEN cookie matches X-CSRF-Token header', async () => {
      const csrfToken = 'valid-csrf-token-abc';
      const user = await createTestUser({
        college_email: 'csrfuser@campus.edu',
        password: 'Password123!'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', [`XSRF-TOKEN=${csrfToken}`])
        .set('X-CSRF-Token', csrfToken)
        .send({
          college_email: 'csrfuser@campus.edu',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── SEC-10: Token Invalidation on Password Reset / Version Bump ───────────
  describe('SEC-10: Invalidate JWT sessions on password reset / version bump', () => {
    it('rejects old JWT after password reset changes token_version', async () => {
      // 1. Create user and issue initial JWT (version = 0)
      const user = await createTestUser({
        college_email: 'reset_test@campus.edu',
        password: 'OriginalPassword123!'
      });

      const oldToken = jwt.sign(
        { id: String(user._id), role: user.role, token_version: 0 },
        process.env.JWT_SECRET || env.JWT_SECRET
      );

      // Verify old token works before reset
      const checkBefore = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${oldToken}`);
      expect(checkBefore.status).toBe(200);

      // 2. Perform password reset with reset token
      const rawResetToken = 'super-secret-one-time-reset-token';
      user.reset_token = hashToken(rawResetToken);
      user.reset_token_expires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: rawResetToken,
          new_password: 'NewStrongPassword123!'
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // 3. SEC-10 assertion: The previous JWT MUST now be rejected with 401
      const checkAfter = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${oldToken}`);

      expect(checkAfter.status).toBe(401);
      expect(checkAfter.body.success).toBe(false);
      expect(checkAfter.body.message).toMatch(/Session invalidated/i);

      // 4. Verify login with new password succeeds and gets new token version
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          college_email: 'reset_test@campus.edu',
          password: 'NewStrongPassword123!'
        });

      expect(loginRes.status).toBe(200);
      const newToken = loginRes.body.token;

      const checkNew = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newToken}`);
      expect(checkNew.status).toBe(200);
    });

    it('rejects requests from disabled user accounts with 403', async () => {
      const user = await createTestUser({ is_disabled: false });
      const token = jwt.sign(
        { id: String(user._id), role: user.role, token_version: user.token_version },
        process.env.JWT_SECRET || env.JWT_SECRET
      );

      // Disable account
      user.is_disabled = true;
      await user.save();

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Account has been disabled/i);
    });
  });

  // ── Cookies, Session Rotation & Hash-at-Rest ──────────────────────────────
  describe('Session Cookies, Token Rotation & Hash-at-Rest Storage', () => {
    it('sets HttpOnly access/refresh cookies on login and issues XSRF-TOKEN', async () => {
      await createTestUser({
        college_email: 'cookie_test@campus.edu',
        password: 'Password123!'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          college_email: 'cookie_test@campus.edu',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'] || [];

      // Verify access_token cookie
      const accessCookie = cookies.find((c) => c.startsWith('access_token='));
      expect(accessCookie).toBeDefined();
      expect(accessCookie).toMatch(/HttpOnly/i);

      // Verify refresh_token cookie
      const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toMatch(/HttpOnly/i);

      // Verify XSRF-TOKEN cookie (not HttpOnly so JS can read it)
      const xsrfCookie = cookies.find((c) => c.startsWith('XSRF-TOKEN='));
      expect(xsrfCookie).toBeDefined();
    });

    it('rotates session tokens via POST /api/auth/refresh', async () => {
      const user = await createTestUser();
      const refreshToken = jwt.sign(
        { id: String(user._id), token_version: user.token_version },
        process.env.JWT_SECRET || env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('stores SHA-256 hash of password reset token in database, not raw token', async () => {
      await createTestUser({
        college_email: 'forgot_hash@campus.edu'
      });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ college_email: 'forgot_hash@campus.edu' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedUser = await User.findOne({ college_email: 'forgot_hash@campus.edu' });
      expect(updatedUser.reset_token).toBeDefined();
      // SHA-256 hex string is exactly 64 characters
      expect(updatedUser.reset_token.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(updatedUser.reset_token)).toBe(true);
    });
  });
});
