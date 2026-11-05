import { type Drawing, lineFindings, linesOfDrawing, type Plugin } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { compileExample, exampleNames, plugins, source } from './compile.js';

/** The plugins with every kind's layout recorded, so the test reads what the kernel was handed. */
const drawings: Drawing[] = [];
const recorded: Plugin[] = plugins.map((p) => ({
  ...p,
  kinds: p.kinds.map((k) => ({ ...k, layout: (m, c) => drawings[drawings.push(k.layout(m, c)) - 1] as Drawing })),
}));

/** C4 sets its texts its label gap of 10 pixels from their line, which the line check takes as the farthest. */
const THRESHOLDS = { labelNear: 10 } as const;

/** The examples on a fixed grid, which route through its channels (ADR 0038). */
const fixed = exampleNames.filter((name) => !source(name).includes('layout=adaptive'));

describe('the lines of C4 pictures on a fixed grid', () => {
  it.each(fixed)('%s breaks no hard rule of the line check and places nothing on anything', (name) => {
    drawings.length = 0;
    const { pictures, diagnostics } = compileExample(name, undefined, recorded);
    const found = drawings
      .slice(-pictures.length)
      .flatMap((d, i) =>
        lineFindings(linesOfDrawing(d), THRESHOLDS).map((f) => ({ picture: pictures[i]?.variant, ...f })),
      );
    expect(found).toEqual([]);
    expect(diagnostics.filter((d) => d.code.startsWith('G4'))).toEqual([]);
  });
});
