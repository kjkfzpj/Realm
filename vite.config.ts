import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  base: './',
  publicDir: resolve(here, 'assets'),
  resolve: {
    alias: {
      '@sim': resolve(here, 'src/sim'),
      '@render': resolve(here, 'src/render'),
      '@ui': resolve(here, 'src/ui'),
      '@content': resolve(here, 'src/content'),
      '@mods': resolve(here, 'src/mods'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: resolve(here, 'dist'),
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
  },
});
