import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { compareBudget } from '../src/index.js';

let file: string;
beforeEach(() => {
  file = join(mkdtempSync(join(tmpdir(), 'diagrist-budget-')), 'budget.json');
});

const entry = (jog: number, length = 100) => ({ counts: { jog }, measures: { length } });

describe('compareBudget', () => {
  it('records a new budget on update and matches it afterwards', () => {
    expect(compareBudget(file, { a: entry(2) }, { update: false }).status).toBe('changed');
    expect(compareBudget(file, { a: entry(2) }, { update: true })).toEqual({ status: 'written', reason: 'missing' });
    expect(compareBudget(file, { a: entry(2) }, { update: false })).toEqual({ status: 'match' });
  });

  it('refuses a count that rose, even on update', () => {
    compareBudget(file, { a: entry(1) }, { update: true });
    const before = readFileSync(file, 'utf8');
    const rises = [{ entry: 'a', count: 'jog', budget: 1, actual: 2 }];
    expect(compareBudget(file, { a: entry(2) }, { update: true })).toEqual({ status: 'risen', rises });
    expect(readFileSync(file, 'utf8')).toBe(before);
  });

  it('allows no count the budget of an entry does not name', () => {
    writeFileSync(file, JSON.stringify({ a: { counts: {} } }));
    expect(compareBudget(file, { a: entry(1) }, { update: true }).status).toBe('risen');
  });

  it('asks to record a count that fell or a measure that moved, naming the entry', () => {
    compareBudget(file, { a: entry(2), b: entry(0) }, { update: true });
    expect(compareBudget(file, { a: entry(1), b: entry(0) }, { update: false })).toEqual({
      status: 'changed',
      entries: ['a'],
    });
    expect(compareBudget(file, { a: entry(2), b: entry(0, 90) }, { update: false })).toEqual({
      status: 'changed',
      entries: ['b'],
    });
    expect(compareBudget(file, { a: entry(1), b: entry(0) }, { update: true }).status).toBe('written');
  });
});
