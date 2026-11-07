import type { Point } from '@diagrist/core';
import type { GraphEdge, GraphNode, LayeredLayout, Route } from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';

/** Id of the point on the line of the relation at `index` that its association class hangs from. */
const pointOf = (index: number): string => `#on-${index}`;
/** Id of the second part of the line, from the point on, and of the dashed line to the class. */
const restOf = (edge: string): string => `${edge}.rest`;
const tetherOf = (edge: string): string => `${edge}.tether`;

/** Whether the relation is drawn with an association class whose dashed line the pipeline lays out. */
export const tethered = (r: ClassRelation, placed: ReadonlySet<string>): r is ClassRelation & { via: string } =>
  r.via !== undefined && placed.has(r.via) && placed.has(r.from) && placed.has(r.to) && r.from !== r.to;

/**
 * The line of an association with a class as the pipeline lays it out (layout plan, sweep item 1): a point on the
 * line, a box of no size, splits it in two parts, the first with the name and the texts at its start, the second
 * with the texts at its end; from the point a soft line runs down to the class. Order, placement and the line check
 * so see the dashed line as any other.
 */
export function tetherPieces(edge: GraphEdge, index: number, via: string): { node: GraphNode; edges: GraphEdge[] } {
  const point = pointOf(index);
  const { run, label, ...rest } = edge;
  return {
    node: { id: point, width: 0, height: 0 },
    edges: [
      { ...rest, to: point, ...(label ? { label } : {}), run: { from: run?.from ?? 0 }, first: 'from' },
      { ...rest, id: restOf(edge.id), from: point, run: { to: run?.to ?? 0 }, first: 'from' },
      { id: tetherOf(edge.id), from: point, to: via, rank: 'down', strength: 'soft' },
    ],
  };
}

/** The points of a line without points that lie on the straight between their neighbours. */
function straightened(points: readonly Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const [a, b] = [out.at(-2), out.at(-1)];
    if (b && b[0] === p[0] && b[1] === p[1]) continue;
    if (a && b && ((a[0] === b[0] && b[0] === p[0]) || (a[1] === b[1] && b[1] === p[1]))) out.pop();
    out.push(p);
  }
  return out;
}

/** Whether a node is a point an association class hangs from, which nothing draws. */
export const isPoint = (id: string): boolean => id.startsWith('#on-');

/**
 * The layout with each line of an association with a class joined again from its two parts, its texts on the joined
 * line, and the dashed lines to the classes apart, by the id of the relation's edge.
 */
export function joinTethered(layout: LayeredLayout): { layout: LayeredLayout; tethers: Map<string, Point[]> } {
  const byEdge = new Map(layout.routes.map((r) => [r.edge, r]));
  const tethers = new Map<string, Point[]>();
  const dropped = new Set<Route>();
  const routes = layout.routes.map((r) => {
    const second = byEdge.get(restOf(r.edge));
    const tether = byEdge.get(tetherOf(r.edge));
    if (!second || !tether) return r;
    dropped.add(second).add(tether);
    tethers.set(r.edge, [...tether.points]);
    return { ...r, points: straightened([...r.points, ...second.points]), toSide: second.toSide };
  });
  const kept = routes.filter((r) => !dropped.has(r));
  const index = (i: number) => {
    const r = layout.routes[i] as Route;
    const edge = r.edge.endsWith('.rest') ? r.edge.slice(0, -'.rest'.length) : r.edge;
    return kept.findIndex((k) => k.edge === edge);
  };
  const labels = layout.labels.flatMap((l) => {
    const at = index(l.route);
    return at < 0 ? [] : [{ ...l, route: at }];
  });
  return {
    layout: { ...layout, nodes: layout.nodes.filter((n) => !isPoint(n.id)), routes: kept, labels },
    tethers,
  };
}
