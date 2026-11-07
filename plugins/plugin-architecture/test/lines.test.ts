import { readFileSync } from 'node:fs';
import {
  compile,
  DEFAULT_THRESHOLDS,
  type Drawing,
  lineFindings,
  linesOfDrawing,
  type Plugin,
  type Rect,
} from '@diagrist/core';
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

/** The distance between two rectangles, 0 where they meet. */
const apart = (a: Rect, b: Rect) =>
  Math.hypot(Math.max(0, b.x - a.x - a.w, a.x - b.x - b.w), Math.max(0, b.y - a.y - a.h, a.y - b.y - b.h));

/** Pairs of texts of different lines nearer than the gap a text keeps from a foreign line, by their keys. */
function closePairs(d: Drawing): string[] {
  const labels = linesOfDrawing(d).labels ?? [];
  return labels.flatMap((a, i) =>
    labels
      .slice(i + 1)
      .filter((b) => a.edge !== b.edge && apart(a.box, b.box) < DEFAULT_THRESHOLDS.labelClear)
      .map((b) => `${a.key} ${b.key}`),
  );
}

describe('the lines of C4 pictures', () => {
  it("take part in the kernel's line check", () => {
    expect(check).not.toBe(false);
  });

  it.each(exampleNames)(
    '%s breaks no hard rule of the line check, places nothing on anything and keeps texts apart',
    (name) => {
      drawings.length = 0;
      const { pictures, diagnostics } = compileExample(name, undefined, recorded);
      const found = drawings
        .slice(-pictures.length)
        .flatMap((d, i) =>
          lineFindings(linesOfDrawing(d), THRESHOLDS).map((f) => ({ picture: pictures[i]?.variant, ...f })),
        );
      expect(found).toEqual([]);
      expect(diagnostics.filter((d) => d.code.startsWith('G4'))).toEqual([]);
      expect(drawings.slice(-pictures.length).flatMap(closePairs)).toEqual([]);
    },
  );

  it('wrap a long name beside a short upright line no more than the room along it asks', () => {
    const stress = new URL('stress/c4/adaptiv-spannen.dgr', import.meta.url);
    const { svg } = compile(readFileSync(stress, 'utf8'), { plugins });
    expect(svg).toContain('>meldet Gewerbe an<');
  });
});
