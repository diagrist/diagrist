import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsdown';
import { shared } from '../../tsdown.config.ts';

/** The fields of an export in package.json that name the source and the built file of an entry. */
interface Entry {
  readonly '@diagrist/source': string;
  readonly default: string;
}

const { exports } = JSON.parse(readFileSync(new URL('package.json', import.meta.url), 'utf8')) as {
  readonly exports: Readonly<Record<string, Entry>>;
};

/**
 * One entry per export of package.json, the root that registers every UML kind and one subpath per kind (ADR 0024),
 * each built under the name its export points to, such as `dist/sequence.js` from `src/sequence/index.ts`.
 */
export default defineConfig({
  ...shared,
  entry: Object.fromEntries(
    Object.values(exports).map((entry) => [
      entry.default.replace(/^\.\/dist\//, '').replace(/\.js$/, ''),
      entry['@diagrist/source'],
    ]),
  ),
});
