import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    threads: false,
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
