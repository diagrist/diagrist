import type { Rect } from '@diagrist/core';
import type { Route } from '../layout.js';
import type { Beside } from './beside.js';
import { sideOf } from './beside.js';
import type { Piece } from './channels.js';
import { cornerPoints } from './docks.js';
import { type Frame, linkPoints, simplify } from './geometry.js';
import type { Group, Link } from './links.js';
import type { Loops } from './loops.js';
import type { Ports } from './ports.js';
import type { Ranked } from './rank.js';
import type { Runs } from './runs.js';
import type { LayeredSpec } from './spec.js';

/** What the routes of the edges through the layers are drawn from. */
export interface EdgeRouting {
  readonly spec: LayeredSpec;
  readonly ranked: Ranked;
  readonly links: readonly Link[];
  readonly groupOf: ReadonlyMap<Link, Group>;
  readonly pieceOf: ReadonlyMap<Group, Piece>;
  readonly ports: Ports;
  readonly frame: Frame;
  readonly rects: ReadonlyMap<string, Rect>;
  readonly tracks: readonly number[];
  readonly runs: Runs;
  readonly loops: Loops;
  readonly below: Beside;
  readonly rails?: ReadonlyMap<string, unknown>;
}

/**
 * The route of every edge but the rails, in the order of the edges: a loop beside its box, an edge between two
 * boxes of one layer beside them, every other along its chain, piece by piece, a piece with an end at a corner of
 * its box out of or into that corner (`cornerPoints`), turned around where the edge runs up.
 */
export function edgeRoutes(r: EdgeRouting): Route[] {
  const corners = r.ports.corners;
  return r.spec.edges.flatMap((e): Route[] => {
    const chain = r.links.filter((l) => l.edge === e.id);
    const box = e.from === e.to ? r.rects.get(e.from) : undefined;
    if (e.from === e.to) return box === undefined || r.runs.hidden(e.id) ? [] : [r.loops.route(e, box)];
    if (chain.length === 0) {
      if (r.runs.hidden(e.id) || r.rails?.has(e.id)) return [];
      const beside = r.below.route(e, r.frame, r.tracks, r.ports);
      return beside === undefined ? [] : [beside];
    }
    const points = simplify(
      chain.flatMap((l) => {
        if (corners && (corners.upper.has(l) || corners.lower.has(l)))
          return cornerPoints(l, corners, r.ports, r.frame);
        const g = r.groupOf.get(l) as Group;
        return linkPoints(l, g, r.pieceOf.get(g), r.ports, r.frame);
      }),
    );
    const drawn = r.ranked.down.get(e.id) === false ? [...points].reverse() : points;
    return [
      { edge: e.id, points: drawn, shape: 'orthogonal', fromSide: sideOf(drawn, 'from'), toSide: sideOf(drawn, 'to') },
    ];
  });
}

/** The groups without their pieces at a corner, which take no track: a group of such pieces only goes. */
export function uncornered(groups: readonly Group[], ports: Ports): Group[] {
  const cornered = (l: Link) => ports.corners?.upper.has(l) === true || ports.corners?.lower.has(l) === true;
  return groups.flatMap((g) => {
    if (!g.links.some(cornered)) return [g];
    const rest = g.links.filter((l) => !cornered(l));
    return rest.length > 0 ? [{ ...g, links: rest }] : [];
  });
}
