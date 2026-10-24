import { defineConfig } from 'tsdown';

/** Shared build settings. Packages inherit them in workspace mode. */
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'neutral',
  target: 'es2023',
  dts: true,
  sourcemap: true,
  clean: true,
  /** All packages are `"type": "module"`, so `.js` instead of `.mjs`, matching their exports. */
  fixedExtension: false,
});
