import { readFileSync } from 'node:fs';
import { compile, type Drawing, linesOfDrawing, type Plugin, type Rect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';

/** The plugin with every kind's layout recorded, so the test reads what the kernel was handed. */
const drawings: Drawing[] = [];
const recorded: Plugin = {
  ...umlPlugin,
  kinds: umlPlugin.kinds.map((k) => ({
    ...k,
    layout: (m, c) => drawings[drawings.push(k.layout(m, c)) - 1] as Drawing,
  })),
};

/** The distance between two rectangles, 0 where they meet. */
const apart = (a: Rect, b: Rect) =>
  Math.hypot(Math.max(0, b.x - a.x - a.w, a.x - b.x - b.w), Math.max(0, b.y - a.y - a.h, a.y - b.y - b.h));

/** The least distance between texts of two different lines in the first picture of a file of this package. */
function closest(path: string): number {
  drawings.length = 0;
  compile(readFileSync(new URL(path, import.meta.url), 'utf8'), { plugins: [recorded] });
  const { labels } = linesOfDrawing(drawings[0] as Drawing);
  const gaps = labels.flatMap((a, i) =>
    labels.slice(i + 1).flatMap((b) => (a.edge === b.edge ? [] : [apart(a.box, b.box)])),
  );
  return Math.min(...gaps);
}

describe('texts of different lines', () => {
  it.each([
    ['../examples/usecase/stadtwerke.dgr', 'a text in the middle of a line beside the end text of another'],
    ['stress/usecase/lange-namen.dgr', 'end texts of two crossing lines, where the one seated first gives way'],
    ['stress/class/rollen-viele.dgr', 'multiplicities at the corner of a class, where a spot further along is free'],
  ])('keep the gap of a foreign line in %s: %s', (path) => {
    expect(closest(path)).toBeGreaterThanOrEqual(12);
  });
});
