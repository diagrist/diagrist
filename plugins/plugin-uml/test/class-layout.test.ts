import { compile, type Rect, segmentsIntersect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { classDiagram, classSource } from './compile.js';

const inside = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const cx = (r: Rect) => r.x + r.w / 2;
const cy = (r: Rect) => r.y + r.h / 2;

/** Compiles an example and looks up nodes, frames and edges of the picture. */
function picture(name: string) {
  const result = compile(classSource(`${name}.dgr`), { plugins: [umlPlugin] });
  expect(result.diagnostics).toEqual([]);
  const a = result.anchors;
  const node = (id: string) => a?.nodes.find((n) => n.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
  const frame = (id: string) => a?.groups.find((g) => g.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
  const edge = (from: string, to: string) => a?.edges.find((e) => e.from === from && e.to === to)?.points ?? [];
  return { svg: result.svg ?? '', node, frame, edge, edges: a?.edges ?? [] };
}

describe('class layout', () => {
  it('puts a superclass above its subclasses, between them, and lets them share one triangle', () => {
    const p = picture('hotel');
    const [room, single, double] = [p.node('zimmer'), p.node('einzelzimmer'), p.node('doppelzimmer')];
    expect(room.y + room.h).toBeLessThan(Math.min(single.y, double.y));
    expect(cx(room)).toBeGreaterThan(cx(single));
    expect(cx(room)).toBeLessThan(cx(double));
    expect(p.edge('einzelzimmer', 'zimmer').at(-1)).toEqual(p.edge('doppelzimmer', 'zimmer').at(-1));
    expect(p.edge('einzelzimmer', 'zimmer').at(-1)).toEqual([cx(room), room.y + room.h]);
  });

  it('puts the whole above its parts and the diamond at the whole', () => {
    const p = picture('hotel');
    const [hotel, room] = [p.node('hotel'), p.node('zimmer')];
    expect(hotel.y + hotel.h).toBeLessThan(room.y);
    const tip = `L${cx(hotel)} ${hotel.y + hotel.h}" class="uml-stub" marker-end="url(#m-diamond-filled)"`;
    expect(p.svg).toContain(tip);
  });

  it('draws the end symbols in the sizes of the predecessor', () => {
    const svg = picture('hotel').svg;
    expect(svg).toContain('<marker id="m-diamond-filled" markerUnits="userSpaceOnUse" markerWidth="18"');
    expect(svg).toContain('<path d="M0.5 9 L8.5 4 L16.5 9 L8.5 14 Z" class="uml-filled"');
    expect(svg).toContain('<path d="M2.5 2 L16.5 9 L2.5 16 Z" class="uml-hollow"');
  });

  it('hangs an association class below the middle of its line by a dashed line', () => {
    const p = picture('kurs-assoziationsklasse');
    const [student, course, enrolment] = [p.node('student'), p.node('kurs'), p.node('teilnahme')];
    const line = p.edge('student', 'kurs');
    expect(enrolment.y).toBeGreaterThan(Math.max(student.y + student.h, course.y + course.h));
    const tether = /<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" class="uml-tether"/.exec(p.svg);
    const [x1, y1, x2, y2] = (tether?.slice(1) ?? []).map(Number);
    expect(x1).toBe(x2);
    expect(y1).toBe(line[0]?.[1]);
    expect(y2).toBe(enrolment.y);
    expect(x1).toBeGreaterThan(student.x + student.w);
    expect(x1).toBeLessThan(course.x);
  });

  it('places the diamond of an n-ary association among its ends, the legs at its vertices', () => {
    const p = picture('stundenplan');
    const d = p.node('unterricht');
    expect(cy(d)).toBe(cy(p.node('dozent')));
    expect(cx(d)).toBeGreaterThan(cx(p.node('dozent')));
    expect(cx(d)).toBeLessThan(cx(p.node('kurs')));
    expect(cy(p.node('raum'))).toBeGreaterThan(cy(d));
    expect(cy(p.node('einheit'))).toBeLessThan(cy(d));
    expect(p.edge('unterricht', 'dozent')[0]).toEqual([d.x, cy(d)]);
    expect(p.edge('unterricht', 'kurs')[0]).toEqual([d.x + d.w, cy(d)]);
    expect(p.edge('unterricht', 'raum')[0]).toEqual([cx(d), d.y + d.h]);
  });

  it('draws packages around their classes, and package imports reach the body beside the tab', () => {
    const p = picture('pakete');
    for (const [pkg, members] of [
      ['domain', ['repo', 'kunde', 'auftrag', 'position']],
      ['service', ['auftragService']],
      ['persistence', ['jpa']],
    ] as const)
      for (const id of members) expect(inside(p.node(id), p.frame(pkg)), `${id} in ${pkg}`).toBe(true);
    const domain = p.frame('domain');
    const end = p.edge('service', 'domain').at(-1) ?? [0, 0];
    expect(end[1]).toBe(domain.y + 22);
    expect(end[0]).toBeGreaterThan(domain.x + 72);
  });

  it('stacks five packages in layers as compact blocks, leaves beside or below their partner, and no lines cross', () => {
    const p = picture('pakete-quer');
    const ids = ['web', 'bestellung', 'zahlung', 'katalog', 'versand'];
    const [web, orders, payment, catalogue, shipping] = ids.map((id) => p.frame(id)) as [Rect, Rect, Rect, Rect, Rect];
    const apart = (a: Rect, b: Rect) => a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y;
    for (const [i, a] of ids.entries())
      for (const b of ids.slice(i + 1)) expect(apart(p.frame(a), p.frame(b))).toBe(true);
    expect(web.y + web.h).toBeLessThan(orders.y);
    expect([catalogue.y, payment.y]).toEqual([web.y, orders.y]);
    expect(orders.x + orders.w).toBeLessThan(payment.x);
    expect(orders.y + orders.h).toBeLessThan(shipping.y);
    const right = Math.max(...ids.map((id) => p.frame(id).x + p.frame(id).w));
    const bottom = Math.max(...ids.map((id) => p.frame(id).y + p.frame(id).h));
    expect(right / bottom).toBeLessThan(2.5);
    const pieces = p.edges.map((e) => e.points.slice(1).map((q, k) => [e.points[k] ?? q, q] as const));
    const crossings = pieces.flatMap((a, i) =>
      pieces.slice(i + 1).filter((b) => a.some(([p1, p2]) => b.some(([q1, q2]) => segmentsIntersect(p1, p2, q1, q2)))),
    );
    expect(crossings).toEqual([]);
  });

  it('draws a relation of a class with itself as a loop on the side away from its neighbour, inside its package', () => {
    const source = [
      'diagram class "Baum"',
      'package modell "modell"',
      'class knoten "Knoten" in modell',
      'class blatt "Blatt" in modell',
      'rel knoten -> knoten "Kind" source=1 card=0..*',
      'rel knoten -- blatt source=1 card=1',
    ].join('\n');
    const result = compile(source, { plugins: [umlPlugin] });
    expect(result.diagnostics).toEqual([]);
    const a = result.anchors;
    const [node, leaf] = ['knoten', 'blatt'].map((id) => a?.nodes.find((n) => n.id === id)?.rect) as [Rect, Rect];
    const frame = a?.groups.find((g) => g.id === 'modell')?.rect as Rect;
    const loop = a?.edges.find((e) => e.from === 'knoten' && e.to === 'knoten')?.points ?? [];
    expect(leaf.x).toBeGreaterThan(node.x + node.w);
    expect(loop).toHaveLength(4);
    expect([loop[0]?.[0], loop.at(-1)?.[0]]).toEqual([node.x, node.x]);
    const reach = Math.min(...loop.map((q) => q[0]));
    expect(reach).toBeLessThan(node.x);
    expect(reach).toBeGreaterThan(frame.x);
  });

  it('marks a non-navigable end with an x and a navigable one with an open head', () => {
    const svg = picture('navigierbarkeit').svg;
    expect(svg).toMatch(
      /<g id="edge-0"><path [^>]+><path [^>]+class="line" marker-end="url\(#m-uml-open\)"\/><path d="M[^"]+ M[^"]+" class="line"\/>/,
    );
    expect(svg).toMatch(
      /<g id="edge-1">.*marker-end="url\(#m-uml-open\)".*class="uml-stub" marker-end="url\(#m-uml-open\)"/,
    );
  });

  it('puts the template parameters in a dashed box over the top right corner', () => {
    const p = picture('vorlagen');
    const list = p.node('liste');
    const box = new RegExp(
      `<rect x="([\\d.]+)" y="${list.y - 10}" width="([\\d.]+)" height="20" class="shape dashed"/>`,
    ).exec(p.svg);
    expect(Number(box?.[1]) + Number(box?.[2])).toBe(list.x + list.w + 12);
  });

  it('keeps one box per classifier as wide as its widest member and never wraps', () => {
    const wide = '"+ aVeryLongOperationName(first : String, second : Integer) : Map"';
    const r = classDiagram('class x "X"', `  ${wide}`);
    const rect = r.anchors?.nodes.find((n) => n.id === 'x')?.rect;
    expect(rect?.w).toBeGreaterThan(400);
    expect(r.svg).toContain('aVeryLongOperationName(first : String, second : Integer) : Map</text>');
  });
});
