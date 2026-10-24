import { defineConfig, type UserConfig } from 'tsdown';

/**
 * Build settings of every package. `tsdown --workspace` applies them to packages without a config of their own;
 * a package with its own config spreads them, so `pnpm --filter <package> build` writes the same file names as
 * `pnpm build`, the names `exports` and `bin` in package.json point to.
 */
export const shared: UserConfig = {
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'neutral',
  target: 'es2023',
  dts: true,
  sourcemap: true,
  clean: true,
  /** All packages are `"type": "module"`, so `.js` instead of `.mjs`, matching their exports. */
  fixedExtension: false,
};

export default defineConfig(shared);
