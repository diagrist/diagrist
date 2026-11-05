import { type Drawing, lineFindings, linesOfDrawing, type Plugin } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { context } from '../src/kinds.js';
import { compileExample, exampleNames, plugins } from './compile.js';

/** The plugins with every kind's layout recorded, so the test reads what the kernel was handed. */
const drawings: Drawing[] = [];
const recorded: Plugin[] = plugins.map((p) => ({
  ...p,
  kinds: p.kinds.map((k) => ({ ...k, layout: (m, c) => drawings[drawings.push(k.layout(m, c)) - 1] as Drawing })),
}));

/** The thresholds the C4 kinds ask the kernel's line check for. */
const check = context.lineCheck;
const THRESHOLDS = check === false || check === undefined ? {} : check;

describe('the lines of C4 pictures', () => {
  it("take part in the kernel's line check", () => {
    expect(check).not.toBe(false);
  });

  it.each(exampleNames)('%s breaks no hard rule of the line check and places nothing on anything', (name) => {
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
