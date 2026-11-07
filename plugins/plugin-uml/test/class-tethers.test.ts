import { readFileSync } from 'node:fs';
import { compile, lineMetrics, linesOfDrawing, type Point, type Rect, segmentMeetsRect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';

/** The dashed lines of the association classes of a drawing, each as its points. */
function tethers(svg: string): Point[][] {
  const lines = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" class="uml-tether"/g)];
  const paths = [...svg.matchAll(/<path d="M([^"]+)" class="uml-tether"/g)];
  return [
    ...lines.map((m): Point[] => [
      [Number(m[1]), Number(m[2])],
      [Number(m[3]), Number(m[4])],
    ]),
    ...paths.map((m) => (m[1] as string).split(' L').map((p): Point => p.split(' ').map(Number) as unknown as Point)),
  ];
}

const inner = (r: Rect): Rect => ({ x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 });

describe('the dashed line of an association class', () => {
  const source = readFileSync(new URL('stress/class/kurs-netz.dgr', import.meta.url), 'utf8');
  const result = compile(source, { plugins: [umlPlugin] });
  const rect = (id: string) => result.anchors?.nodes.find((n) => n.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };

  it('runs through no class, and the class stands beside its association', () => {
    const boxes = result.anchors?.nodes.map((n) => n.rect) ?? [];
    const dashed = tethers(result.svg ?? '');
    expect(dashed).toHaveLength(2);
    for (const points of dashed)
      for (let i = 0; i + 1 < points.length; i++)
        expect(boxes.filter((b) => segmentMeetsRect(points[i] as Point, points[i + 1] as Point, inner(b)))).toEqual([]);
    expect(rect('note').y).toBe(rect('pruefung').y);
    expect(rect('belegung').y + rect('belegung').h).toBeLessThan(rect('student').y);
  });

  it('is a line of the anchors, from the class to the line it hangs from, which the line check counts', () => {
    const edges = result.anchors?.edges ?? [];
    const hung = edges.filter((e) => e.from === 'note' || e.from === 'belegung');
    expect(hung.map((e) => e.to).sort()).toEqual(['edge-0', 'edge-5']);
    const metrics = lineMetrics(linesOfDrawing({ anchors: result.anchors as NonNullable<typeof result.anchors> }));
    expect(metrics.lines).toBe(edges.length);
    expect(metrics.crossings).toBe(0);
  });
});
