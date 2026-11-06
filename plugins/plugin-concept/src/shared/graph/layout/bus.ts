import type { Point } from '@diagrist/core';
import type { GraphEdge, GraphNode, LayeredLayout, Route } from '@diagrist/layout-grid';
import type { Graph, Relation } from '../model.js';
import { edgeId, edgesOf } from './edges.js';

/**
 * A complete set of relations of one link: every item of one type relates to every item of another, at least two on
 * either side, none with a text of its own. It is drawn as a bus, one line that every item above joins and every
 * item below takes from, which says "each with each" once instead of drawing every pair (decision D of 06.11.2026).
 */
export interface Bus {
  readonly id: string;
  readonly link: string;
  readonly from: readonly string[];
  readonly to: readonly string[];
  /** The relations it stands for, with their indices in source order. */
  readonly relations: readonly (readonly [Relation, number])[];
}

/** The point every line of a bus meets at, a node of no size between the two groups. */
const junction = (bus: Bus) => `bus:${bus.id}`;

/**
 * The buses of a picture: for each link that runs down the layers and each pair of types, the relations from items
 * of the first to items of the second, when they join every item of the one with every item of the other, at
 * least two by two, none has a text of its own or `worded` gives it one, and all lie in one area.
 */
export function busesOf(m: Graph, worded: (r: Relation) => boolean): Bus[] {
  const typeOf = new Map(m.items.map((i) => [i.id, i.type]));
  const areaOf = new Map(m.items.map((i) => [i.id, i.area]));
  const itemsOf = (type: string) => m.items.filter((i) => i.type === type).map((i) => i.id);
  const buses: Bus[] = [];
  for (const link of m.links.values()) {
    if (link.beside || link.upward) continue;
    const own = edgesOf(m).filter(([r]) => r.link === link.id);
    const pairs = new Set(own.map(([r]) => `${typeOf.get(r.from)}>${typeOf.get(r.to)}`));
    for (const pair of [...pairs].sort()) {
      const [a, b] = pair.split('>') as [string, string];
      const [from, to] = [itemsOf(a), itemsOf(b)];
      const relations = own.filter(([r]) => typeOf.get(r.from) === a && typeOf.get(r.to) === b);
      const joined = new Set(relations.map(([r]) => `${r.from}>${r.to}`));
      const complete = from.every((f) => to.every((t) => joined.has(`${f}>${t}`)));
      const areas = new Set(relations.map(([r]) => r.area ?? areaOf.get(r.from) ?? ''));
      const plain = relations.every(([r]) => r.label === undefined && !worded(r));
      if (a === b || from.length < 2 || to.length < 2 || !complete || joined.size !== relations.length) continue;
      if (areas.size === 1 && plain) buses.push({ id: `${buses.length}`, link: link.id, from, to, relations });
    }
  }
  return buses;
}

/**
 * The node and edges that lay out a bus on the layered pipeline: its junction between the two groups, an edge from
 * each item above into it and one out of it to each item below, each side on one whole trunk.
 */
export function busGraph(bus: Bus, soft: boolean): { node: GraphNode; edges: GraphEdge[] } {
  const j = junction(bus);
  const strength = soft ? { strength: 'soft' as const } : {};
  const edge = (id: string, from: string, to: string, side: 'in' | 'out'): GraphEdge => ({
    id,
    from,
    to,
    rank: 'down',
    bundle: `${j}:${side}`,
    trunk: 'whole',
    ...strength,
  });
  return {
    node: { id: j, width: 0, height: 0 },
    edges: [
      ...bus.from.map((f) => edge(`${j}:in:${f}`, f, j, 'in')),
      ...bus.to.map((t) => edge(`${j}:out:${t}`, j, t, 'out')),
    ],
  };
}

/** The points without repeats, and without a point in the middle of a straight run or where a run turns back. */
function tidy(points: readonly Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out.at(-1);
    if (last && last[0] === p[0] && last[1] === p[1]) continue;
    const before = out.at(-2);
    if (
      last &&
      before &&
      (before[0] === last[0]) === (last[0] === p[0]) &&
      (before[1] === last[1]) === (last[1] === p[1])
    )
      out.pop();
    out.push(p);
  }
  return out;
}

/**
 * A layout with each bus drawn: the routes into and out of its junction moved onto one line through it, and per
 * relation one route from its first item along that line to its second, named by the relation. The routes of the
 * buses' own edges and the junction itself leave the layout.
 */
export function drawBuses(layout: LayeredLayout, buses: readonly Bus[]): LayeredLayout {
  if (buses.length === 0) return layout;
  const routeOf = new Map(layout.routes.map((r) => [r.edge, r]));
  const ours = (id: string) => id.startsWith('bus:');
  const drawn = buses.flatMap((bus) => {
    const j = junction(bus);
    const at = layout.nodes.find((n) => n.id === j)?.rect;
    const y = at ? at.y + at.h / 2 : 0;
    return bus.relations.flatMap(([r, i]): Route[] => {
      const into = routeOf.get(`${j}:in:${r.from}`);
      const out = routeOf.get(`${j}:out:${r.to}`);
      if (!into || !out) return [];
      const a = into.points.slice(0, -1);
      const t = a.at(-1)?.[1];
      const upper = a.map((p, k): Point => (k > 0 && p[1] === t ? [p[0], y] : p));
      const b = out.points.slice(1);
      const s = b[0]?.[1];
      const lower = b.map((p, k): Point => (k < b.length - 1 && p[1] === s ? [p[0], y] : p));
      const meet: Point[] = [
        [upper.at(-1)?.[0] ?? 0, y],
        [lower[0]?.[0] ?? 0, y],
      ];
      return [{ ...into, edge: edgeId(i), points: tidy([...upper, ...meet, ...lower]), toSide: out.toSide }];
    });
  });
  const routes = [...layout.routes.filter((r) => !ours(r.edge)), ...drawn];
  const kept = new Map(routes.map((r, k) => [r, k]));
  const index = (old: number) => {
    const r = layout.routes[old];
    return r === undefined ? -1 : (kept.get(r) ?? -1);
  };
  return {
    ...layout,
    nodes: layout.nodes.filter((n) => !ours(n.id)),
    routes,
    labels: layout.labels.map((l) => ({ ...l, route: index(l.route) })).filter((l) => l.route >= 0),
    placed: layout.placed.filter((p) => !ours(p.key)),
  };
}
