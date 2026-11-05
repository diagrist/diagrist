import { type Point, textWidth } from '@diagrist/core';
import type { EdgeLabel, Route } from '@diagrist/layout-grid';
import type { Behaviour } from '../diagram.js';
import { guardText } from './box.js';
import { STATE_FONTS as F, STATE as S } from './metrics.js';

/**
 * Lines of a transition label. The order `trigger [guard] / effect` always stays; it breaks only between the parts:
 * first before the effect, then before the guard too.
 */
export function labelLines(t: Behaviour, protocol: boolean): string[] {
  const fits = (s: string) => textWidth(s, F.label) <= S.labelLineW;
  const guard = t.when ? guardText(t.when) : '';
  const [first, second] = protocol ? [guard, t.on ?? ''] : [t.on ?? '', guard];
  const effect = protocol && t.post ? `/ ${guardText(t.post)}` : t.do ? `/ ${t.do}` : '';
  const join = (...parts: string[]) => parts.filter(Boolean).join(' ');
  const full = join(first, second, effect);
  if (!full || fits(full)) return full ? [full] : [];
  const head = join(first, second);
  if (fits(head) || !first || !second) return [head, effect].filter(Boolean);
  return [first, second, effect].filter(Boolean);
}

/** Widest line of a label as it is set. */
export const labelWidth = (lines: readonly string[]): number => Math.max(0, ...lines.map((l) => textWidth(l, F.label)));

function longest(points: readonly Point[]): [Point, Point] {
  let best: [Point, Point] = [points[0] ?? [0, 0], points[1] ?? points[0] ?? [0, 0]];
  let len = -1;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1] as Point, points[i] as Point];
    const l = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    if (l > len) [best, len] = [[a, b], l];
  }
  return best;
}

/** Is the route a rail: out, along the rail, back in on the same side? */
export const isRail = (r: Route): boolean => r.fromSide === r.toSide && r.points.length === 4 && r.shape !== 'loop';

/** The piece the label stands at: the outer side of a loop, the rail, else the longest piece. */
export function labelSegment(r: Route): [Point, Point] {
  return r.shape === 'loop' || isRail(r) ? [r.points[1] ?? [0, 0], r.points[2] ?? [0, 0]] : longest(r.points);
}

function line(text: string, x: number, y: number, anchor: EdgeLabel['anchor'], route: number): EdgeLabel {
  const w = textWidth(text, F.label);
  const left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  return { text, x, y, anchor, box: { x: left, y: y - F.label.size, w, h: F.label.size + 2 }, route, part: 'name' };
}

/**
 * The label of a transition: left of vertical pieces, above horizontal ones, right of a loop. Rails on the right or
 * below carry their text outside, and so does the right one of two lines side by side between the same states
 * (`twin`). Collisions are solved after this by `placeLabels`.
 */
export function transitionTexts(lines: readonly string[], r: Route, route: number, twin = false): EdgeLabel[] {
  if (!lines.length || r.points.length < 2) return [];
  const self = r.shape === 'loop';
  const [a, b] = labelSegment(r);
  const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const outside = r.fromSide === r.toSide && (r.fromSide === 'right' || r.fromSide === 'bottom');
  if (a[1] === b[1] && !self) {
    const base = outside ? my + S.labelGap + F.label.size : my - S.labelGap - (lines.length - 1) * S.labelLineH;
    return lines.map((l, i) => line(l, mx, base + i * S.labelLineH, 'middle', route));
  }
  const right = self ? r.fromSide === 'right' : outside || twin;
  const x = right ? mx + S.labelGap : mx - S.labelGap;
  const y0 = my - ((lines.length - 1) * S.labelLineH) / 2 + Math.round(F.label.size * 0.4);
  return lines.map((l, i) => line(l, x, y0 + i * S.labelLineH, right ? 'start' : 'end', route));
}

/**
 * The routes whose text goes right of their line: of two transitions between the same states whose texts stand
 * beside vertical pieces next to each other, the right one, so the two texts face away from each other. `pairOf`
 * names the two states of a route, the same whichever way it runs.
 */
export function rightTwins(routes: readonly Route[], pairOf: (r: Route) => string): ReadonlySet<number> {
  const vertical = routes.map((r) => {
    const [a, b] = labelSegment(r);
    const upright = r.shape !== 'loop' && !isRail(r) && a[0] === b[0] && a[1] !== b[1];
    return upright ? { x: a[0], lo: Math.min(a[1], b[1]), hi: Math.max(a[1], b[1]) } : undefined;
  });
  const twins = new Set<number>();
  routes.forEach((r, i) => {
    const mine = vertical[i];
    if (mine === undefined) return;
    const beside = routes.some((o, j) => {
      const other = vertical[j];
      if (j === i || other === undefined || pairOf(o) !== pairOf(r) || other.x >= mine.x) return false;
      return other.lo < mine.hi && other.hi > mine.lo;
    });
    if (beside) twins.add(i);
  });
  return twins;
}
