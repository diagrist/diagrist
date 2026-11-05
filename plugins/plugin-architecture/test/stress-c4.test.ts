import { type BudgetEntry, compareBudget } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { architecturePlugin } from '../src/index.js';
import { hardCounts, stressEntries, stressSet } from './stress.js';

const golden = new URL('__golden__/stress-c4.json', import.meta.url).pathname;
const { names, source } = stressSet(new URL('stress/c4/', import.meta.url));

/** Placement findings a C4 picture never shows either: a text or box on another (G400), a text past its frame (G402). */
const PLACEMENT = ['G400', 'G402'];

/**
 * Hard rules a fixture still breaks, by picture, kept in the budget instead until the layout learns to avoid them
 * (`docs/burn-down.md`, "Stress set"). An exemption that is no longer needed fails, so it is removed with the fix.
 */
const PENDING: Readonly<Record<string, readonly string[]>> = {
  'adaptiv-spannen.dgr': ['G400/covered', 'G400/texts', 'label/overlap'],
  'beide-richtungen.dgr': ['ports/order'],
  'diff-entfernt.dgr#ziel': ['G400/covered', 'label/overlap', 'through'],
  'komponenten-zehn.dgr': ['G400/texts', 'label/overlap', 'ports/spacing'],
  'kontext-stern.dgr': ['G400/covered', 'label/overlap'],
  'lange-texte.dgr': ['G400/covered', 'label/near', 'label/overlap', 'through'],
  'papier-entscheidungen.dgr': ['label/near', 'through'],
  'spalten-look.dgr': ['G400/covered', 'label/near', 'label/overlap', 'ports/order', 'ports/spacing', 'through'],
  'zwei-fluesse.dgr': ['G402'],
};

const entries: Record<string, BudgetEntry> = {};

describe('the stress set of C4 pictures', () => {
  it.each(names)('%s compiles and breaks no hard rule in any of its pictures', (name) => {
    const { errors, entries: pictures } = stressEntries([architecturePlugin], name, source(name), PLACEMENT);
    expect(errors).toEqual([]);
    for (const [picture, entry] of Object.entries(pictures)) {
      entries[picture] = entry;
      const pending = PENDING[picture] ?? [];
      const hard = hardCounts(entry, PLACEMENT);
      expect(Object.keys(hard).filter((k) => !pending.includes(k))).toEqual([]);
      expect(pending.filter((k) => hard[k] === undefined)).toEqual([]);
    }
  });

  it('keeps every count within its budget: crossings, jogs, parallels, bends and the rest may only fall', () => {
    expect(new Set(Object.keys(entries).map((k) => k.split('#')[0])).size).toBe(names.length);
    const result = compareBudget(golden, entries);
    expect(result.status === 'written' ? { status: 'match' } : result).toEqual({ status: 'match' });
  });
});
