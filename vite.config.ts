import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  // isola do postcss/tailwind do projeto-pai (site da ZD), que não tem relação com este
  css: { postcss: { plugins: [] } },
  test: { environment: 'node' },
});
