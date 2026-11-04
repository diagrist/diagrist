import type { Point } from '../geometry.js';
import { segmentsIntersect } from '../segment.js';
import { axisOf, bundled, meeting, rounded, type Segment, segmentsOf, TOLERANCE, tenth } from './lines.js';
import type { LineFinding, LineRoute } from './types.js';

/** Two lines that may meet: neither shares a bundle with the other. */
interface Pair {
  readonly r: LineRoute;
  readonly s: LineRoute;
  readonly rs: readonly Segment[];
  readonly ss: readonly Segment[];
}

/** Every pair of lines that share no bundle, each once, in the order of `routes`. */
export function foreignPairs(routes: readonly LineRoute[]): Pair[] {
  const segments = routes.map(segmentsOf);
  return routes.flatMap((r, i) =>
    routes
      .slice(i + 1)
      .map((s, k) => ({ r, s, rs: segments[i] ?? [], ss: segments[i + k + 1] ?? [] }))
      .filter((p) => !bundled(p.r, p.s)),
  );
}

/** Each point where two lines of a pair really cross, not only touch (Q1). */
export function crossings(pair: Pair): Point[] {
  return pair.rs.flatMap((a) => pair.ss.filter((b) => segmentsIntersect(a.a, a.b, b.a, b.b)).map((b) => meeting(a, b)));
}

/** Crossings of all pairs as findings, the edges of each sorted. */
export function crossingFindings(pairs: readonly Pair[]): LineFinding[] {
  return pairs.flatMap((p) =>
    crossings(p).map((at): LineFinding => ({ rule: 'crossing', edges: sortedEdges(p), at: rounded(at) })),
  );
}

/**
 * Parallel segments of two lines that overlap along their axis by more than a pixel and run closer than `least`
 * (Q7). A shared track, at distance 0, counts as well.
 */
export function parallelFindings(pairs: readonly Pair[], least: number): LineFinding[] {
  return pairs.flatMap((p) =>
    p.rs.flatMap((a) =>
      p.ss.flatMap((b): LineFinding[] => {
        const axis = axisOf(a);
        if (axis === 'd' || axis !== axisOf(b)) return [];
        const [along, across]: [0 | 1, 0 | 1] = axis === 'h' ? [0, 1] : [1, 0];
        const lo = Math.max(Math.min(a.a[along], a.b[along]), Math.min(b.a[along], b.b[along]));
        const hi = Math.min(Math.max(a.a[along], a.b[along]), Math.max(b.a[along], b.b[along]));
        const distance = Math.abs(a.a[across] - b.a[across]);
        if (hi - lo <= TOLERANCE || distance >= least - TOLERANCE) return [];
        const mid = (lo + hi) / 2;
        const at: Point = axis === 'h' ? [mid, a.a[1]] : [a.a[0], mid];
        return [{ rule: 'parallel', edges: sortedEdges(p), at: rounded(at), value: tenth(distance) }];
      }),
    ),
  );
}

const sortedEdges = (p: Pair): string[] => [p.r.edge, p.s.edge].sort();
