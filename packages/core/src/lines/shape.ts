import type { Rect } from '../geometry.js';
import { axisOf, lengthOf, middle, rounded, type Segment, segmentsOf, TOLERANCE, tenth } from './lines.js';
import type { LineFinding, LineRoute, LineThresholds } from './types.js';

/** Free room between two rectangles along the axis they are apart on; 0 when they overlap. */
export function gapBetween(a: Rect, b: Rect): number {
  return Math.max(0, b.y - (a.y + a.h), a.y - (b.y + b.h), b.x - (a.x + a.w), a.x - (b.x + b.w));
}

/**
 * The rules on the shape of one line: its bends (Q3), the straight run into its head (Q4) and out of its start
 * (Q5), and no tiny inner segment nor a small offset between two parallel segments (Q6). `rectOf` finds the
 * rectangle of an end, to tell a long line from a short one.
 */
export function shapeFindings(
  route: LineRoute,
  rectOf: (id: string) => Rect | undefined,
  t: LineThresholds,
): LineFinding[] {
  const segments = segmentsOf(route);
  const first = segments[0];
  const last = segments.at(-1);
  if (first === undefined || last === undefined) return [];
  const edges = [route.edge];
  const found: LineFinding[] = [];
  const bends = segments.length - 1;
  if (bends > (long(route, rectOf, t) ? t.longBends : t.bends)) {
    found.push({ rule: 'bends', edges, at: rounded(first.a), value: bends });
  }
  if (lengthOf(last) < t.lead - TOLERANCE)
    found.push({ rule: 'lead', edges, at: rounded(last.b), value: tenth(lengthOf(last)) });
  if (lengthOf(first) < t.tail - TOLERANCE) {
    found.push({ rule: 'tail', edges, at: rounded(first.a), value: tenth(lengthOf(first)) });
  }
  for (const s of segments.slice(1, -1)) {
    if (jogs(s, segments, t)) found.push({ rule: 'jog', edges, at: rounded(middle(s)), value: tenth(lengthOf(s)) });
  }
  return found;
}

/** A line whose ends are further apart than `longGap`, or that returns to its own start, may bend more often. */
function long(route: LineRoute, rectOf: (id: string) => Rect | undefined, t: LineThresholds): boolean {
  if (route.from === route.to) return true;
  const a = rectOf(route.from);
  const b = rectOf(route.to);
  return a !== undefined && b !== undefined && gapBetween(a, b) > t.longGap;
}

/**
 * An inner segment jogs when it is shorter than `jog`, or when it offsets two parallel segments running on in the
 * same direction by less than `offset`, the step of a Z.
 */
function jogs(s: Segment, segments: readonly Segment[], t: LineThresholds): boolean {
  const length = lengthOf(s);
  if (length < t.jog - TOLERANCE) return true;
  const before = segments[s.index - 1];
  const after = segments[s.index + 1];
  if (before === undefined || after === undefined || axisOf(before) !== axisOf(after)) return false;
  const along = (x: Segment) => [Math.sign(x.b[0] - x.a[0]), Math.sign(x.b[1] - x.a[1])].join();
  return along(before) === along(after) && length < t.offset - TOLERANCE;
}
