import { describe, it, expect, vi } from 'vitest';
import { validateEnv } from '../../config/env.js';

describe('Environment Schema & Fail-Fast Boot', () => {
  it('exits with non-zero code when required MONGODB_URI is missing', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with ${code}`);
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      validateEnv({
        NODE_ENV: 'development',
        JWT_SECRET: 'supersecretkey123',
        FRONTEND_URL: 'http://localhost:5173',
        MONGODB_URI: ''
      });
    }).toThrow('process.exit called with 1');

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('exits with non-zero code in production when JWT_SECRET is less than 32 characters', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with ${code}`);
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      validateEnv({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017/prod',
        FRONTEND_URL: 'https://interncert.com',
        JWT_SECRET: 'short-secret'
      });
    }).toThrow('process.exit called with 1');

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
