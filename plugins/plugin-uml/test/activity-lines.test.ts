import { readFileSync } from 'node:fs';
import { compile, type Drawing, type LineRule, lineFindings, linesOfDrawing, type Plugin } from '@diagrist/core';
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

  it('set a guard beside the part of its line that is only its own, not beside the stub it shares', () => {
    drawings.length = 0;
    const stress = new URL('stress/activity/parallel-entscheidung.dgr', import.meta.url);
    compile(readFileSync(stress, 'utf8'), { plugins: [recorded] });
    const { routes, labels } = linesOfDrawing(drawings[0] as Drawing);
    const turning = routes.find((r) => r.from === 'luecken' && r.points.length > 2);
    const [start, corner] = turning?.points ?? [];
    const guard = labels.find((l) => l.edge === turning?.edge)?.box;
    if (!start || !corner || !guard) throw new Error('missing');
    const besideStub = guard.y < corner[1] && guard.y + guard.h > start[1] && guard.x < start[0] + 13;
    expect(besideStub && guard.x + guard.w > start[0]).toBe(false);
  });
});
