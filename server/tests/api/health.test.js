import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../index.js';

describe('Health and Request ID', () => {
  it('GET /api/health returns 200, success flag, and propagates request_id', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('X-Request-Id', 'custom-test-id-123');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('InternCert API running');
    expect(res.body.request_id).toBe('custom-test-id-123');
    expect(res.headers['x-request-id']).toBe('custom-test-id-123');
  });

  it('GET /api/health generates a random UUID if X-Request-Id header is omitted', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.request_id).toBeDefined();
    expect(res.headers['x-request-id']).toBe(res.body.request_id);
  });
});
