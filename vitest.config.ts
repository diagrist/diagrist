import { existsSync, readdirSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

/**
 * One test project per package under packages/, plugins/ and tools/, plus the architecture tests.
 * Defined inline so every project inherits the settings below; projects referenced as folders would not.
 */
const projectRoots = [
  ...['packages', 'plugins', 'tools'].flatMap((group) =>
    existsSync(group)
      ? readdirSync(group, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => `${group}/${entry.name}`)
      : [],
  ),
  'test/architecture',
];

/** Packages resolve each other through their source (export condition "@diagrist/source"), not dist/. */
const SOURCE_CONDITIONS = ['@diagrist/source'];

export default defineConfig({
  resolve: { conditions: SOURCE_CONDITIONS },
  /** Tests run in the server environment, whose resolver has its own conditions; without them it needs dist/. */
  ssr: { resolve: { conditions: SOURCE_CONDITIONS } },
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
