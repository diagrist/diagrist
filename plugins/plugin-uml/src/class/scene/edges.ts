import type { Point, Shape } from '@diagrist/core';
import type { EdgeLabel, Route } from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';
import { crossEnds, HEAD_AT_END, HEAD_AT_START, headLength } from '../layout/heads.js';
import { CLASS } from '../layout/metrics.js';
import { LINE } from '../styles.js';

const pathOf = (points: readonly Point[]): string =>
  points.map(([x, y], k) => `${k === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');

/** Unit vector from `from` to `to`. */
function unit(from: Point, to: Point): Point {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  return [(to[0] - from[0]) / len, (to[1] - from[1]) / len];
}

/** A small x for a non-navigable end: two crossed strokes on the line, behind a symbol at the same end. */
function crossPath(tip: Point, prev: Point, back: number): string {
  const u = unit(prev, tip);
  const n: Point = [-u[1], u[0]];
  const a = CLASS.crossArm;
  const along = back + CLASS.crossAt;
  const p = (da: number, dn: number): Point => [
    tip[0] - u[0] * (along + da) + n[0] * dn,
    tip[1] - u[1] * (along + da) + n[1] * dn,
  ];
  return `${pathOf([p(-a, a), p(a, -a)])} ${pathOf([p(-a, -a), p(a, a)])}`;
}

/** An unpainted stub from `from` to `tip` that carries a marker at the tip. */
const stub = (from: Point | undefined, tip: Point | undefined, marker: string | undefined, emph: boolean): Shape[] =>
  from && tip && marker
    ? [{ kind: 'path', d: pathOf([from, tip]), role: `stub-${marker}${emph ? '-accent' : ''}` }]
    : [];

/**
 * A relation in its group `edge-<k>`: a halo in the colour of the canvas that cuts lines crossing below it, the line
 * with the symbol at `to` as its marker, a stub with the symbol at `from`, and the x of non-navigable ends. Members of
 * a shared triangle draw their line from the hub, so the dashes on the common trunk lie on top of each other; their
 * triangle then sits on a stub.
 */
export function edgeShape(r: ClassRelation, route: Route, bundled: boolean, id: string): Shape {
  const p = route.points;
  const line = bundled ? [...p].reverse() : p;
  const emph = r.emph === true;
  const role = `${r.kind}${bundled ? '-bare' : ''}${emph ? '-emph' : ''}`;
  const symbols = LINE[r.kind];
  const x = crossEnds(r);
  const crosses = [
    ...(x.end && p.length > 1
      ? [crossPath(p.at(-1) as Point, p.at(-2) as Point, headLength(HEAD_AT_END[r.kind]))]
      : []),
    ...(x.start && p.length > 1 ? [crossPath(p[0] as Point, p[1] as Point, headLength(HEAD_AT_START[r.kind]))] : []),
  ];
  return {
    kind: 'group',
    id,
    children: [
      { kind: 'path', d: pathOf(p), role: 'halo' },
      { kind: 'path', d: pathOf(line), role },
      ...(bundled ? stub(p.at(-2), p.at(-1), symbols.end, emph) : []),
      ...stub(p[1], p[0], symbols.start, emph),
      ...crosses.map((d): Shape => ({ kind: 'path', d, role: r.emph ? 'crossEmph' : 'cross' })),
    ],
  };
}

/** The labels of one route in their group `label-<k>`: name, keyword, multiplicities and roles. */
export function labelShape(labels: readonly EdgeLabel[], emph: boolean, id: string): Shape {
  return {
    kind: 'group',
    id,
    children: labels.map((l) => ({
      kind: 'text',
      x: l.x,
      y: l.y,
      text: l.text,
      role: emph ? 'labelEmph' : 'label',
      font: 'label',
      anchor: l.anchor,
    })),
  };
}
