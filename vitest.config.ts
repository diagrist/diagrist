import { existsSync, readdirSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

/**
 * One test project per package under packages/ and plugins/, plus the architecture tests.
 * Defined inline so every project inherits the settings below; projects referenced as folders would not.
 */
const projectRoots = [
  ...['packages', 'plugins'].flatMap((group) =>
    existsSync(group)
      ? readdirSync(group, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => `${group}/${entry.name}`)
      : [],
  ),
  'test/architecture',
];

export default defineConfig({
  /** Packages resolve each other through their source (export condition "@diagrist/source"), not dist/. */
  resolve: { conditions: ['@diagrist/source'] },
  test: {
    projects: projectRoots.map((root) => ({ test: { name: root.split('/').at(-1) ?? root, root } })),
    /** More workers than cores caused timeouts in the predecessor project. */
    maxWorkers: '50%',
    /** A test that passes only on a second try is a bug, not bad luck. */
    retry: 0,
    /** A forgotten `.only` must not silently skip the rest of the suite in CI. */
    allowOnly: !process.env.CI,
  },
});
