import type { Drawing, Plugin } from '@diagrist/core';
import { lineFindings, linesOfDrawing } from '@diagrist/layout-grid';
import { describe, expect, it } from 'vitest';
import { compileExample, exampleNames, plugins } from './compile.js';

/** The plugins with every kind's layout recorded, so the test reads what the kernel was handed. */
const drawings: Drawing[] = [];
const recorded: Plugin[] = plugins.map((p) => ({
  ...p,
  kinds: p.kinds.map((k) => ({ ...k, layout: (m, c) => drawings[drawings.push(k.layout(m, c)) - 1] as Drawing })),
}));

/**
 * Pictures in columns keep the grid's router until they take the layered one; their findings are recorded in the
 * metrics table, not asserted here.
 */
const IN_COLUMNS = new Set([
  'bank/kredit.dgr',
  'bank/zahlungsverkehr.dgr',
  'bank/iks.vocab.dgr',
  'radverleih/belege.dgr',
]);

describe('the lines of concept pictures in layers and hubs', () => {
  const layered = exampleNames.filter((n) => !IN_COLUMNS.has(n));

  it.each(layered)('%s breaks no hard rule of the line check (plan Q1–Q9)', (name) => {
    drawings.length = 0;
    const { pictures } = compileExample(name, undefined, {}, recorded);
    for (const drawing of drawings.slice(-pictures.length)) expect(lineFindings(linesOfDrawing(drawing))).toEqual([]);
  });
});
