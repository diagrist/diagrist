import { formCounts } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { compileExample, exampleNames } from './compile.js';

/** The matrices: their columns and rows are lines of a table, which no form of a body describes. */
const TABLES = ['radverleih/abdeckung.dgr', 'radverleih/objekte.dgr', 'radverleih/zustaendigkeiten.dgr'];

/** Forms by example: items by the shape of their type, matrices without forms. */
const COUNTS: readonly (readonly [string, Record<string, number>])[] = [
  ['bank/kredit.dgr', { box: 5, file: 3, rounded: 2 }],
  ['radverleih/erweiterungen.dgr', { box: 1, cylinder: 1, rounded: 8 }],
  ['bank/iks.vocab.dgr', { box: 2, file: 1, rounded: 1 }],
  ['radverleih/abdeckung.dgr', { none: 9 }],
  ['radverleih/objekte.dgr', { none: 10 }],
];

describe('node forms', () => {
  it.each(exampleNames)('%s gives every item the form of its body, and no line of a matrix one', (name) => {
    const forms = Object.keys(formCounts(compileExample(name).pictures));
    if (TABLES.includes(name)) expect(forms).toEqual(['none']);
    else expect(forms).not.toContain('none');
  });

  it.each(COUNTS)('%s draws its nodes in these forms', (name, counts) => {
    expect(formCounts(compileExample(name).pictures)).toEqual(counts);
  });
});
