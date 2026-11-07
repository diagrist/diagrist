import { type Point, type Rect, segmentMeetsRect, segmentsIntersect } from '@diagrist/core';
import type { GraphEdge, GraphNode } from './spec.js';
import { straightRoute } from './straight-route.js';

/** A line keeps this far from a box it does not join, as the line check asks. */
export const CLEAR = 6;
/** A line through a box weighs as ten crossings, as in `scoreOf`. */
const THROUGH = 10;

/** Boxes by id, as laid out or moved. */
export type Moved = Map<string, Rect>;

/** A straight line of an edge between the boxes it joins. */
interface Line {
  readonly e: GraphEdge;
  readonly p: Point;
  readonly q: Point;
}

/** The ends of the straight line of `e` between the boxes `rects` holds. */
export function endsOf(e: GraphEdge, nodes: ReadonlyMap<string, GraphNode>, rects: Moved): [Point, Point] | undefined {
  const [a, b] = [rects.get(e.from), rects.get(e.to)];
  if (a === undefined || b === undefined) return undefined;
  const r = straightRoute(e.id, { rect: a, node: nodes.get(e.from) }, { rect: b, node: nodes.get(e.to) });
  return [r.points[0] ?? [0, 0], r.points[1] ?? [0, 0]];
}

/** The straight lines of `edges` whose ends `rects` holds, in the order of the edges. */
const linesOf = (edges: readonly GraphEdge[], nodes: ReadonlyMap<string, GraphNode>, rects: Moved): Line[] =>
  edges.flatMap((e) => {
    const ends = endsOf(e, nodes, rects);
    return ends === undefined ? [] : [{ e, p: ends[0], q: ends[1] }];
  });

/** Two lines that share no end and cross. */
const crosses = (a: Line, b: Line): boolean =>
  ![a.e.from, a.e.to].some((n) => n === b.e.from || n === b.e.to) && segmentsIntersect(a.p, a.q, b.p, b.q);

/** What one line costs by itself: the boxes of `rects` it does not join and the heads it runs through, the frames. */
const alone =
  (heads: readonly Rect[], foreign: (e: GraphEdge) => readonly Rect[]) =>
  (l: Line, rects: Moved): number => {
    let c = 0;
    for (const [id, r] of rects)
      if (id !== l.e.from && id !== l.e.to && segmentMeetsRect(l.p, l.q, r, CLEAR)) c += THROUGH;
    c += THROUGH * heads.filter((h) => segmentMeetsRect(l.p, l.q, h, CLEAR)).length;
    c += foreign(l.e).filter((f) => segmentMeetsRect(l.p, l.q, f, CLEAR)).length;
    return c;
  };

/**
 * Lines through boxes they do not join or through the heads of frames, ten each, crossings of lines that share no
 * end, and lines through frames that hold neither of their ends or closer past them than `CLEAR`, as the line check
 * keeps lines from boxes. Shared with `packFrames`, which moves boxes before the lines are cleared.
 */
export function costOf(
  edges: readonly GraphEdge[],
  nodes: ReadonlyMap<string, GraphNode>,
  rects: Moved,
  heads: readonly Rect[],
  foreign: (e: GraphEdge) => readonly Rect[],
): number {
  const lines = linesOf(edges, nodes, rects);
  const own = alone(heads, foreign);
  let cost = 0;
  lines.forEach((l, i) => {
    cost += own(l, rects);
    for (const k of lines.slice(i + 1)) if (crosses(l, k)) cost++;
  });
  return cost;
}

/**
 * The cost of `rects` with one box moved, from the cost of `rects` itself: only the lines ending at the moved box
 * change their course, every other line changes only whether it meets that box, and crossings between two unmoved
 * lines stay. The same sum as `costOf` over the whole picture, reckoned over the lines the move touches.
 */
export function movedCost(
  edges: readonly GraphEdge[],
  nodes: ReadonlyMap<string, GraphNode>,
  rects: Moved,
  heads: readonly Rect[],
  foreign: (e: GraphEdge) => readonly Rect[],
): (cost: number, id: string, moved: Rect) => number {
  const lines = linesOf(edges, nodes, rects);
  const own = alone(heads, foreign);
  /** What the lines `ls` cost by themselves, by crossing one another and by crossing `others`. */
  const part = (ls: readonly Line[], others: readonly Line[], boxes: Moved) => {
    let c = 0;
    ls.forEach((l, i) => {
      c += own(l, boxes);
      for (const k of others) if (crosses(l, k)) c++;
      for (const k of ls.slice(i + 1)) if (crosses(l, k)) c++;
    });
    return c;
  };
  /** Per box: the lines ending at it, the others, and what both cost where the box stands, the same for every move. */
  const known = new Map<string, { touched: Line[]; others: Line[]; was: number }>();
  const of = (id: string) => {
    const got = known.get(id);
    if (got !== undefined) return got;
    const r = rects.get(id) as Rect;
    const touched = lines.filter((l) => l.e.from === id || l.e.to === id);
    const others = lines.filter((l) => l.e.from !== id && l.e.to !== id);
    const meets = others.filter((l) => segmentMeetsRect(l.p, l.q, r, CLEAR)).length;
    const made = { touched, others, was: THROUGH * meets + part(touched, others, rects) };
    known.set(id, made);
    return made;
  };
  return (cost, id, moved) => {
    const { touched, others, was } = of(id);
    const trial = new Map(rects).set(id, moved);
    const after = linesOf(
      touched.map((l) => l.e),
      nodes,
      trial,
    );
    let c = cost - was + part(after, others, trial);
    for (const l of others) if (segmentMeetsRect(l.p, l.q, moved, CLEAR)) c += THROUGH;
    return c;
  };
}
