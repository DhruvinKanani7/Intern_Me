import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import errorHandler from '../../middleware/errorHandler.js';
import requestIdMiddleware from '../../middleware/requestId.js';
import app from '../../index.js';
import { createTestUser } from '../helpers/seed.js';

describe('Central Error Handler & Boundaries', () => {
  it('maps MongoDB duplicate key (11000) to 409 Conflict', async () => {
    const testApp = express();
    testApp.use(requestIdMiddleware);
    testApp.get('/test/duplicate-key', (req, res, next) => {
      const duplicateErr = new Error('E11000 duplicate key error collection: interncert.users index: college_email_1 dup key');
      duplicateErr.code = 11000;
      duplicateErr.keyPattern = { college_email: 1 };
      next(duplicateErr);
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test/duplicate-key');

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('A duplicate entry already exists for: college_email');
    expect(res.body.request_id).toBeDefined();
  });

  it('maps CastError to 400 Bad Request without leaking internal details', async () => {
    const testApp = express();
    testApp.use(requestIdMiddleware);
    testApp.get('/test/cast-error', (req, res, next) => {
      const castErr = new mongoose.Error.CastError('ObjectId', 'invalid-id-123', 'user_id');
      next(castErr);
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test/cast-error');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid format for field: user_id');
    expect(res.body.request_id).toBeDefined();
  });

  it('masks unhandled errors as generic 500 Internal server error with request_id', async () => {
    const testApp = express();
    testApp.use(requestIdMiddleware);
    testApp.get('/test/unhandled-boom', (req, res, next) => {
      next(new Error('Sensitive database credentials leak or internal crash'));
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test/unhandled-boom');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Internal server error');
    // Ensure the sensitive message is never exposed to the client
    expect(JSON.stringify(res.body)).not.toContain('Sensitive database credentials');
    expect(res.body.request_id).toBeDefined();
  });

  it('rejects payloads larger than 100kb with 413 Payload Too Large', async () => {
    const largeString = 'a'.repeat(110 * 1024); // 110 KB
    const res = await request(app)
      .post('/api/auth/login')
      .send({ college_email: 'test@college.edu', password: largeString });

    expect(res.status).toBe(413);
  });
});
