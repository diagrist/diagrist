import { compile, type Rect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { activityNames, activitySource } from './compile.js';

const inside = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const apart = (a: Rect, b: Rect) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
const cx = (r: Rect) => r.x + r.w / 2;
const cy = (r: Rect) => r.y + r.h / 2;

/** Compiles an example and looks up nodes, lanes and regions, and edges of the picture by their anchors. */
function picture(name: string) {
  const result = compile(activitySource(`${name}.dgr`), { plugins: [umlPlugin] });
  expect(result.diagnostics).toEqual([]);
  const anchors = result.anchors;
  const find = (list: readonly { id: string; rect: Rect }[] | undefined, id: string): Rect => {
    const found = list?.find((x) => x.id === id);
    if (!found) throw new Error(`no ${id}`);
    return found.rect;
  };
  const edge = (from: string, to: string) => {
    const found = anchors?.edges.find((e) => e.from === from && e.to === to);
    if (!found) throw new Error(`no edge ${from} -> ${to}`);
    return found;
  };
  return {
    nodes: anchors?.nodes ?? [],
    node: (id: string) => find(anchors?.nodes, id),
    group: (id: string) => find(anchors?.groups, id),
    edge,
    edges: anchors?.edges ?? [],
  };
}

describe('the layout of an activity diagram', () => {
  const p = picture('auftragsabwicklung');

  it('puts every node into the lane named by `in`, below the lane head', () => {
    const lanes: Record<string, readonly string[]> = {
      kunde: ['start', 'bestellen'],
      service: ['erfassen', 'stornieren', 'absage', 'abbruch', 'abschliessen', 'ende'],
      lager: ['reservieren', 'bestand', 'kommissionieren', 'versenden', 'stornowunsch', 'zuruecklegen', 'storniert'],
      faktura: ['fakturieren', 'rechnung', 'zustellen', 'warten', 'frist', 'bezahlt', 'mahnen'],
    };
    for (const [lane, ids] of Object.entries(lanes)) {
      const area = { ...p.group(lane), y: p.group(lane).y + 32 };
      for (const id of ids) expect(inside(p.node(id), area), `${id} in ${lane}`).toBe(true);
    }
  });

  it('runs edges downwards, a hand-over horizontally, and a loop up on the right of the nodes it passes', () => {
    for (const e of p.edges) {
      const [first, last] = [e.points[0], e.points.at(-1)];
      if (!first || !last || (e.from === 'mahnen' && e.to === 'warten')) continue;
      expect(last[1], `${e.from} -> ${e.to}`).toBeGreaterThanOrEqual(first[1]);
    }
    const handover = p.edge('bestellen', 'erfassen').points;
    expect(handover.map((q) => q[1])).toEqual([cy(p.node('bestellen')), cy(p.node('bestellen'))]);
    const loop = p.edge('mahnen', 'warten').points;
    const channel = Math.max(...loop.map((q) => q[0]));
    for (const id of ['warten', 'frist', 'bezahlt', 'mahnen'])
      expect(channel, id).toBeGreaterThan(p.node(id).x + p.node(id).w);
    expect(loop.at(-1)?.[1]).toBe(cy(p.node('warten')));
  });

  it('frames an interruptible region around its members and no other node', () => {
    const frame = p.group('storno');
    for (const id of ['kommissionieren', 'versenden', 'stornowunsch']) expect(inside(p.node(id), frame), id).toBe(true);
    for (const n of p.nodes.filter((x) => !['kommissionieren', 'versenden', 'stornowunsch'].includes(x.id)))
      expect(apart(n.rect, frame), n.id).toBe(true);
  });

  it('starts and ends an object flow between pins at the edges of its actions', () => {
    const [start, end] = [p.edge('erfassen', 'reservieren').points[0], p.edge('erfassen', 'reservieren').points.at(-1)];
    const [a, b] = [p.node('erfassen'), p.node('reservieren')];
    expect(start).toEqual([cx(a), a.y + a.h + 10]);
    expect(end).toEqual([cx(b), b.y - 10]);
  });

  it('names the guards of a decision as the labels of its edges', () => {
    expect(p.edge('bestand', 'teilen').labelId).toBe(`label-${p.edge('bestand', 'teilen').index}`);
    expect(p.edge('start', 'bestellen').labelId).toBeUndefined();
  });
});

describe('decisions and bars', () => {
  it('puts alternatives symmetric below their decision and leaves the diamond at its corners', () => {
    const p = picture('bestellprozess');
    const d = p.node('zahlung');
    expect(cx(p.node('versenden')) + cx(p.node('stornieren'))).toBeCloseTo(2 * cx(d));
    const sides = [p.edge('zahlung', 'versenden'), p.edge('zahlung', 'stornieren')].map((e) => e.points[0]);
    expect(sides.map((q) => q?.[1])).toEqual([cy(d), cy(d)]);
    expect(sides.map((q) => q?.[0]).sort()).toEqual([d.x, d.x + d.w].sort());
  });

  it('draws a fork as wide as its branches, each leaving it straight down', () => {
    const p = picture('onboarding');
    const bar = p.node('aufspaltung');
    for (const id of ['konto', 'laptop']) {
      const [start] = p.edge('aufspaltung', id).points;
      expect(start, id).toEqual([cx(p.node(id)), bar.y + bar.h]);
      expect(start?.[0] ?? 0).toBeGreaterThan(bar.x);
      expect(start?.[0] ?? 0).toBeLessThan(bar.x + bar.w);
    }
  });
});

describe('expansion regions and handlers', () => {
  it('sets the input on the top edge of the frame and the output on its bottom edge', () => {
    const p = picture('positionen-pruefen');
    const frame = p.group('pruefung');
    expect(cy(p.node('pruefung'))).toBe(frame.y);
    expect(cy(p.node('pruefung~out'))).toBe(frame.y + frame.h);
    for (const id of ['bestand', 'da', 'reservieren', 'nachbestellen', 'fertig', 'pruefen'])
      expect(inside(p.node(id), frame), id).toBe(true);
  });

  it('puts a handler beside its protected actions, the bolts ending at its side', () => {
    const p = picture('karten-belasten');
    const handler = p.node('fehler');
    for (const id of ['pruefen', 'belasten']) {
      expect(handler.x, id).toBeGreaterThan(p.node(id).x + p.node(id).w);
      expect(p.edge(id, 'fehler').points.at(-1)?.[0], id).toBe(handler.x - 10);
    }
    expect(cy(p.node('pruefen'))).toBeGreaterThan(handler.y);
    expect(cy(p.node('pruefen'))).toBeLessThan(handler.y + handler.h);
  });

  it.each(activityNames)('%s keeps its nodes, expansion nodes included, apart', (file) => {
    const p = picture(file.replace(/\.dgr$/, ''));
    for (const [i, a] of p.nodes.entries())
      for (const b of p.nodes.slice(i + 1)) expect(apart(a.rect, b.rect), `${a.id} and ${b.id}`).toBe(true);
  });
});
