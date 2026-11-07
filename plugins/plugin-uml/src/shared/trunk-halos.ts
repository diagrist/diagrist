import { type Point, type Shape, STROKES } from '@diagrist/core';

type Path = readonly (readonly [number, number])[] | readonly Point[];
type Pt = readonly [number, number];

/** How far a halo stops short of a point on an earlier line: half the widest line and half a pixel of smoothing. */
const GAP = STROKES.emph / 2 + 0.5;

const pathOf = (points: readonly Pt[]): string =>
  points.map(([x, y], k) => `${k === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');

/** A straight piece as `[axis, at, from, to]`: axis 0 runs along x at height `at`, axis 1 along y at `x = at`. */
type Piece = readonly [0 | 1, number, number, number];

function pieceOf(a: Pt, b: Pt): Piece | undefined {
  if (Math.abs(a[1] - b[1]) < 0.5) return [0, a[1], Math.min(a[0], b[0]), Math.max(a[0], b[0])];
  if (Math.abs(a[0] - b[0]) < 0.5) return [1, a[0], Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  return undefined;
}

const piecesOf = (points: Path): Piece[] =>
  points.slice(1).flatMap((b, k) => {
    const p = pieceOf(points[k] as Pt, b);
    return p ? [p] : [];
  });

/** Whether `p` lies on one of the pieces. */
const onAny = (p: Pt, pieces: readonly Piece[]): boolean =>
  pieces.some(([axis, at, from, to]) => {
    const along = p[axis];
    const across = p[axis === 0 ? 1 : 0];
    return Math.abs(across - at) < 0.5 && along > from - 0.5 && along < to + 0.5;
  });

/**
 * Whether a halo of axis `axis` ending at `p` would cut an earlier line: one crosses its axis at `p` and runs on beside
 * `p` where the line itself does not, so nothing paints it again. A halo ending at `p` along an earlier line misses
 * what continues beyond, and one beside the line's own next piece is painted over.
 */
const exposed = (p: Pt, axis: 0 | 1, earlier: readonly Piece[], own: readonly Piece[]): boolean =>
  earlier.some((q) => {
    if (q[0] === axis || !onAny(p, [q])) return false;
    return [1, -1].some((d) => {
      const r: Pt = q[0] === 0 ? [p[0] + d, p[1]] : [p[0], p[1] + d];
      return r[q[0]] >= q[2] && r[q[0]] <= q[3] && !onAny(r, own);
    });
  });

/** The distances along `a → b` where the segment enters or leaves one of the `earlier` pieces lying on it. */
function breaks(a: Pt, b: Pt, earlier: readonly Piece[]): number[] {
  const own = pieceOf(a, b);
  if (!own) return [];
  const [axis, at, from, to] = own;
  const start = a[axis];
  const sign = b[axis] >= start ? 1 : -1;
  return earlier.flatMap(([qa, qat, qf, qt]) => {
    if (qa !== axis || Math.abs(qat - at) >= 0.5) return [];
    return [qf, qt].filter((v) => v > from + 0.5 && v < to - 0.5).map((v) => (v - start) * sign);
  });
}

/** The segment `a → b` shortened by `GAP` at the ends that meet an earlier line, or nothing if that leaves none. */
function shorten(a: Pt, b: Pt, atA: boolean, atB: boolean): Pt[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const t0 = atA ? GAP : 0;
  const t1 = atB ? len - GAP : len;
  if (t1 - t0 <= 0) return [];
  const at = (t: number): Pt => [a[0] + ((b[0] - a[0]) * t) / len, a[1] + ((b[1] - a[1]) * t) / len];
  return [at(t0), at(t1)];
}

/** The path cut into segments at its corners and wherever it enters or leaves an earlier line. */
function segmentsOf(points: Path, earlier: readonly Piece[]): [Pt, Pt][] {
  return points.slice(1).flatMap((b, i): [Pt, Pt][] => {
    const a = points[i] as Pt;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len === 0) return [];
    const at = (t: number): Pt => [a[0] + ((b[0] - a[0]) * t) / len, a[1] + ((b[1] - a[1]) * t) / len];
    const ts = [0, ...breaks(a, b, earlier).sort((p, q) => p - q), len];
    return ts.slice(1).map((t, j): [Pt, Pt] => [at(ts[j] as number), at(t)]);
  });
}

/**
 * The halo of line `k`, a stroke in the colour of the canvas that cuts the lines painted before it where they cross.
 * Where the line meets an earlier line that runs on beside it, as a member of a shared trunk meets the others at its
 * junction and at the hub, its halo stops short of the meeting point: a halo running through it cut the earlier line
 * beside the point, (halo − stroke) / 2 wide, where this line does not paint again. Where both run together the halo
 * stays, so the earlier stroke below does not thicken the line.
 */
export function haloOf(paths: readonly Path[], k: number): Shape[] {
  const points = paths[k] ?? [];
  const earlier = paths.slice(0, k).flatMap(piecesOf);
  const own = piecesOf(points);
  const segments = segmentsOf(points, earlier);
  const meets = segments.map(([a, b]) => {
    const axis = pieceOf(a, b)?.[0];
    return axis === undefined
      ? ([false, false] as const)
      : ([exposed(a, axis, earlier, own), exposed(b, axis, earlier, own)] as const);
  });
  if (!meets.some(([a, b]) => a || b)) return [{ kind: 'path', d: pathOf(points), role: 'halo' }];
  const runs: Pt[][] = [];
  let open = false;
  segments.forEach(([a, b], i) => {
    const [atA, atB] = meets[i] ?? [false, false];
    const piece = shorten(a, b, atA, atB);
    const last = runs.at(-1);
    if (piece.length === 0) open = false;
    else if (open && last && !atA) last.push(piece[1] as Pt);
    else runs.push(piece);
    open = piece.length > 0 && !atB;
  });
  return runs.length ? [{ kind: 'path', d: runs.map(pathOf).join(' '), role: 'halo' }] : [];
}
