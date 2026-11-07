import { describe, expect, it } from 'vitest';
import { type EdgeText, type GridSpec, placeGrid, type Route, signEdges } from '../src/index.js';
import { spec } from './fixture.js';

const s: GridSpec = { ...spec('a b', 'r1 r2', ['x@a/r1', 'y@b/r2']), channels: true };
const line = (edge: string, y: number, [from, to] = [240, 376]): Route => ({
  edge,
  points: [
    [from, y],
    [to, y],
  ],
  shape: 'straight',
  fromSide: 'right',
  toSide: 'left',
});
const text: EdgeText = { edge: 'e0', name: 'liest Verträge' };
const onLine = { onLine: { pad: { x: 4, y: 2 }, avoid: [] } };
const seated = (routes: readonly Route[]) => signEdges(s, placeGrid(s), routes, [text], [], onLine);
const across = (routes: readonly Route[]) => {
  const { labels, crowded } = seated(routes);
  const box = labels[0]?.box;
  if (!box) throw new Error('missing');
  return { top: box.y, bottom: box.y + box.h, crowded };
};

describe('texts on their line that have no stretch of it clear of parallel lines (owner decision E1)', () => {
  it('stand on their line where a stretch of it keeps clear of the parallel lines', () => {
    const { top, bottom, crowded } = across([line('e0', 260), line('e1', 220)]);
    expect(crowded).toEqual([]);
    expect(top < 260 && bottom > 260).toBe(true);
  });

  it('stand beside it, clear of the other line, where a parallel line runs along all of it', () => {
    const { top, bottom, crowded } = across([line('e0', 260), line('e1', 244)]);
    expect(crowded).toEqual([]);
    expect(top).toBeGreaterThan(260);
    expect(top - 244).toBeGreaterThanOrEqual(12);
    expect(bottom).toBeLessThan(320);
  });

  it('stay on their line where the parallel line leaves a stretch of it free', () => {
    const { top, bottom } = across([line('e0', 260, [240, 500]), line('e1', 244, [240, 320])]);
    expect(top < 260 && bottom > 260).toBe(true);
  });
});
