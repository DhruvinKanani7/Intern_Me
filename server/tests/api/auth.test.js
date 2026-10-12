import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { createTestUser } from '../helpers/seed.js';

describe('Auth API & Validation', () => {
  it('POST /api/auth/register fails validation (400) when college_email is not .edu or .ac.in', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'John Doe',
        college_email: 'johndoe@gmail.com',
        enrollment_no: 'ENR12345',
        password: 'Password123!'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors.some((e) => e.field === 'college_email')).toBe(true);
  });

  it('POST /api/auth/register fails validation (400) when password is weak', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'John Doe',
        college_email: 'john@college.edu',
        enrollment_no: 'ENR12345',
        password: 'weak'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });

  it('POST /api/auth/register succeeds with valid details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Valid Student',
        college_email: 'student@university.edu',
        enrollment_no: 'ENR999888',
        password: 'SecurePassword123!',
        course: 'Computer Science',
        college_name: 'MIT',
        year_of_study: 3
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.full_name).toBe('Valid Student');
    expect(res.body.data.password).toBeUndefined();
  });

  it('POST /api/auth/login authenticates verified user with correct credentials', async () => {
    await createTestUser({
      college_email: 'testuser@campus.edu',
      password: 'CorrectPassword123!'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        college_email: 'testuser@campus.edu',
        password: 'CorrectPassword123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });
});
