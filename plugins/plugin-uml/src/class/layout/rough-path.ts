/** A rectangle of the automatic grid, in layers and half columns. */
export interface Span {
  readonly row: number;
  readonly rows: number;
  readonly cross: number;
  readonly width: number;
}

/** A layer is about as high as two half columns are wide. */
const ROW = 2;
const BEND = 1;
/** The length of a line that finds no way: dearer than any detour. */
const NO_WAY = 200;

const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

const inside = (v: number, lo: number, hi: number) => v > lo && v < hi;

/**
 * Is the step from grid point (x, y) one to the right (`flat`) or one down closed? Walls close their inside; the tab
 * strip of a package (`tops`) can neither be walked along nor entered from above.
 */
function closed(x: number, y: number, flat: boolean, walls: readonly Span[], tops: readonly Span[]): boolean {
  const across = (r: Span) =>
    flat
      ? inside(y, r.row, r.row + r.rows) && x >= r.cross && x + 1 <= r.cross + r.width
      : inside(x, r.cross, r.cross + r.width) && y >= r.row && y + 1 <= r.row + r.rows;
  const onTop = (r: Span) =>
    flat
      ? y === r.row && x >= r.cross && x + 1 <= r.cross + r.width
      : y + 1 === r.row && inside(x, r.cross, r.cross + r.width);
  return walls.some(across) || tops.some(onTop);
}

/** Length of a straight line between the middles of two spans that lie in one row or column, if no wall is between. */
function straight(a: Span, b: Span, walls: readonly Span[]): number | undefined {
  const [ax, ay] = [a.cross + a.width / 2, a.row + a.rows / 2];
  const [bx, by] = [b.cross + b.width / 2, b.row + b.rows / 2];
  if (ax !== bx && ay !== by) return undefined;
  const [x0, x1, y0, y1] = [Math.min(ax, bx), Math.max(ax, bx), Math.min(ay, by), Math.max(ay, by)];
  if (walls.some((r) => x0 < r.cross + r.width && x1 > r.cross && y0 < r.row + r.rows && y1 > r.row)) return undefined;
  return ax === bx
    ? ROW * Math.max(0, Math.max(a.row, b.row) - Math.min(a.row + a.rows, b.row + b.rows))
    : Math.max(0, Math.max(a.cross, b.cross) - Math.min(a.cross + a.width, b.cross + b.width));
}

/** Grid points on the border of a span. */
function rim(r: Span): [number, number][] {
  const out: [number, number][] = [];
  for (let x = r.cross; x <= r.cross + r.width; x++) out.push([x, r.row], [x, r.row + r.rows]);
  for (let y = r.row + 1; y < r.row + r.rows; y++) out.push([r.cross, y], [r.cross + r.width, y]);
  return out;
}

/** Shortest way from border to border along the grid lines inside `frame` and one line around it. */
function detour(from: Span, to: Span, walls: readonly Span[], tops: readonly Span[], frame: Span): number {
  const [x0, y0, w, h] = [frame.cross - 1, frame.row - 1, frame.width + 3, frame.rows + 3];
  const key = (x: number, y: number, d: number) => ((y - y0) * w + (x - x0)) * 4 + d;
  const dist = new Float64Array(w * h * 4).fill(Number.POSITIVE_INFINITY);
  const goal = new Set(rim(to).map(([x, y]) => `${x},${y}`));
  const open: [number, number, number, number][] = [];
  for (const [x, y] of rim(from))
    for (let d = 0; d < 4; d++) {
      dist[key(x, y, d)] = 0;
      open.push([0, x, y, d]);
    }
  while (open.length) {
    let i = 0;
    for (let j = 1; j < open.length; j++) if ((open[j]?.[0] ?? 0) < (open[i]?.[0] ?? 0)) i = j;
    const [c, x, y, d] = open.splice(i, 1)[0] ?? [0, 0, 0, 0];
    if (c > (dist[key(x, y, d)] ?? 0)) continue;
    if (goal.has(`${x},${y}`)) return c;
    for (const [k, [dx, dy]] of DIRECTIONS.entries()) {
      const [nx, ny] = [x + dx, y + dy];
      if (nx < x0 || ny < y0 || nx >= x0 + w || ny >= y0 + h) continue;
      if (closed(Math.min(x, nx), Math.min(y, ny), dy === 0, walls, tops)) continue;
      const next = c + (dy === 0 ? 1 : ROW) + (k !== d && c > 0 ? BEND : 0);
      if (next < (dist[key(nx, ny, k)] ?? 0)) {
        dist[key(nx, ny, k)] = next;
        open.push([next, nx, ny, k]);
      }
    }
  }
  return NO_WAY;
}

/**
 * Estimated length of a line between two spans, before any layout: straight if nothing is between them, else the
 * shortest way along the grid lines around `walls`, never into the tab strip of the packages in `tops`.
 */
export function roughLength(a: Span, b: Span, walls: readonly Span[], tops: readonly Span[], frame: Span): number {
  return straight(a, b, walls) ?? detour(a, b, walls, tops, frame);
}
