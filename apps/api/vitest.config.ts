import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./test/globalSetup.ts'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      JWT_ACCESS_SECRET: 'test-access-secret-that-is-at-least-32-characters',
      AUTH_CODE_SECRET: 'test-code-secret-that-is-at-least-32-characters!',
      EMAIL_PROVIDER: 'log',
      RATE_LIMIT_ENABLED: 'false',
      ARGON2_MEMORY_KIB: '4096',
      CORS_ORIGINS: 'http://localhost:5173',
    },
  },
});
