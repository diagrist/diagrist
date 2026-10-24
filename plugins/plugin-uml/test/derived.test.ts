import { fileURLToPath } from 'node:url';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { activityKind } from '../src/activity/kind.js';
import { classKind } from '../src/class/kind.js';
import { umlPlugin } from '../src/index.js';
import { sequenceKind } from '../src/sequence/kind.js';
import { ACTIVITIES } from '../src/spec/activities.js';
import { CLASSES } from '../src/spec/classes.js';
import { claimsOf } from '../src/spec/coverage.js';
import { INTERACTIONS } from '../src/spec/interactions.js';
import { type CoveredKind, coverageReport } from '../src/spec/report.js';
import { STATE_MACHINES } from '../src/spec/state-machines.js';
import { USE_CASES } from '../src/spec/use-cases.js';
import { stateKind } from '../src/state/kind.js';
import { usecaseKind } from '../src/usecase/kind.js';
import { examplesOf } from './compile.js';

/** The examples of a kind as the coverage report lists them: by name without `.dgr`, with their source. */
const examples = (kind: string): CoveredKind['examples'] => {
  const { names, source } = examplesOf(kind);
  return names.map((file) => ({ name: file.slice(0, -'.dgr'.length), source: source(file) }));
};

const KINDS: readonly CoveredKind[] = [
  { kind: sequenceKind, chapter: 'chapter 17, Interactions', catalog: INTERACTIONS, examples: examples('sequence') },
  { kind: usecaseKind, chapter: 'chapter 18, Use Cases', catalog: USE_CASES, examples: examples('usecase') },
  {
    kind: activityKind,
    chapter: 'chapters 15, Activities, and 16, Actions',
    catalog: ACTIVITIES,
    examples: examples('activity'),
  },
  {
    kind: classKind,
    chapter: 'chapters 9 to 12, Classification, Simple and Structured Classifiers, Packages',
    catalog: CLASSES,
    examples: examples('class'),
  },
  {
    kind: stateKind,
    chapter: 'chapter 14, State Machines',
    catalog: STATE_MACHINES,
    examples: examples('state'),
  },
];

const report = fileURLToPath(new URL('../docs/spec-coverage.md', import.meta.url));

describe('the UML catalogs', () => {
  it('exist for every kind of the plugin, one catalog each', () => {
    expect(KINDS.map((k) => k.kind.spec.name)).toEqual(umlPlugin.kinds.map((kind) => kind.spec.name));
    expect(new Set(KINDS.map((k) => k.catalog)).size).toBe(KINDS.length);
  });

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
