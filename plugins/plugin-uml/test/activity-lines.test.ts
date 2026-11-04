import { compile, type Drawing, type Plugin } from '@diagrist/core';
import { type LineRule, lineFindings, linesOfDrawing } from '@diagrist/layout-grid';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { activityNames, activitySource } from './compile.js';

/** The plugin with every kind's layout recorded, so the test reads what the kernel was handed. */
const drawings: Drawing[] = [];
const recorded: Plugin = {
  ...umlPlugin,
  kinds: umlPlugin.kinds.map((k) => ({
    ...k,
    layout: (m, c) => drawings[drawings.push(k.layout(m, c)) - 1] as Drawing,
  })),
};

/**
 * Rules an example may still break, by file name, each entry with the reason it cannot meet the rule yet. Empty:
 * every activity example meets every hard rule. An entry added here belongs in `docs/burn-down.md` as well.
 */
const ALLOWED: ReadonlyMap<string, readonly LineRule[]> = new Map();

describe('the lines of activity pictures', () => {
  it.each([...activityNames].sort())('%s breaks no hard rule of the line check (plan Q1–Q9)', (name) => {
    drawings.length = 0;
    const { pictures } = compile(activitySource(name), { plugins: [recorded] });
    const allowed = ALLOWED.get(name) ?? [];
    for (const drawing of drawings.slice(-pictures.length)) {
      const found = lineFindings(linesOfDrawing(drawing)).filter((f) => !allowed.includes(f.rule));
      expect(found).toEqual([]);
    }
  });
});
