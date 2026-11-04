import type { Point, Rect } from '../geometry.js';
import { segmentsIntersect } from '../segment.js';
import { axisOf, bundled, rounded, type Segment, segmentsOf, TOLERANCE, tenth } from './lines.js';
import type { Side } from './rects.js';
import type { LineFinding, LineRoute } from './types.js';

/** Where a line leaves or enters a box: the side, the place along it, the line's segments and the two at this end. */
interface Port {
  readonly route: LineRoute;
  readonly node: string;
  readonly side: Side;
  readonly at: Point;
  readonly along: number;
  readonly segments: readonly Segment[];
  readonly near: readonly Segment[];
}

/** The side a straight end segment meets its box on, seen from outside, or none for a slanted one. */
function sideOf(s: Segment, leaving: boolean): Side | undefined {
  const axis = axisOf(s);
  if (axis === 'd') return undefined;
  const forward = axis === 'h' ? s.b[0] > s.a[0] : s.b[1] > s.a[1];
  const outward = leaving ? forward : !forward;
  if (axis === 'h') return outward ? 'right' : 'left';
  return outward ? 'bottom' : 'top';
}

const near = (p: Point, r: Rect): boolean =>
  p[0] >= r.x - 2 * TOLERANCE &&
  p[0] <= r.x + r.w + 2 * TOLERANCE &&
  p[1] >= r.y - 2 * TOLERANCE &&
  p[1] <= r.y + r.h + 2 * TOLERANCE;

/** Both ends of every line that meet their box with a straight segment, as ports. */
function portsOf(routes: readonly LineRoute[], rectOf: (id: string) => Rect | undefined): Port[] {
  return routes.flatMap((route) => {
    const segments = segmentsOf(route);
    const first = segments[0];
    const last = segments.at(-1);
    if (first === undefined || last === undefined) return [];
    const ends: [string, Segment, boolean][] = [
      [route.from, first, true],
      [route.to, last, false],
    ];
    return ends.flatMap(([node, s, leaving]): Port[] => {
      const rect = rectOf(node);
      const side = sideOf(s, leaving);
      const at = leaving ? s.a : s.b;
      if (rect === undefined || side === undefined || !near(at, rect)) return [];
      const i = side === 'top' || side === 'bottom' ? 0 : 1;
      const close = leaving ? segments.slice(0, 2) : segments.slice(-2);
      return [{ route, node, side, at, along: at[i], segments, near: close }];
    });
  });
}

/**
 * Ports on one side of a box (Q8): two lines outside a common bundle keep `least` apart (`spacing`), and they stand
 * in an order that lets them part without crossing (`order`): the two segments at the box of one line do not cross
 * the other line. Nested lines, such as two rails around the same side, keep their ends in opposite orders and
 * still never cross, so they pass.
 */
export function portFindings(
  routes: readonly LineRoute[],
  rectOf: (id: string) => Rect | undefined,
  least: number,
): LineFinding[] {
  const ports = portsOf(routes, rectOf);
  return ports.flatMap((p, i) =>
    ports.slice(i + 1).flatMap((q): LineFinding[] => {
      if (p.node !== q.node || p.side !== q.side || bundled(p.route, q.route)) return [];
      const edges = [p.route.edge, q.route.edge].sort();
      const at = rounded(p.at);
      const gap = Math.abs(p.along - q.along);
      const base = { rule: 'ports' as const, edges, at, other: p.node };
      if (gap < least - TOLERANCE) return [{ ...base, detail: 'spacing', value: tenth(gap) }];
      return interleaved(p, q) ? [{ ...base, detail: 'order' }] : [];
    }),
  );
}

/** Whether the lines of two ports cross where one of them leaves or enters the box. */
function interleaved(p: Port, q: Port): boolean {
  const meets = (near: readonly Segment[], all: readonly Segment[]) =>
    near.some((a) => all.some((b) => segmentsIntersect(a.a, a.b, b.a, b.b)));
  return meets(p.near, q.segments) || meets(q.near, p.segments);
}
