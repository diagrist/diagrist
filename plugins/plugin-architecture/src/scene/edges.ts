import { domId, type Point, type Shape, type Tone } from '@diagrist/core';
import type { Route } from '@diagrist/layout-grid';
import type { ArchEdge, ArchitectureModel } from '../model/types.js';
import { EDGE_LOOK } from '../styles/roles.js';
import { haloPieces, type Surface } from './surfaces.js';

const pathOf = (points: readonly Point[]): string =>
  points.map(([x, y], k) => `${k === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');

/**
 * An edge with its own tone: the line in the tone, its heads the tone's large filled markers (`TONED_MARKERS`), a
 * piece of the first leg drawn backwards for the head at the start of `<->`.
 */
function tonedShapes(points: readonly Point[], e: ArchEdge, tone: Tone): Shape[] {
  const look = EDGE_LOOK[e.kind];
  const role = `toned-${tone}${look.dashed ? '-dashed' : ''}${look.head ? '-head' : ''}`;
  const back = [points[1], points[0]] as Point[];
  return [
    { kind: 'path', d: pathOf(points), role },
    ...(e.kind === 'duplex' ? [{ kind: 'path', d: pathOf(back), role } as const] : []),
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
export function edgeShapes(model: ArchitectureModel, routes: readonly Route[], under: readonly Surface[]): Shape[] {
  const edgeOf = (r: Route) => model.edges[Number(r.edge)];
  return routes.flatMap((r, i): Shape[] => {
    const e = edgeOf(r);
    if (!e) return [];
    const change = e.origin === 'added' || e.origin === 'removed' ? `-${e.origin}` : '';
    const role = `edge-${e.kind}${change || (e.step?.accent ? '-accent' : '')}`;
    const halo = model.adaptive
      ? halos(routes, i, edgeOf).flatMap((p): Shape[] => [
          { kind: 'path', d: pathOf(p), role: 'edgeHalo' },
          ...haloPieces(p, under),
        ])
      : [];
    const [a, b] = r.points as readonly [Point, Point];
    const line: Shape[] = e.tone
      ? tonedShapes(r.points, e, e.tone)
      : [
          { kind: 'path', d: pathOf(r.points), role },
          ...(e.kind === 'duplex' ? [{ kind: 'path', d: `M${b[0]} ${b[1]} L${a[0]} ${a[1]}`, role } as const] : []),
        ];
    return [{ kind: 'group', id: domId.edge(i), children: [...halo, ...line] }];
  });
}
