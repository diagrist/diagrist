/** Where a path begins or ends, and the direction of its line there in degrees, 0 pointing right. */
export interface PathEnd {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
}

type Point = readonly [number, number];

const COMMAND = /([MLHVZmlhvz])([^MLHVZmlhvz]*)/g;

/** The corners of a path of straight segments, `M L H V Z` absolute or relative, or `undefined` for anything else. */
function corners(d: string): Point[] | undefined {
  if (/[^MLHVZmlhvz\d\s,.eE+-]/.test(d)) return undefined;
  const points: Point[] = [];
  let at: Point = [0, 0];
  let start: Point = at;
  for (const [, command = '', args = ''] of d.matchAll(COMMAND)) {
    const n =
      args.trim() === ''
        ? []
        : args
            .trim()
            .split(/[\s,]+/)
            .map(Number);
    if (n.some((v) => !Number.isFinite(v))) return undefined;
    const relative = command === command.toLowerCase();
    const upper = command.toUpperCase();
    const go = (x: number, y: number): void => {
      at = [x, y];
      points.push(at);
    };
    const from = points.length;
    const dx = () => (relative ? at[0] : 0);
    const dy = () => (relative ? at[1] : 0);
    if (upper === 'Z') go(start[0], start[1]);
    else if (upper === 'H') for (const v of n) go(dx() + v, at[1]);
    else if (upper === 'V') for (const v of n) go(at[0], dy() + v);
    else for (let i = 0; i + 1 < n.length; i += 2) go(dx() + (n[i] ?? 0), dy() + (n[i + 1] ?? 0));
    if (upper === 'M') start = points[from] ?? start;
  }
  return points;
}

const degrees = (from: Point, to: Point): number => (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;

/**
 * The first and the last point of a path of straight segments, each with the direction of the segment it belongs to,
 * as `orient="auto"` turns a marker there; `undefined` when the path has curves or fewer than two distinct points.
 */
export function pathEnds(d: string): { start: PathEnd; end: PathEnd } | undefined {
  const found = corners(d);
  if (found === undefined) return undefined;
  const points = found.filter((p, i) => i === 0 || p[0] !== found[i - 1]?.[0] || p[1] !== found[i - 1]?.[1]);
  const [first, second] = points;
  const [before, last] = points.slice(-2);
  if (first === undefined || second === undefined || before === undefined || last === undefined) return undefined;
  return {
    start: { x: first[0], y: first[1], angle: degrees(first, second) },
    end: { x: last[0], y: last[1], angle: degrees(before, last) },
  };
}
