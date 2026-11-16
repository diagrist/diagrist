import { compile, type Point, type Rect, segmentMeetsRect, segmentsIntersect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { architecturePlugin } from '../src/index.js';

const SOURCE = [
  'diagram context "Portal" layout=star locale=de',
  'group partner "Partner" external',
  'person kunde "Kunde"',
  'person service "Service"',
  'system portal "Portal" emph',
  'system sap "SAP"',
  'system crm "CRM"',
  'system psp "Zahlung" in partner',
  'system dhl "Paket" in partner',
  'edge kunde -> portal "bestellt" via=HTTPS',
  'edge service -> portal "sieht"',
  'edge portal -> sap "liest"',
  'edge sap ~> portal "meldet"',
  'edge portal -> crm "schreibt"',
  'edge crm -> sap "Kundendaten"',
  'edge portal -> psp "bucht"',
  'edge portal -> dhl "meldet an"',
].join('\n');

const inside = (r: Rect, f: Rect) => r.x >= f.x && r.y >= f.y && r.x + r.w <= f.x + f.w && r.y + r.h <= f.y + f.h;

describe('a context diagram with layout=star', () => {
  const result = compile(SOURCE, { plugins: [architecturePlugin] });
  const anchors = result.anchors;
  const rect = (id: string) => anchors?.nodes.find((n) => n.id === id)?.rect as Rect;

  it('needs no grid and no places', () => {
    expect(result.diagnostics).toEqual([]);
    expect(anchors?.nodes).toHaveLength(7);
  });

  it('puts the emphasised system in the middle of its neighbours', () => {
    const hub = rect('portal');
    const others = (anchors?.nodes ?? []).filter((n) => n.id !== 'portal').map((n) => n.rect);
    const mid = (r: Rect): Point => [r.x + r.w / 2, r.y + r.h / 2];
    const [x, y] = mid(hub);
    expect(others.some((r) => mid(r)[0] < x)).toBe(true);
    expect(others.some((r) => mid(r)[0] > x)).toBe(true);
    expect(others.some((r) => mid(r)[1] < y)).toBe(true);
    expect(others.some((r) => mid(r)[1] > y)).toBe(true);
  });

  it('draws the edges of the hub as single straight lines that cross no other line', () => {
    const edges = anchors?.edges ?? [];
    const spokes = edges.filter((e) => e.from === 'portal' || e.to === 'portal');
    for (const e of spokes) expect(e.points).toHaveLength(2);
    for (const a of edges)
      for (const b of edges) {
        if (a === b) continue;
        const [a1, a2] = a.points as [Point, Point];
        for (let k = 1; k < b.points.length; k++)
          expect(segmentsIntersect(a1, a2, b.points[k - 1] as Point, b.points[k] as Point)).toBe(false);
      }
  });

  it('runs an edge and its way back side by side, not on top of each other', () => {
    const [there, back] = ['sap', 'portal'].map((to) =>
      anchors?.edges.find((e) => e.to === to && (e.from === 'sap' || e.from === 'portal')),
    );
    expect(there?.points).not.toEqual([...(back?.points ?? [])].reverse());
  });

  it('keeps the members of a frame together inside it and lines out of boxes they do not end at', () => {
    const frame = anchors?.groups.find((g) => g.id === 'partner')?.rect as Rect;
    expect(inside(rect('psp'), frame) && inside(rect('dhl'), frame)).toBe(true);
    for (const e of anchors?.edges ?? [])
      for (const n of anchors?.nodes ?? []) {
        if (n.id === e.from || n.id === e.to) continue;
        for (let k = 1; k < e.points.length; k++)
          expect(segmentMeetsRect(e.points[k - 1] as Point, e.points[k] as Point, n.rect)).toBe(false);
      }
  });

  it('is only a value of context diagrams', () => {
    const container = compile('diagram container "X" layout=star\ncontainer a "A"', { plugins: [architecturePlugin] });
    expect(container.diagnostics.length).toBeGreaterThan(0);
  });
});
