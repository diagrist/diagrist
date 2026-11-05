import { type BudgetEntry, compareBudget } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { hardCounts, stressEntries, stressSet } from './stress.js';

const golden = new URL('__golden__/stress-activity.json', import.meta.url).pathname;
const { names, source } = stressSet(new URL('stress/activity/', import.meta.url));

/**
 * Hard rules a fixture still breaks, by picture, kept in the budget instead until the layout learns to avoid them
 * (`docs/burn-down.md`, "Stress set"). An exemption that is no longer needed fails, so it is removed with the fix.
 */
const PENDING: Readonly<Record<string, readonly string[]>> = {
  'entscheidungen-kette.dgr': ['label/near', 'label/overlap', 'ports/spacing', 'through', 'through/own'],
  'fuenf-bahnen.dgr': ['through'],
  'parallel-entscheidung.dgr': ['label/near', 'through'],
};

const entries: Record<string, BudgetEntry> = {};

describe('the stress set of activity diagrams', () => {
  it.each(names)('%s compiles and breaks no hard rule', (name) => {
    const { errors, entries: pictures } = stressEntries([umlPlugin], name, source(name));
    expect(errors).toEqual([]);
    for (const [picture, entry] of Object.entries(pictures)) {
      entries[picture] = entry;
      const pending = PENDING[picture] ?? [];
      const hard = hardCounts(entry);
      expect(Object.keys(hard).filter((k) => !pending.includes(k))).toEqual([]);
      expect(pending.filter((k) => hard[k] === undefined)).toEqual([]);
    }
  });

  it('keeps every count within its budget: crossings, jogs, parallels, bends and the rest may only fall', () => {
    expect(Object.keys(entries)).toHaveLength(names.length);
    expect(compareBudget(golden, entries)).toMatchObject({ status: expect.stringMatching(/^(match|written)$/) });
  });
});
