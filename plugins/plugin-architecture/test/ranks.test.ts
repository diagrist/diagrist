import { readFileSync } from 'node:fs';
import { compile, type Rect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { plugins } from './compile.js';

/** A diagram of the context lab with `layout=ranks` on its first line, compiled. */
function ranked(name: string) {
  const text = readFileSync(new URL(`context-lab/${name}.dgr`, import.meta.url), 'utf8');
  return compile(text.replace(/^(diagram [^\n]*)$/m, '$1 layout=ranks'), { plugins });
}

const rectOf = (c: ReturnType<typeof ranked>, id: string): Rect => {
  const node = c.anchors?.nodes.find((n) => n.id === id);
  if (!node) throw new Error(`no node ${id}`);
  return node.rect;
};

describe('layout=ranks', () => {
  it('needs no grid and no places', () => {
    const c = ranked('03-stadtwerke');
    expect(c.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(c.svg).toBeDefined();
  });

  it('sets callers above the hub and what it calls below, each edge to the hub one straight upright line', () => {
    const c = ranked('03-stadtwerke');
    const hub = rectOf(c, 'portal');
    expect(rectOf(c, 'kunde').y).toBeLessThan(hub.y);
    expect(rectOf(c, 'sap').y).toBeGreaterThan(hub.y);
    const spokes = (c.anchors?.edges ?? []).filter((e) => e.from === 'portal' || e.to === 'portal');
    expect(spokes).toHaveLength(8);
    for (const e of spokes) {
      expect(e.points).toHaveLength(2);
      expect(e.points[0]?.[0]).toBe(e.points[1]?.[0]);
    }
  });

  it('runs an edge there and one back between the same two nodes as two parallels', () => {
    const c = ranked('02-radverleih');
    const pair = (c.anchors?.edges ?? []).filter((e) => [e.from, e.to].includes('stationen'));
    expect(pair).toHaveLength(2);
    const xs = pair.map((e) => e.points[0]?.[0]);
    expect(new Set(xs).size).toBe(2);
    for (const e of pair) expect(e.points[0]?.[0]).toBe(e.points.at(-1)?.[0]);
  });

  it('keeps neighbours linked to each other side by side, a short flat line between them', () => {
    const c = ranked('03-stadtwerke');
    const link = c.anchors?.edges.find((e) => e.from === 'crm' && e.to === 'sap');
    expect(link?.points).toHaveLength(2);
    expect(link?.points[0]?.[1]).toBe(link?.points[1]?.[1]);
  });

  it('keeps the hub as wide as its systems, the people of mixed rows beside it on one flat line each', () => {
    const c = ranked('02-radverleih');
    const hub = rectOf(c, 'verleih');
    const below = ['zahlung', 'karten'].map((id) => rectOf(c, id));
    expect(hub.x).toBe(Math.min(...below.map((r) => r.x)));
    expect(hub.x + hub.w).toBe(Math.max(...below.map((r) => r.x + r.w)));
    expect(rectOf(c, 'fahrerin').x + rectOf(c, 'fahrerin').w).toBeLessThan(hub.x);
    expect(rectOf(c, 'service').x).toBeGreaterThan(hub.x + hub.w);
    for (const id of ['fahrerin', 'service']) {
      const e = c.anchors?.edges.find((x) => [x.from, x.to].includes(id));
      expect(e?.points).toHaveLength(2);
      expect(e?.points[0]?.[1]).toBe(e?.points[1]?.[1]);
    }
  });

  it('centres a shorter band on the hub and leaves out who has no edge to the hub', () => {
    const c = ranked('05-gruppen');
    const hub = rectOf(c, 'shop');
    const kundin = rectOf(c, 'kundin');
    expect(kundin.x + kundin.w / 2).toBeCloseTo(hub.x + hub.w / 2, 0);
    expect(rectOf(c, 'lager').x).toBeGreaterThan(hub.x + hub.w);
  });

  it('stops a line coming down onto a stick figure above its head', () => {
    const source = [
      'diagram context "Kopf" layout=ranks',
      'person a "Servicekraft"',
      'system s "Radverleih" emph',
      'system q "Quelle"',
      'edge q -> s "meldet"',
      'edge s -> a "plant"',
    ].join('\n');
    const c = compile(source, { plugins });
    const end = c.anchors?.edges.find((e) => e.to === 'a')?.points.at(-1);
    expect(end?.[1]).toBeLessThan(rectOf(c, 'a').y - 4);
  });
});
