import { defineConfig } from 'vitest/config';

// Unit/integration tests only (tests/). The Playwright a11y specs live in e2e/
// and are excluded so they don't run under vitest.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    testTimeout: 30000,
  },
});
