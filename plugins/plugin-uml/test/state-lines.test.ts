import { compile, type Drawing, type Plugin } from '@diagrist/core';
import { type LineFinding, lineFindings, linesOfDrawing } from '@diagrist/layout-grid';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { stateNames, stateSource } from './compile.js';

/** The plugin with every kind's layout recorded, so the test reads what the kernel was handed. */
const drawings: Drawing[] = [];
const recorded: Plugin = {
  ...umlPlugin,
  kinds: umlPlugin.kinds.map((k) => ({
    ...k,
    layout: (m, c) => drawings[drawings.push(k.layout(m, c)) - 1] as Drawing,
  })),
};

/** The findings of the line check for the first picture of a source. */
function findingsOf(source: string): LineFinding[] {
  drawings.length = 0;
  compile(source, { plugins: [recorded] });
  return lineFindings(linesOfDrawing(drawings[0] as Drawing));
}

/**
 * Breaches a picture cannot avoid yet, by example, as `rule detail edges`. `fahrgastraum` runs two back edges
 * between the same states, Niedrig and Hoch, on one side, and a skip edge out of Leer beside a back edge into it:
 * nested rails are the only way without a crossing, and nested rails dock in the opposite order of their other
 * ends, which Q8 reads as interleaved. The rule should tell nested rails from interleaved ports.
 */
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  'fahrgastraum.dgr': ['ports order 1 3', 'ports order 5 9', 'ports order 5 9'],
};

const key = (f: LineFinding) => [f.rule, f.detail ?? '', ...f.edges].join(' ');

/** A state with three ways down to states of other widths, then two of them to one state: steps on tracks. */
const fanned = (direction: string) =>
  [
    `diagram state "Fanned" direction=${direction}`,
    'initial s',
    'state a "Accepted with a long name"',
    'state b "Checked"',
    'state c "C"',
    'state d "Shipped"',
    'state e "Done well"',
    'final f',
    'go s -> a',
    'go a -> b on="x"',
    'go a -> c on="y"',
    'go a -> d on="z"',
    'go b -> e',
    'go d -> e',
    'go c -> f',
    'go e -> f',
  ].join('\n');

describe('the lines of state machines', () => {
  it.each([...stateNames].sort())('%s breaks no hard rule of the line check but the allowed ones', (name) => {
    expect(findingsOf(stateSource(name)).map(key).sort()).toEqual([...(ALLOWED[name] ?? [])].sort());
  });

  it.each(['down', 'right'])('steps forward transitions on tracks without a breach, flowing %s', (direction) => {
    expect(findingsOf(fanned(direction))).toEqual([]);
  });
});
