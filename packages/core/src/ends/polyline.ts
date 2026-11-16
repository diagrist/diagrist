import type { Point } from '../geometry.js';

/** A command letter or a number of path data. */
const TOKEN = /[MLHVZmlhvz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g;

/**
 * The pieces of path data drawn in absolute commands, each an `M` followed by `L`, `H` and `V`, and whether `Z`
 * closes the last. Anything else, curves, arcs or relative commands, gives `undefined`.
 */
export function polylineOf(d: string): { pieces: Point[][]; closed: boolean } | undefined {
  const tokens = d.match(TOKEN) ?? [];
  const pieces: Point[][] = [];
  let closed = false;
  let k = 0;
  const next = (): number | undefined => {
    const n = Number(tokens[k]);
    if (tokens[k] === undefined || Number.isNaN(n)) return undefined;
    k++;
    return n;
  };
  while (k < tokens.length) {
    const command = tokens[k++];
    const piece = pieces.at(-1);
    const last = piece?.at(-1);
    if (closed || (command !== 'M' && last === undefined)) return undefined;
    if (command === 'M' || command === 'L') {
      const x = next();
      const y = next();
      if (x === undefined || y === undefined) return undefined;
      if (command === 'M' || piece === undefined) pieces.push([[x, y]]);
      else piece.push([x, y]);
    } else if ((command === 'H' || command === 'V') && piece !== undefined && last !== undefined) {
      const v = next();
      if (v === undefined) return undefined;
      piece.push(command === 'H' ? [v, last[1]] : [last[0], v]);
    } else if (command === 'Z') closed = true;
    else return undefined;
  }
  return pieces.length === 0 || pieces.some((p) => p.length < 2) ? undefined : { pieces, closed };
}

/** Path data of pieces of polylines in `M` and `L`. */
export const polylineData = (pieces: readonly (readonly Point[])[]): string =>
  pieces.map((points) => points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')).join(' ');

/** The unit vector from `from` to `to`, `[0, 0]` when they are the same point. */
export function direction(from: Point, to: Point): Point {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return length === 0 ? [0, 0] : [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
}

/**
 * The polyline shortened by `by` along its length at its last point, walking back over vertices it passes, so a
 * line that ends in short pieces, such as one following an arc, keeps the way it points. A polyline not longer than
 * `by` stays as it is.
 */
export function shortenEnd(points: readonly Point[], by: number): readonly Point[] {
  if (by <= 0) return points;
  const out = [...points];
  let rest = by;
  while (out.length >= 2) {
    const end = out.at(-1) as Point;
    const before = out.at(-2) as Point;
    const length = Math.hypot(end[0] - before[0], end[1] - before[1]);
    if (length > rest) {
      const [dx, dy] = direction(end, before);
      out[out.length - 1] = [end[0] + dx * rest, end[1] + dy * rest];
      return out;
    }
    rest -= length;
    out.pop();
  }
  return points;
}

/** The polyline shortened by `by` at its first point, as `shortenEnd` does at its last. */
export const shortenStart = (points: readonly Point[], by: number): readonly Point[] =>
  [...shortenEnd([...points].reverse(), by)].reverse();

/** The direction a polyline runs into its last point, from the last point before it that lies elsewhere. */
export function arrival(points: readonly Point[]): Point {
  const end = points.at(-1) as Point;
  for (let i = points.length - 2; i >= 0; i--) {
    const way = direction(points[i] as Point, end);
    if (way[0] !== 0 || way[1] !== 0) return way;
  }
  return [0, 0];
}
