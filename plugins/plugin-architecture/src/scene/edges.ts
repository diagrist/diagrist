import { domId, type Point, type Shape, type Tone } from '@diagrist/core';
import type { Route } from '@diagrist/layout-grid';
import type { ArchEdge, ArchitectureModel } from '../model/types.js';
import { EDGE_LOOK } from '../styles/roles.js';
import { haloPieces, type Surface } from './surfaces.js';

const pathOf = (points: readonly Point[]): string =>
  points.map(([x, y], k) => `${k === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');

/** A filled head at `tip`, coming from `from`: `size` long, half as wide. */
function head(tip: Point, from: Point, size: number, tone: Tone): Shape {
  const dx = Math.sign(tip[0] - from[0]);
  const dy = Math.sign(tip[1] - from[1]);
  const back: Point = [tip[0] - dx * size, tip[1] - dy * size];
  const w = size * 0.5;
  const d = `M${tip[0]} ${tip[1]} L${back[0] - dy * w} ${back[1] + dx * w} L${back[0] + dy * w} ${back[1] - dx * w} Z`;
  return { kind: 'path', d, role: `fill-${tone}` };
}

/** The line shortened at one end, so it does not poke through a head. */
function trim(points: readonly Point[], end: boolean, by: number): Point[] {
  const out = [...points];
  const [i, j] = end ? [out.length - 1, out.length - 2] : [0, 1];
  const a = out[i] as Point;
  const b = out[j] as Point;
  out[i] = [a[0] - Math.sign(a[0] - b[0]) * by, a[1] - Math.sign(a[1] - b[1]) * by];
  return out;
}

/** An edge with its own tone: the line in the tone, heads as filled triangles instead of markers. */
function tonedShapes(points: readonly Point[], e: ArchEdge, tone: Tone, size: number): Shape[] {
  const look = EDGE_LOOK[e.kind];
  const start = e.kind === 'duplex';
  const end = look.head !== undefined;
  let line = [...points];
  if (end) line = trim(line, true, size * 0.6);
  if (start) line = trim(line, false, size * 0.6);
  return [
    { kind: 'path', d: pathOf(line), role: look.dashed ? `toned-${tone}-dashed` : `toned-${tone}` },
    ...(end ? [head(points.at(-1) as Point, points.at(-2) as Point, size, tone)] : []),
    ...(start ? [head(points[0] as Point, points[1] as Point, size, tone)] : []),
  ];
}

/** Halos of a route: a bundle draws those of all its members at its first one, so its branches stay whole. */
function halos(routes: readonly Route[], i: number, edgeOf: (r: Route) => ArchEdge | undefined): (readonly Point[])[] {
  const r = routes[i] as Route;
  const bundle = edgeOf(r)?.bundle;
  if (bundle === undefined) return [r.points];
  const members = routes.filter((o) => edgeOf(o)?.bundle === bundle);
  return members[0] === r ? members.map((o) => o.points) : [];
}

/**
 * Every edge in its group `edge-<i>`: in an adaptive grid first a halo in the canvas colour that cuts lines it
 * crosses, then the line with its arrowhead, a second head at the start for `<->`.
 */
export function edgeShapes(
  model: ArchitectureModel,
  routes: readonly Route[],
  under: readonly Surface[],
  markerSize: number,
): Shape[] {
  const edgeOf = (r: Route) => model.edges[Number(r.edge)];
  return routes.flatMap((r, i): Shape[] => {
    const e = edgeOf(r);
    if (!e) return [];
    const role = `edge-${e.kind}${e.step?.accent ? '-accent' : ''}`;
    const halo = model.adaptive
      ? halos(routes, i, edgeOf).flatMap((p): Shape[] => [
          { kind: 'path', d: pathOf(p), role: 'edgeHalo' },
          ...haloPieces(p, under),
        ])
      : [];
    const [a, b] = r.points as readonly [Point, Point];
    const line: Shape[] = e.tone
      ? tonedShapes(r.points, e, e.tone, markerSize * 2)
      : [
          { kind: 'path', d: pathOf(r.points), role },
          ...(e.kind === 'duplex' ? [{ kind: 'path', d: `M${b[0]} ${b[1]} L${a[0]} ${a[1]}`, role } as const] : []),
        ];
    return [{ kind: 'group', id: domId.edge(i), children: [...halo, ...line] }];
  });
}
