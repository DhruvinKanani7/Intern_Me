import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../index.js';

describe('Verification API', () => {
  it('GET /api/verify/:internshipCode returns not found for non-existent certificate', async () => {
    const res = await request(app).get('/api/verify/IC-NONEXISTENT-999');

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.message).toBe('Certificate not found');
  });

  it('GET /api/verify/:internshipCode fails validation on code that is too short', async () => {
    const res = await request(app).get('/api/verify/x');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
  });
});
