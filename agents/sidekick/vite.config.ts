/// <reference types="vitest/config" />
import { configDefaults } from 'vitest/config';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1' },
  // Playwright owns the extension's end-to-end specs.
  test: { exclude: [...configDefaults.exclude, 'extension/e2e/**'] },
});
