import type { Point, Rect } from '@diagrist/core';

type Segment = readonly [Point, Point];

/**
 * A stretch a line shares with another, as the trunk of a fan or a join, and the side a text of the line may stand
 * beside it: the side its own line turns to where they part, or, where it runs straight on, a side the other line
 * does not turn to; none where neither holds.
 */
export interface SharedPiece {
  readonly piece: Segment;
  readonly side: -1 | 0 | 1;
}

/** The part two upright or two flat segments on one line have in common, undefined where they share no length. */
function common(a: Segment, b: Segment): Segment | undefined {
  const [p, q] = a;
  const [r, s] = b;
  const flat = p[1] === q[1] && r[1] === s[1] && p[1] === r[1];
  const upright = p[0] === q[0] && r[0] === s[0] && p[0] === r[0];
  if (flat === upright) return undefined;
  const k = flat ? 0 : 1;
  const lo = Math.max(Math.min(p[k], q[k]), Math.min(r[k], s[k]));
  const hi = Math.min(Math.max(p[k], q[k]), Math.max(r[k], s[k]));
  if (hi - lo < 1) return undefined;
  const at = (v: number): Point => (flat ? [v, p[1]] : [p[0], v]);
  return [at(lo), at(hi)];
}

const same = (a: Point, b: Point) => Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) < 0.5;
/** The coordinate across a stretch: y of a flat one, x of an upright one. */
const across = (s: Segment) => (s[0][1] === s[1][1] ? 1 : 0);

/**
 * The side across `stretch` that `points` turn to where they leave it at `at`: -1 or 1, 0 where they run straight on
 * or end there.
 */
function turn(points: readonly Point[], at: Point, stretch: Segment): -1 | 0 | 1 {
  const k = across(stretch);
  const i = points.findIndex((p) => same(p, at));
  if (i < 0) return 0;
  const near = [points[i - 1], points[i + 1]].filter((p): p is Point => p !== undefined);
  const off = near.map((p) => p[k] - at[k]).find((d) => Math.abs(d) >= 0.5) ?? 0;
  return off === 0 ? 0 : off > 0 ? 1 : -1;
}

/** The end of the shared stretch where the two lines part: the one that is no end of line `a`. */
function parting(piece: Segment, a: readonly Point[]): Point {
  const ends = [a[0], a.at(-1)].filter((p): p is Point => p !== undefined);
  return ends.some((e) => same(e, piece[0])) ? piece[1] : piece[0];
}

/**
 * The stretches each route shares with a route it is `bundled` with, as the trunk of a fan or a join, with the side a
 * text of the route may stand beside each: where two lines share a stretch, a text beside it would name both, so it
 * stands on the part that is only its own line's, or on the side where only its own line goes on.
 */
export function sharedOf(
  routes: readonly (readonly Point[])[],
  bundled: (a: number, b: number) => boolean,
): SharedPiece[][] {
  const segments = routes.map((points) => points.slice(1).map((p, i): Segment => [points[i] as Point, p]));
  return routes.map((own, i) =>
    segments.flatMap((other, j): SharedPiece[] =>
      j === i || !bundled(i, j)
        ? []
        : (segments[i] ?? []).flatMap((a) =>
            other.flatMap((b): SharedPiece[] => {
              const piece = common(a, b);
              if (piece === undefined) return [];
              const at = parting(piece, own);
              const mine = turn(own, at, piece);
              const theirs = turn(routes[j] ?? [], at, piece);
              const side = mine !== 0 ? mine : theirs === 0 ? 0 : theirs === 1 ? -1 : 1;
              return [{ piece, side: mine === 0 && theirs === 0 ? 0 : side }];
            }),
          ),
    ),
  );
}

/**
 * Whether a rectangle stands beside a shared stretch on a side its line may not take there: within `gap` of it
 * across, and over some of its length along, so a text right after the point where the lines part stands beside its
 * own line only.
 */
export function besideShared({ piece: [p, q], side }: SharedPiece, r: Rect, gap: number): boolean {
  const flat = p[1] === q[1];
  const [lo, hi] = flat ? [Math.min(p[0], q[0]), Math.max(p[0], q[0])] : [Math.min(p[1], q[1]), Math.max(p[1], q[1])];
  const [from, to] = flat ? [r.x, r.x + r.w] : [r.y, r.y + r.h];
  const at = flat ? p[1] : p[0];
  const [near, far] = flat ? [r.y, r.y + r.h] : [r.x, r.x + r.w];
  const beside = from < hi && to > lo && near < at + gap && far > at - gap;
  const towards = (near + far) / 2 > at ? 1 : -1;
  return beside && towards !== side;
}
