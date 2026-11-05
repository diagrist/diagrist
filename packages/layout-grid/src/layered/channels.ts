import type { Group, Link } from './links.js';
import type { Ports } from './ports.js';

/**
 * A horizontal piece in a gap between two layers, as the track assigner sees it: the verticals that come down into it
 * from above (`tops`) and that leave it downwards (`bottoms`), its span, and the track it got, 0 the highest.
 */
export interface TrackPiece {
  readonly tops: readonly number[];
  readonly bottoms: readonly number[];
  readonly x1: number;
  readonly x2: number;
  /**
   * The boxes the piece leaves above and enters below, as `up:<id>` and `down:<id>`; two pieces that leave or enter one
   * box keep `APART` from each other on a shared track.
   */
  readonly boxes?: readonly string[];
  track: number;
}

/** A horizontal piece of a layered picture, with the group of lines it carries. */
export interface Piece extends TrackPiece {
  readonly group: Group;
}

/** Two pieces need different tracks when they come this close along the gap. */
const NEAR = 8;

/** Two pieces at one box need different tracks when they come this close, or they read as one line into it. */
const APART = 48;

const near = (a: TrackPiece, b: TrackPiece) => (a.boxes?.some((n) => b.boxes?.includes(n)) ? APART : NEAR);
const overlap = (a: TrackPiece, b: TrackPiece) => a.x1 < b.x2 + near(a, b) && b.x1 < a.x2 + near(a, b);
const inside = (v: number, p: TrackPiece) => v > p.x1 + 0.5 && v < p.x2 - 0.5;

/**
 * Verticals that run side by side when `a` runs above `b`: one going down from `a` and one coming down into `b`,
 * closer than `apart`. Both pass the stretch between the two tracks.
 */
const beside = (a: TrackPiece, b: TrackPiece, apart: number) =>
  apart <= 0 ? 0 : a.bottoms.reduce((n, u) => n + b.tops.filter((t) => Math.abs(t - u) < apart).length, 0);

/**
 * Crossings when `a` runs above `b`: verticals of `b` coming down through `a`, of `a` going down through `b`. A pair
 * of verticals side by side counts twice, as two lines that close read as one.
 */
const over = (a: TrackPiece, b: TrackPiece, apart: number) =>
  b.tops.filter((t) => inside(t, a)).length + a.bottoms.filter((u) => inside(u, b)).length + 2 * beside(a, b, apart);

/** The horizontal pieces of one gap: every group whose ends are not on one vertical, with the ends of its verticals. */
export function piecesOf(groups: readonly Group[], ports: Ports): Piece[] {
  return groups.flatMap((g): Piece[] => {
    const tops = [...new Set(g.links.map((l: Link) => ports.bottom.get(l) ?? 0))];
    const bottoms = [...new Set(g.links.map((l: Link) => ports.top.get(l) ?? 0))];
    const all = [...tops, ...bottoms];
    const x1 = Math.min(...all);
    const x2 = Math.max(...all);
    if (g.kind === 'single' && x2 - x1 <= 1) return [];
    const boxes = [...new Set(g.links.flatMap((l) => [`up:${l.upper}`, `down:${l.lower}`]))];
    return [{ group: g, tops, bottoms, x1, x2, boxes, track: 0 }];
  });
}

/**
 * Tracks for the pieces of one gap. The order from the top is built greedily: next comes the piece that loses the
 * most crossings by running above the pieces still left rather than below them, ties to the leftmost. A piece then
 * takes the track below the lowest earlier piece it meets, so pieces that do not meet share a track. With `apart`,
 * a vertical going down from one piece and one coming down into another closer than that count as crossings too,
 * where the order of the two would put them side by side. Returns how many tracks the gap needs.
 */
export function assignTracks(pieces: TrackPiece[], apart = 0): number {
  const left = [...pieces];
  const order: TrackPiece[] = [];
  while (left.length > 0) {
    const cost = (p: TrackPiece) =>
      left.filter((q) => q !== p && overlap(p, q)).reduce((s, q) => s + over(p, q, apart) - over(q, p, apart), 0);
    const best = [...left].sort((a, b) => cost(a) - cost(b) || a.x1 - b.x1 || a.x2 - b.x2)[0] as TrackPiece;
    order.push(best);
    left.splice(left.indexOf(best), 1);
  }
  for (const [i, p] of order.entries()) {
    const above = order.slice(0, i).filter((q) => overlap(p, q));
    p.track = above.length === 0 ? 0 : Math.max(...above.map((q) => q.track)) + 1;
  }
  return order.length === 0 ? 0 : Math.max(...order.map((p) => p.track)) + 1;
}

/** How a gap is measured: from its top to the first track, between tracks, from the last track to its bottom. */
export interface GapMeasure {
  readonly first: number;
  readonly track: number;
  readonly last: number;
  readonly min: number;
}

/** The height of a gap with `tracks` tracks: room above and below them, at least `min`. */
export const gapHeight = (tracks: number, m: GapMeasure): number =>
  Math.max(m.min, tracks === 0 ? m.first + m.last : m.first + (tracks - 1) * m.track + m.last);
