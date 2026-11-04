import { compile, type Drawing, type Plugin } from '@diagrist/core';
import { lineFindings, linesOfDrawing } from '@diagrist/layout-grid';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { classNames, classSource } from './compile.js';

/** The plugin with every kind's layout recorded, so the test reads what the kernel was handed. */
const drawings: Drawing[] = [];
const recorded: Plugin = {
  ...umlPlugin,
  kinds: umlPlugin.kinds.map((k) => ({
    ...k,
    layout: (m, c) => drawings[drawings.push(k.layout(m, c)) - 1] as Drawing,
  })),
};

describe('the lines of class diagrams on the layered pipeline', () => {
  it.each(classNames)('%s breaks no hard rule of the line check (plan Q1–Q9)', (name) => {
    drawings.length = 0;
    const { pictures } = compile(classSource(name), { plugins: [recorded] });
    for (const drawing of drawings.slice(-pictures.length)) expect(lineFindings(linesOfDrawing(drawing))).toEqual([]);
  });

  it('counts the tab of a package as the head of its frame, which lines keep clear of', () => {
    drawings.length = 0;
    compile(classSource('pakete.dgr'), { plugins: [recorded] });
    const input = linesOfDrawing(drawings[0] as Drawing);
    expect(input.frames?.find((f) => f.id === 'domain')?.head).toBeDefined();
  });
});
