import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Relative paths so the build works from any folder on the host.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2500,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
