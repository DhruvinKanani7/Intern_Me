import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { createTestInternship } from '../helpers/seed.js';

describe('Internships API', () => {
  it('GET /api/internships returns list of active internships', async () => {
    await createTestInternship({ category_code: 'PY101', category_name: 'Python Developer' });

    const res = await request(app).get('/api/internships');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((i) => i.category_code === 'PY101')).toBe(true);
  });

  it('GET /api/internships/:code returns single internship by code', async () => {
    await createTestInternship({ category_code: 'REACT5', category_name: 'React Frontend' });

    const res = await request(app).get('/api/internships/REACT5');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category_code).toBe('REACT5');
  });

  it('GET /api/internships/:code returns 404 for unknown code', async () => {
    const res = await request(app).get('/api/internships/UNKNOWN999');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
