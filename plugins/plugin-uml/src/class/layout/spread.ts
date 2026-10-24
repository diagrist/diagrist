import type { LayerEdge } from '@diagrist/layout-grid';
import { type Block, type Cell, flatten, LEAF, leftOf, type Stacked } from './blocks.js';
import { roughLength, type Span } from './rough-path.js';

/** What a crossing of two lines costs, in half columns of line. */
const CROSSING = 4;

/** An estimated line between the middles of its ends. */
interface Link {
  readonly a: readonly [number, number];
  readonly b: readonly [number, number];
  readonly length: number;
}

const cellSpan = (c: Cell): Span => ({ row: c.row, rows: 1, cross: c.cross, width: 2 });
const middle = (r: Span): [number, number] => [r.cross + r.width / 2, r.row + r.rows / 2];

const turn = (p: readonly number[], q: readonly number[], r: readonly number[]) =>
  Math.sign(
    ((q[0] ?? 0) - (p[0] ?? 0)) * ((r[1] ?? 0) - (p[1] ?? 0)) -
      ((q[1] ?? 0) - (p[1] ?? 0)) * ((r[0] ?? 0) - (p[0] ?? 0)),
  );

/** Do two links cross, as straight lines between their middles? Links sharing an end never do. */
function cross(s: Link, t: Link): boolean {
  if ([s.a, s.b].some((p) => [t.a, t.b].some((q) => p[0] === q[0] && p[1] === q[1]))) return false;
  return turn(s.a, s.b, t.a) * turn(s.a, s.b, t.b) < 0 && turn(t.a, t.b, s.a) * turn(t.a, t.b, s.b) < 0;
}

/**
 * How far apart the linked classifiers of different blocks of one level stand: per relation the rough length of its
 * line, ending at the classifier or at the border of a package, plus a toll per crossing. Classifiers and foreign
 * packages are walls; a line keeps out of the tab strip of the packages it joins.
 */
export function spread(
  s: Stacked,
  inner: ReadonlyMap<string, Block>,
  edges: readonly LayerEdge[],
  lift: (id: string) => string | undefined,
): number {
  const { cells } = flatten(s, inner);
  const left = leftOf(s);
  const spans = new Map<string, Span>(
    [...s.corners].map(([n, c]) => {
      const b = inner.get(n) ?? LEAF;
      return [n, { row: c.row, rows: b.rows, cross: c.cross - left, width: b.cross }];
    }),
  );
  const all = [...spans.values()];
  const frame: Span = {
    row: 0,
    rows: Math.max(...all.map((r) => r.row + r.rows)),
    cross: 0,
    width: Math.max(...all.map((r) => r.cross + r.width)),
  };
  const isPackage = (n: string) => (inner.get(n) ?? LEAF) !== LEAF;
  const links = edges.flatMap((e): Link[] => {
    const [from, to] = [lift(e.from), lift(e.to)];
    const [fromSpan, toSpan] = [
      from === undefined ? undefined : spans.get(from),
      to === undefined ? undefined : spans.get(to),
    ];
    if (from === to || !fromSpan || !toSpan) return [];
    const end = (id: string, block: Span) => {
      const c = cells.get(id);
      return c ? cellSpan(c) : block;
    };
    const [a, b] = [end(e.from, fromSpan), end(e.to, toSpan)];
    const walls = [
      ...[...spans].filter(([n]) => n !== from && n !== to && isPackage(n)).map(([, r]) => r),
      ...[...cells].filter(([id]) => id !== e.from && id !== e.to).map(([, c]) => cellSpan(c)),
    ];
    const tops = [...spans].filter(([n]) => (n === from || n === to) && isPackage(n)).map(([, r]) => r);
    return [{ a: middle(a), b: middle(b), length: roughLength(a, b, walls, tops, frame) }];
  });
  return links.reduce(
    (sum, l, i) => sum + l.length + CROSSING * links.slice(i + 1).filter((other) => cross(l, other)).length,
    0,
  );
}
