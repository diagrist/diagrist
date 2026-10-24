import { compile, type Point, type Rect, textWidth } from '@diagrist/core';
import { segmentMeetsEllipse, segmentsIntersect } from '@diagrist/layout-grid';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { usecaseSource } from './compile.js';

const inside = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const apart = (a: Rect, b: Rect) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
const cx = (r: Rect) => r.x + r.w / 2;
const cy = (r: Rect) => r.y + r.h / 2;

/** Compiles an example, optionally changed, and looks up nodes, frames, edges, notes and labels of the picture. */
function picture(name: string, change: (source: string) => string = (s) => s) {
  const result = compile(change(usecaseSource(`${name}.dgr`)), { plugins: [umlPlugin] });
  expect(result.diagnostics).toEqual([]);
  const anchors = result.anchors;
  const svg = result.svg ?? '';
  const find = <T extends { id: string }>(list: readonly T[] | undefined, id: string): T => {
    const found = list?.find((x) => x.id === id);
    if (!found) throw new Error(`no ${id}`);
    return found;
  };
  const notes = [
    ...svg.matchAll(/<path d="M([\d.]+) ([\d.]+) L[\d.]+ [\d.]+ L([\d.]+) [\d.]+ L[\d.]+ ([\d.]+) L/g),
  ].map(
    (m): Rect => ({ x: Number(m[1]), y: Number(m[2]), w: Number(m[3]) - Number(m[1]), h: Number(m[4]) - Number(m[2]) }),
  );
  const links = [
    ...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" class="note-tail"/g),
  ].map((m): [Point, Point] => [
    [Number(m[1]), Number(m[2])],
    [Number(m[3]), Number(m[4])],
  ]);
  const label = (text: string): Rect => {
    const m = new RegExp(
      `<text x="([\\d.]+)" y="([\\d.]+)" text-anchor="middle" class="label halo">${text.replace(/[.*]/g, '\\$&')}<`,
    ).exec(svg);
    const w = textWidth(text, { size: 10 });
    return { x: Number(m?.[1]) - w / 2, y: Number(m?.[2]) - 10, w, h: 12 };
  };
  return {
    svg,
    node: (id: string) => find(anchors?.nodes, id).rect,
    frame: (id: string) => find(anchors?.groups, id).rect,
    edge: (from: string, to: string) => anchors?.edges.find((e) => e.from === from && e.to === to),
    edges: anchors?.edges ?? [],
    notes,
    links,
    label,
  };
}

describe('the automatic grid of a use case diagram', () => {
  const p = picture('onlineshop');
  const actors = ['gast', 'kunde', 'stamm', 'psp', 'support'];
  const cases = ['suchen', 'bestellen', 'login', 'bezahlen', 'gutschein', 'storno', 'express', 'pruefen'];

  it('puts use cases into their subject and actors left and right outside it', () => {
    for (const id of cases) expect(inside(p.node(id), p.frame('shop')), id).toBe(true);
    for (const id of actors) expect(apart(p.node(id), p.frame('shop')), id).toBe(true);
    expect(p.node('kunde').x).toBeLessThan(p.frame('shop').x);
    expect(p.node('psp').x).toBeGreaterThan(p.frame('shop').x + p.frame('shop').w);
  });

  it('puts included use cases right of their base and a special use case below its general one', () => {
    const base = p.node('bestellen');
    expect(p.node('login').x).toBeGreaterThan(base.x + base.w);
    expect(p.node('bezahlen').x).toBeGreaterThan(base.x + base.w);
    expect(cx(p.node('express'))).toBe(cx(base));
    expect(p.node('express').y).toBeGreaterThan(base.y + base.h);
  });

  it('sets an actor at the middle height of its use cases and roles below each other', () => {
    const [a, b] = [cy(p.node('bestellen')), cy(p.node('storno'))];
    expect(cy(p.node('kunde'))).toBeGreaterThan(Math.min(a, b));
    expect(cy(p.node('kunde'))).toBeLessThan(Math.max(a, b));
    expect(cy(p.node('psp'))).toBe(cy(p.node('bezahlen')));
    expect(p.node('gast').x).toBe(p.node('kunde').x);
    expect(p.node('stamm').y).toBeGreaterThan(p.node('kunde').y);
  });

  it('draws straight lines from outline to outline, the head at the target', () => {
    const include = p.edge('bestellen', 'bezahlen');
    expect(include?.points).toHaveLength(2);
    const [x, y] = include?.points[1] ?? [0, 0];
    const r = p.node('bezahlen');
    expect(((x - cx(r)) / (r.w / 2)) ** 2 + ((y - cy(r)) / (r.h / 2)) ** 2).toBeCloseTo(1, 2);
    const group = (k: number) =>
      new RegExp(
        `<g id="edge-${k}"><path d="[^"]+" class="line halo"/><path d="[^"]+" class="([^"]+)"( marker-end="url\\(#m-([a-z-]+)\\)")?`,
      ).exec(p.svg);
    const drawn = p.edges.map((e) => [`${e.from}-${e.to}`, group(e.index)?.[1], group(e.index)?.[3]]);
    expect(drawn).toContainEqual(['bestellen-bezahlen', 'line dashed', 'open']);
    expect(drawn).toContainEqual(['gutschein-bestellen', 'line dashed', 'open']);
    expect(drawn).toContainEqual(['kunde-gast', 'line', 'hollow']);
    expect(drawn).toContainEqual(['gast-suchen', 'line', undefined]);
    expect(p.svg).toContain('«include»');
    expect(p.svg).toContain('condition: {Gutschein vorhanden}');
  });

  it('crosses no line with another one', () => {
    const lines = p.edges.map((e) => e.points as readonly Point[]);
    const crossings = lines.flatMap((a, i) =>
      lines.slice(i + 1).filter((b) => segmentsIntersect(a[0] as Point, a[1] as Point, b[0] as Point, b[1] as Point)),
    );
    expect(crossings).toEqual([]);
  });
});

describe('notes on a use case diagram', () => {
  const p = picture('zwei-systeme');

  it('put the note of a use case into its subject, those of an actor and a subject outside every frame', () => {
    const [onCase, onActor, onSubject] = p.notes;
    if (!onCase || !onActor || !onSubject) throw new Error('three notes expected');
    expect(inside(onCase, p.frame('shop'))).toBe(true);
    for (const frame of ['shop', 'erp']) {
      expect(apart(onActor, p.frame(frame))).toBe(true);
      expect(apart(onSubject, p.frame(frame))).toBe(true);
    }
  });

  it('join every note to its element by a dashed line that crosses no relation', () => {
    expect(p.links).toHaveLength(3);
    for (const [a, b] of p.links)
      for (const e of p.edges) expect(segmentsIntersect(a, b, e.points[0] as Point, e.points[1] as Point)).toBe(false);
  });

  it('put the condition of an extend into a free spot, its link on the middle of the line', () => {
    const q = picture('auftragsabwicklung');
    expect(q.notes).toHaveLength(2);
    const corners = (r: Rect): Point[] => [
      [r.x, r.y],
      [r.x + r.w, r.y],
      [r.x + r.w, r.y + r.h],
      [r.x, r.y + r.h],
    ];
    for (const note of q.notes)
      for (const id of ['erfassen', 'stornieren', 'rabatt', 'gebuehr']) {
        const e = q.node(id);
        const edges = corners(note).map((c, i, all) => [c, all[(i + 1) % 4] as Point] as const);
        const touches = edges.some(([a, b]) => segmentMeetsEllipse(a, b, [cx(e), cy(e)], e.w / 2, e.h / 2));
        expect(touches, id).toBe(false);
      }
  });

  it('put a multiplicity at a use case inside its subject, off the frame line', () => {
    const q = picture('auftragsabwicklung');
    const frame = q.frame('system');
    const card = q.label('0..*');
    expect(inside(card, frame)).toBe(true);
    const edges = [frame.x, frame.x + frame.w].map((x) =>
      Math.min(Math.abs(card.x - x), Math.abs(card.x + card.w - x)),
    );
    expect(Math.min(...edges)).toBeGreaterThanOrEqual(10);
  });
});

describe('several subjects', () => {
  it('stand side by side with a shared actor between them', () => {
    const p = picture('zwei-systeme');
    const [shop, erp] = [p.frame('shop'), p.frame('erp')];
    for (const id of ['sb', 'versand']) {
      expect(cx(p.node(id))).toBeGreaterThan(shop.x + shop.w);
      expect(cx(p.node(id))).toBeLessThan(erp.x);
    }
  });

  it('stand below each other with direction=down, the shared actor between them', () => {
    const p = picture('zwei-systeme', (s) => s.replace(' locale=de', ' direction=down locale=de'));
    const [shop, erp] = [p.frame('shop'), p.frame('erp')];
    expect(apart(shop, erp)).toBe(true);
    for (const id of ['sb', 'versand']) {
      expect(cy(p.node(id))).toBeGreaterThan(cy(shop));
      expect(cy(p.node(id))).toBeLessThan(cy(erp));
    }
  });

  it('move the subject an actor shares with two others into the middle', () => {
    const p = picture('klinik');
    expect(p.frame('termin').x).toBeLessThan(p.frame('abrechnung').x);
    expect(p.frame('abrechnung').x).toBeLessThan(p.frame('praxis').x);
  });

  it('stand in a grid of two by two when there are four', () => {
    const p = picture('stadtwerke');
    const frames = ['portal', 'crm', 'abrechnung', 'netz'].map(p.frame);
    const pairs = frames.flatMap((a, i) => frames.slice(i + 1).map((b) => [a, b] as const));
    const beside = pairs.filter(([a, b]) => a.y < b.y + b.h && b.y < a.y + a.h);
    const below = pairs.filter(([a, b]) => a.x < b.x + b.w && b.x < a.x + a.w);
    expect([beside.length, below.length]).toEqual([2, 2]);
    for (const [a, b] of pairs) expect(apart(a, b)).toBe(true);
  });
});
