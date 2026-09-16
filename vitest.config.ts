import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/pages/api/search.ts', 'src/pages/api/reviews.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
});