import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@sim': resolve(here, 'src/sim'),
      '@render': resolve(here, 'src/render'),
      '@ui': resolve(here, 'src/ui'),
      '@content': resolve(here, 'src/content'),
      '@mods': resolve(here, 'src/mods'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: ['default'],
  },
});
