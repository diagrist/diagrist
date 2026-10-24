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
  /**
   * No source maps, for code or declarations: they would point into `src/`, which is not published, and made up
   * two thirds of the tarballs. The declaration maps are off here because the root tsconfig turns them on for `tsc`.
   */
  dts: { sourcemap: false },
  sourcemap: false,
  /**
   * Everything below `dist` goes before a build, so nothing of an earlier one, such as source maps from when they were
   * on or chunks of a renamed entry, reaches a tarball; `test/package/check.ts` fails on such leftovers. Written as a
   * glob of the files, because a bare `dist` relies on tsdown expanding the folder it then keeps.
   */
  clean: ['dist/**'],
  /** All packages are `"type": "module"`, so `.js` instead of `.mjs`, matching their exports. */
  fixedExtension: false,
};

export default defineConfig(shared);
