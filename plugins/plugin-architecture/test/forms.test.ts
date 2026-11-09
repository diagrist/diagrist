import { formCounts } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { compileExample, exampleNames, source } from './compile.js';

/** The elements of an example without a form: only a block of nothing but its name has no body. */
const unformed = (name: string) =>
  compileExample(name)
    .pictures.flatMap((p) => p.anchors?.nodes ?? [])
    .filter((n) => n.form === undefined)
    .map((n) => n.id);

const inCards = (name: string) => source(name).replace(/^(diagram .*)$/m, '$1 look=cards');

/** Forms by example and look: boxes rounded only in the plain look and in blocks, circles in cards, figures. */
const COUNTS: readonly (readonly [string, string | undefined, Record<string, number>])[] = [
  ['radverleih/kontext.dgr', undefined, { rounded: 4, symbol: 2 }],
  ['radverleih/kontext-paper.dgr', undefined, { box: 4, symbol: 2 }],
  ['architecture/cloud.dgr', undefined, { cylinder: 3, rounded: 11 }],
  ['architecture/cloud.dgr', 'cards', { box: 10, circle: 4 }],
  ['patterns/mediator.dgr', undefined, { queue: 4, rounded: 22 }],
  ['radverleih/komponenten-columns.dgr', undefined, { box: 9 }],
  ['patterns/layered.dgr', undefined, { cylinder: 4, none: 1, rounded: 9 }],
];

describe('node forms', () => {
  it.each(exampleNames)('%s gives every element the form of its body', (name) => {
    expect(unformed(name)).toEqual(name === 'patterns/layered.dgr' ? ['request'] : []);
  });

  it.each(COUNTS)('%s in look %s draws its elements in these forms', (name, look, counts) => {
    const text = look === 'cards' ? inCards(name) : source(name);
    expect(formCounts(compileExample(name, text).pictures)).toEqual(counts);
  });
});
