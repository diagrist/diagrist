import { readFileSync } from 'node:fs';
import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';

const none = { x: 0, y: 0, w: 0, h: 0 };
const cy = (r: { y: number; h: number }) => r.y + r.h / 2;

describe('composite states and the lines around them', () => {
  const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const result = compile(source('stress/state/gedaechtnis.dgr'), { plugins: [umlPlugin] });
  const a = result.anchors;
  const node = (id: string) => a?.nodes.find((n) => n.id === id)?.rect ?? none;
  const edge = (from: string, to: string) => a?.edges.find((e) => e.from === from && e.to === to)?.points ?? [];
  const frame = a?.groups.find((g) => g.id === 'programm')?.rect ?? none;

  it('puts a history state entered only from below at the bottom of its composite state', () => {
    expect(result.diagnostics).toEqual([]);
    expect(cy(node('zurueck'))).toBe(cy(node('schleudern')));
  });

  it('lets lines out of the bottom of a composite state run straight down to the states below', () => {
    for (const to of ['pause', 'stoerung']) expect(new Set(edge('programm', to).map((q) => q[0])).size, to).toBe(1);
  });

  it('runs no transition through a composite state it neither leaves nor enters', () => {
    const line = edge('stoerung', 'bereit');
    const within = (v: number, lo: number, hi: number) => v > lo && v < hi;
    const through = line.slice(1).some(([x, y], k) => {
      const [px, py] = line[k] ?? [x, y];
      const [x0, x1, y0, y1] = [Math.min(px, x), Math.max(px, x), Math.min(py, y), Math.max(py, y)];
      return x0 < frame.x + frame.w && x1 > frame.x && y0 < frame.y + frame.h && y1 > frame.y;
    });
    expect(line.length).toBeGreaterThan(2);
    expect(
      through || line.some(([x, y]) => within(x, frame.x, frame.x + frame.w) && within(y, frame.y, frame.y + frame.h)),
    ).toBe(false);
  });
});
