import { checkPlugin, compile, type Plugin } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { activityPlugin } from '../src/activity/index.js';
import { classPlugin } from '../src/class/index.js';
import { umlPlugin } from '../src/index.js';
import { sequencePlugin } from '../src/sequence/index.js';
import { statePlugin } from '../src/state/index.js';
import { usecasePlugin } from '../src/usecase/index.js';

/** The entry of each kind (ADR 0024), by the kind it draws. */
const ENTRIES: readonly (readonly [string, Plugin])[] = [
  ['sequence', sequencePlugin],
  ['usecase', usecasePlugin],
  ['activity', activityPlugin],
  ['class', classPlugin],
  ['state', statePlugin],
];

/** A source each kind draws, perhaps with warnings. */
const SMALLEST: Readonly<Record<string, string>> = {
  sequence: 'participant a "A"',
  usecase: 'actor a "A"',
  activity: 'action a "A"',
  class: 'class a "A"',
  state: 'state a "A"',
};

const source = (kind: string) => `diagram ${kind} "Test"\n${SMALLEST[kind]}\n`;

describe('the entry of a kind', () => {
  it.each(ENTRIES)('%s draws its kind and passes checkPlugin', (kind, plugin) => {
    expect(plugin.kinds.map((k) => k.spec.name)).toEqual([kind]);
    expect(checkPlugin(plugin)).toEqual([]);
    expect(compile(source(kind), { plugins: [plugin] }).svg).toContain('<svg');
  });

  it.each(ENTRIES)('%s draws the same bytes as the root entry', (kind, plugin) => {
    expect(compile(source(kind), { plugins: [plugin] }).svg).toBe(compile(source(kind), { plugins: [umlPlugin] }).svg);
  });

  it.each(ENTRIES)('%s knows none of the other kinds', (kind, plugin) => {
    const others = ENTRIES.map(([name]) => name).filter((name) => name !== kind);
    for (const other of others)
      expect(compile(source(other), { plugins: [plugin] }).diagnostics.map((d) => d.code)).toEqual(['K100']);
  });
});

describe('the root entry', () => {
  it('registers every kind entry, with all their messages and nothing else', () => {
    expect(umlPlugin.kinds).toEqual(ENTRIES.flatMap(([, plugin]) => plugin.kinds));
    const codes = ENTRIES.flatMap(([, plugin]) => Object.keys(plugin.messages));
    expect(Object.keys(umlPlugin.messages)).toEqual(codes);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
