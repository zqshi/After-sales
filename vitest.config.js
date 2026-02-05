import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['assets/js/**/*.{spec,test}.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['assets/js/**'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'backend/',
        'agentscope-service/',
        'WeKnora/',
      ],
    },
  },
});
