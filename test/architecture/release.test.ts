import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { repository } from './source.js';

/** The fields of a published package.json this test reads. */
interface Published {
  readonly name: string;
  readonly version: string;
  readonly private?: boolean;
  readonly license?: string;
  readonly homepage?: string;
  readonly bugs?: string;
  readonly repository?: { readonly url?: string; readonly directory?: string };
  readonly engines?: { readonly node?: string };
  readonly files?: readonly string[];
  readonly publishConfig?: { readonly access?: string; readonly provenance?: boolean };
}

const read = <T>(path: string): T => JSON.parse(readFileSync(join(repository, path), 'utf8')) as T;
const root = read<Published>('package.json');
const published = ['packages', 'plugins']
  .flatMap((group) => readdirSync(join(repository, group)).map((name) => `${group}/${name}`))
  .filter((dir) => existsSync(join(repository, dir, 'package.json')))
  .map((dir) => ({ dir, manifest: read<Published>(`${dir}/package.json`) }))
  .filter(({ manifest }) => manifest.private !== true);

/**
 * Every package npm receives carries the same release metadata, so a new package cannot be published without a
 * licence, a link to its sources, provenance or the NOTICE, and all share one version (`docs/release/README.md`).
 */
describe('published packages', () => {
  it.each(published)('$dir has the release metadata', ({ dir, manifest }) => {
    expect(manifest).toMatchObject({
      license: 'Apache-2.0',
      homepage: expect.stringMatching(/^https:\/\/github\.com\/diagrist\/diagrist\//),
      bugs: 'https://github.com/diagrist/diagrist/issues',
      repository: { url: 'git+https://github.com/diagrist/diagrist.git', directory: dir },
      engines: { node: root.engines?.node },
      publishConfig: { access: 'public', provenance: true },
    });
    expect(manifest.files).toEqual(expect.arrayContaining(['dist', 'NOTICE']));
  });

  it('share one version, which Changesets keeps by fixing them together', () => {
    expect(new Set(published.map(({ manifest }) => manifest.version)).size).toBe(1);
    const { fixed } = read<{ fixed: string[][] }>('.changeset/config.json');
    const names = published.map(({ manifest }) => manifest.name);
    const group = fixed.find((patterns) => patterns.includes('@diagrist/*')) ?? [];
    expect(names.filter((name) => !name.startsWith('@diagrist/') && !group.includes(name))).toEqual([]);
  });
});
