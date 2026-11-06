import type { Point, Rect } from '@diagrist/core';
import { right, type Side, segmentHitsRect } from '../../geometry.js';
import { adaptiveRoutes } from '../adaptive.js';
import { type Board, boardOf, groupKey, headStrips } from '../boxes.js';
import { dropRoutes } from '../drop.js';
import { gridRoutes } from '../grid.js';
import type { Routed } from '../routed.js';
import { searchPath, simplify } from '../search.js';
import { channelRoutes } from './index.js';
import { untangle } from './untangle.js';

const stub = (p: Point, side: Side, gap: number): Point => [
  p[0] + (side === 'right' ? gap : side === 'left' ? -gap : 0),
  p[1] + (side === 'bottom' ? gap : side === 'top' ? -gap : 0),
];

/** The head strips of the frames that hold neither end of a route, which its pieces keep out of. */
function foreignHeads(board: Board): (r: Routed) => Rect[] {
  const headers = headStrips(board.layout.groups, board.tree.spec.metrics.framePad.top);
  return (r) =>
    headers.filter((_, i) => {
      const id = groupKey((board.layout.groups[i] as { id: string }).id);
      return id !== r.from.id && id !== r.to.id;
    });
}

/** Whether a route runs through a node it does not join, `gap / 2` around it. */
function blocked(board: Board, r: Routed, gap: number): boolean {
  const own = new Set([r.from.id, r.to.id]);
  const rects = board.nodes.filter((n) => !own.has(n.id)).map((n) => n.rect);
  return r.points
    .slice(1)
    .some((q, i) => rects.some((rect) => segmentHitsRect(r.points[i] as Point, q, rect, gap / 2)));
}

/**
 * A straight upright route of an edge with a `lane` runs in the middle of that column, where both of its boxes reach
 * over it, as the adaptive router docks it, so a line through stacked frames keeps to its column.
 */
function inLane(board: Board, r: Routed): Routed {
  const col = r.edge.lane ? board.layout.cols.find((c) => c.name === r.edge.lane) : undefined;
  const [a, b] = r.points;
  if (!col || !a || !b || r.points.length !== 2 || a[0] !== b[0]) return r;
  const x = col.x + col.w / 2;
  const fits = [r.from.rect, r.to.rect].every((rect) => x >= rect.x && x <= right(rect));
  return fits
    ? {
        ...r,
        points: [
          [x, a[1]],
          [x, b[1]],
        ],
      }
    : r;
}

/**
 * The fallback for a route the channels hold no free way for: the path search around nodes, foreign head strips and
 * the routes laid so far, from the ports the channel stage gave it. It stays as it was where the search finds none.
 */
function searched(board: Board, r: Routed, used: readonly (readonly Point[])[], heads: readonly Rect[]): Routed {
  const gap = board.tree.spec.metrics.laneGap;
  const start = r.points[0] as Point;
  const end = r.points.at(-1) as Point;
  const blocks = [...board.nodes.map((n) => n.rect), ...heads, ...(r.edge.avoid ?? [])];
  const middle = searchPath(stub(start, r.fromSide, gap), stub(end, r.toSide, gap), blocks, used, gap);
  if (!middle) return r;
  const points = simplify([start, ...middle, end]);
  return { ...r, points, shape: points.length === 2 ? 'straight' : 'orthogonal' };
}

/**
 * Routes of an adaptive grid through its channels (layout plan P10): the grid's boxes stand where its columns and
 * rows put them, and the channel stage of fixed grids (ADR 0038) gives every edge its ports, shape and track. Three
 * things stay the adaptive grid's own. Bundles keep the shared trunks the adaptive router lays (`bundle`). An edge
 * into a wide box above or below its other end, which the channels would bend around what stands between, drops as
 * an L down the gap beside its narrow end where that is free (`drops`, `dropRoutes`). And an edge the channels hold
 * no free way for, whose route still runs through a node, takes the path search as a fallback, the only use of the
 * search left here.
 */
export function adaptiveChannelRoutes(board: Board): Routed[] {
  const spec = board.tree.spec;
  const gap = spec.metrics.laneGap;
  const bundled = spec.edges.some((e) => e.bundle !== undefined);
  const trunks = bundled ? adaptiveRoutes(gridRoutes(board), board).filter((r) => r.edge.bundle !== undefined) : [];
  const rest = boardOf({ ...spec, edges: spec.edges.filter((e) => e.bundle === undefined) }, board.layout);
  const channelled = channelRoutes(rest).map((r) => inLane(board, r));
  const heads = foreignHeads(board);
  const open = channelled.map((r) => (r.shape === 'straight' || r.shape === 'loop' ? undefined : r));
  const laid = (skip: (i: number) => boolean) => [
    ...trunks.map((r) => r.points),
    ...channelled.flatMap((r, i) => (skip(i) ? [] : [r.points])),
  ];
  const used: Point[][] = laid((i) => open[i] !== undefined).map((p) => [...p]);
  const drops = spec.drops === true ? dropRoutes(open, board, heads, used, gap) : new Map<number, Routed>();
  const done = channelled.map((r, i) => drops.get(i) ?? r);
  const routed = done.map((r, i) => {
    if (r.shape === 'loop' || !blocked(board, r, gap)) return r;
    const others = [...trunks.map((t) => t.points), ...done.filter((_, k) => k !== i).map((o) => o.points)];
    return searched(board, r, others, heads(r));
  });
  const byId = new Map([...trunks, ...untangle(routed, board)].map((r) => [r.edge.id, r]));
  return spec.edges.flatMap((e) => {
    const r = byId.get(e.id);
    return r ? [r] : [];
  });
}
