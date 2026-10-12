import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 180000,
    fileParallelism: false,
    setupFiles: ['./tests/setup.js']
  }
});
