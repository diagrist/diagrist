import { resolve } from 'node:path';
import { defaultClientConditions, defineConfig } from 'vite';

/**
 * Two pages from one build: the editor and the bare picture for iframes. Packages resolve through their source,
 * like in the tests, so the editor needs no `pnpm build` of the workspace first.
 */
export default defineConfig({
  resolve: { conditions: ['@diagrist/source', ...defaultClientConditions] },
  worker: { format: 'es' },
  server: { host: '127.0.0.1', fs: { allow: ['../..'] } },
  build: {
    target: 'es2023',
    rollupOptions: {
      input: { editor: resolve(import.meta.dirname, 'index.html'), embed: resolve(import.meta.dirname, 'embed.html') },
    },
  },
});
