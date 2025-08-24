import { defineConfig } from 'vite';

export default defineConfig({
  // Use repo name for GitHub Pages project site
  base: '/Choppa/',
  server: {
    open: true,
  },
  build: {
    sourcemap: true,
    target: 'es2020',
  },
});
