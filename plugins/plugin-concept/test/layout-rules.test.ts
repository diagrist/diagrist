import { type Drawing, lineFindings, linesOfDrawing, type Plugin } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { compileExample, exampleNames, plugins } from './compile.js';

/** The plugins with every kind's layout recorded, so the test reads what the kernel was handed. */
const drawings: Drawing[] = [];
const recorded: Plugin[] = plugins.map((p) => ({
  ...p,
  kinds: p.kinds.map((k) => ({ ...k, layout: (m, c) => drawings[drawings.push(k.layout(m, c)) - 1] as Drawing })),
}));

describe('the lines of concept pictures', () => {
  it.each(exampleNames)('%s breaks no hard rule of the line check (plan Q1–Q9)', (name) => {
    drawings.length = 0;
    const { pictures } = compileExample(name, undefined, {}, recorded);
    for (const drawing of drawings.slice(-pictures.length)) expect(lineFindings(linesOfDrawing(drawing))).toEqual([]);
  });
});
