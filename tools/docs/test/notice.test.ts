import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const notice = readFileSync(`${root}NOTICE`, 'utf8');

/** Every package npm receives: those under packages/ and plugins/ that are not private. */
const published = ['packages', 'plugins'].flatMap((group) =>
  readdirSync(`${root}${group}`)
    .map((name) => `${group}/${name}`)
    .filter((dir) => existsSync(`${root}${dir}/package.json`))
    .filter((dir) => JSON.parse(readFileSync(`${root}${dir}/package.json`, 'utf8')).private !== true),
);

/**
 * The Apache License asks every copy to carry the NOTICE, and npm packs only what lies inside a package, so each
 * published package holds a copy of the root NOTICE. The root file is the source; `pnpm docs:generate` copies it.
 */
describe('the NOTICE of a published package', () => {
  it.each(published)('%s/NOTICE is the root NOTICE (copy it with `pnpm docs:generate`)', (dir) => {
    const result = compareGolden(`${root}${dir}/NOTICE`, notice);
    expect(result.status, `${dir}/NOTICE differs from NOTICE; run \`pnpm docs:generate\``).not.toBe('mismatch');
  });
});
