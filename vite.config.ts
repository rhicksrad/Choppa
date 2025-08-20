import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    open: true,
  },
  build: {
    sourcemap: true,
    target: 'es2020',
  },
});
