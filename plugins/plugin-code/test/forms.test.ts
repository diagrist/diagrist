import { formCounts } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { compileCode, exampleNames } from './compile.js';

describe('node forms', () => {
  it.each(exampleNames)('%s draws every card as a box', (name) => {
    expect(Object.keys(formCounts(compileCode(name).pictures))).toEqual(['box']);
  });

  it.each([
    ['ueberweisung/aufruf.dgr', 3],
    ['ueberweisung/konfiguration.dgr', 2],
  ])('%s has %i cards', (name, cards) => {
    expect(formCounts(compileCode(name).pictures)).toEqual({ box: cards });
  });
});
