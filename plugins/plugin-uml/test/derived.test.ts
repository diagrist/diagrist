import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { sequence } from '../src/sequence/kind.js';
import { claimsOf } from '../src/spec/coverage.js';
import { INTERACTIONS } from '../src/spec/interactions.js';
import { type CoveredKind, coverageReport } from '../src/spec/report.js';
import { USE_CASES } from '../src/spec/use-cases.js';
import { usecase } from '../src/usecase/kind.js';

const examplesOf = (kind: string): CoveredKind['examples'] => {
  const folder = new URL(`../examples/${kind}/`, import.meta.url);
  return readdirSync(folder)
    .filter((file) => file.endsWith('.dgr'))
    .map((file) => ({ name: file.slice(0, -'.dgr'.length), source: readFileSync(new URL(file, folder), 'utf8') }));
};

const KINDS: readonly CoveredKind[] = [
  { kind: sequence, chapter: 'chapter 17, Interactions', catalog: INTERACTIONS, examples: examplesOf('sequence') },
  { kind: usecase, chapter: 'chapter 18, Use Cases', catalog: USE_CASES, examples: examplesOf('usecase') },
];

const report = fileURLToPath(new URL('../docs/spec-coverage.md', import.meta.url));

describe('the UML catalogs', () => {
  it.each(KINDS.map((k) => [k.kind.spec.name, k] as const))(
    'are what the tables and rules of %s point at, never an element of another catalog or one written inline',
    (_, { kind, catalog }) => {
      const own = new Set(Object.values(catalog));
      const strays = claimsOf(kind).filter((claim) => !own.has(claim.element));
      expect(
        strays.map((claim) => `${JSON.stringify(claim.by)}: ${claim.element.section} ${claim.element.title}`),
      ).toEqual([]);
    },
  );

  it('give every element a section of UML 2.5.1 and a title of its own', () => {
    const elements = KINDS.flatMap((k) => Object.values(k.catalog));
    expect(elements.filter((e) => !/^\d+(\.\d+)+$/.test(e.section)).map((e) => e.title)).toEqual([]);
    for (const { catalog } of KINDS) {
      const titles = Object.values(catalog).map((e) => e.title);
      expect(titles.filter((t, i) => titles.indexOf(t) !== i)).toEqual([]);
    }
  });
});

describe('the coverage report', () => {
  it('is what the catalogs and the marks generate (regenerate with `pnpm docs:generate`)', () => {
    const result = compareGolden(report, coverageReport(KINDS));
    expect(result.status, 'docs/spec-coverage.md is out of date; run `pnpm docs:generate`').not.toBe('mismatch');
  });
});
