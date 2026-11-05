import type { Rect } from '@diagrist/core';
import { isotoneApart } from './isotone.js';
import type { Group, Link } from './links.js';
import type { Ranked } from './rank.js';

/** Where every piece leaves its upper end and reaches its lower end, by `Link`. */
export interface Ports {
  readonly top: Map<Link, number>;
  readonly bottom: Map<Link, number>;
}

/**
 * One end on a side of a box: the pieces that leave or reach it there together, where the end would stand
 * (`toward`), and where the far ends of its pieces are (`beyond`), which orders the ends of a side. The two differ for
 * the members of a fan or join, which aim straight at their own box but come from the trunk.
 */
interface End {
  readonly links: readonly Link[];
  readonly toward: number;
  readonly beyond: number;
}

/** Keeps ends this far from the corners of a box. */
const corners = (r: Rect) => Math.min(16, r.w / 4);
/** How near a corner an end may come when that spares its line a jog of less than `jog`. */
const CORNER = 4;

/**
 * The ends on every side of every box: a fan leaves through one end, a join arrives through one end, every other
 * piece through its own. On a side, ends stand in the order of the far ends of their pieces, so no two pieces cross
 * at their box, each as near above or below its other end as the side and a gap of `gap` between ends allow; a fan or
 * join aims at its member nearest the middle, so that member runs straight. Placeholders are a single point. Then every piece whose two ends are the only ones
 * on their sides runs straight where the two boxes share a stretch, and an end that is the only one on its side
 * follows the other end of its piece wherever its box reaches, up to `CORNER` from a corner when the jog it spares
 * is shorter than `jog`: no small jogs. `inset` keeps ends off the corners. `aside` are ends on the bottom of `upper`
 * of lines that run below their layer to `lower` beside it; they take their place in the order like the others, so
 * the outermost goes to the line whose other end lies furthest out.
 */
export function portsOf(
  groups: readonly Group[],
  ranked: Pick<Ranked, 'dummies'>,
  rects: ReadonlyMap<string, Rect>,
  x: ReadonlyMap<string, number>,
  gap: number,
  snap = 8,
  inset: (r: Rect) => number = corners,
  jog = 24,
  aside: readonly Link[] = [],
): Ports {
  const top = new Map<Link, number>();
  const bottom = new Map<Link, number>();
  const ends = new Map<string, End[]>();
  const add = (box: string, side: 'top' | 'bottom', links: readonly Link[], toward: number) => {
    if (ranked.dummies.has(box)) return;
    const k = `${box}|${side}`;
    const far = links.map((l) => x.get(side === 'bottom' ? l.lower : l.upper) ?? 0);
    const beyond = far.reduce((a, b) => a + b, 0) / Math.max(1, far.length);
    ends.set(k, [...(ends.get(k) ?? []), { links, toward, beyond }]);
  };
  const nearest = (box: string, ids: readonly string[]) => {
    const r = rects.get(box);
    const c = r ? r.x + r.w / 2 : 0;
    const xs = ids.map((n) => x.get(n) ?? 0).filter((v) => !r || (v >= r.x + inset(r) && v <= r.x + r.w - inset(r)));
    if (xs.length === 0) return ids.reduce((s, n) => s + (x.get(n) ?? 0), 0) / Math.max(1, ids.length);
    return [...xs].sort((a, b) => Math.abs(a - c) - Math.abs(b - c) || a - b)[0] as number;
  };
  for (const g of groups) {
    const lowers = g.links.map((l) => l.lower);
    const uppers = g.links.map((l) => l.upper);
    if (g.kind === 'fan') add(uppers[0] as string, 'bottom', g.links, nearest(uppers[0] as string, lowers));
    else for (const l of g.links) add(l.upper, 'bottom', [l], x.get(g.kind === 'join' ? l.upper : l.lower) ?? 0);
    if (g.kind === 'join') add(lowers[0] as string, 'top', g.links, nearest(lowers[0] as string, uppers));
    else for (const l of g.links) add(l.lower, 'top', [l], x.get(g.kind === 'fan' ? l.lower : l.upper) ?? 0);
  }
  for (const l of aside) add(l.upper, 'bottom', [l], x.get(l.lower) ?? 0);
  for (const l of groups.flatMap((g) => g.links)) {
    if (ranked.dummies.has(l.upper)) bottom.set(l, x.get(l.upper) ?? 0);
    if (ranked.dummies.has(l.lower)) top.set(l, x.get(l.lower) ?? 0);
  }
  for (const [k, list] of ends) {
    const [box = '', side] = k.split('|');
    const r = rects.get(box);
    if (!r) continue;
    const sorted = [...list].sort((a, b) => a.beyond - b.beyond || a.toward - b.toward);
    const lo = r.x + inset(r);
    const hi = r.x + r.w - inset(r);
    const step = sorted.length < 2 ? 0 : Math.min(gap, (hi - lo) / (sorted.length - 1));
    const wanted = sorted.map((e) => Math.min(hi, Math.max(lo, e.toward)));
    const placed = isotoneApart(
      wanted,
      wanted.map(() => 1),
      sorted.slice(1).map(() => step),
    );
    const shift = Math.min(0, hi - (placed.at(-1) ?? hi)) + Math.max(0, lo - (placed[0] ?? lo));
    sorted.forEach((e, i) => {
      const at = Math.round((placed[i] ?? 0) + shift);
      for (const l of e.links) (side === 'bottom' ? bottom : top).set(l, at);
    });
  }
  const alone = (box: string, side: 'top' | 'bottom') => (ends.get(`${box}|${side}`) ?? []).length <= 1;
  const range = (box: string): [number, number] => {
    const r = rects.get(box);
    if (!r) return [x.get(box) ?? 0, x.get(box) ?? 0];
    return [r.x + inset(r), r.x + r.w - inset(r)];
  };
  for (const g of groups) {
    if (g.kind !== 'single') continue;
    const l = g.links[0] as Link;
    if (!alone(l.upper, 'bottom') || !alone(l.lower, 'top')) continue;
    const [a0, a1] = range(l.upper);
    const [b0, b1] = range(l.lower);
    const lo = Math.max(a0, b0);
    const hi = Math.min(a1, b1);
    if (lo > hi) continue;
    const mid = ((bottom.get(l) ?? 0) + (top.get(l) ?? 0)) / 2;
    const at = Math.round(Math.min(hi, Math.max(lo, mid)));
    bottom.set(l, at);
    top.set(l, at);
  }
  const within = (box: string, v: number) => {
    const [lo, hi] = range(box);
    return v >= lo && v <= hi;
  };
  for (const g of groups) {
    if (g.kind !== 'single') continue;
    const l = g.links[0] as Link;
    const b = bottom.get(l) ?? 0;
    const t = top.get(l) ?? 0;
    if (b === t) continue;
    const real = (n: string) => !ranked.dummies.has(n);
    const near = (box: string, v: number) => {
      const r = rects.get(box);
      return Math.abs(b - t) < jog && r !== undefined && v >= r.x + CORNER && v <= r.x + r.w - CORNER;
    };
    if (real(l.upper) && alone(l.upper, 'bottom') && within(l.upper, t)) bottom.set(l, t);
    else if (real(l.lower) && alone(l.lower, 'top') && within(l.lower, b)) top.set(l, b);
    else if (Math.abs(b - t) <= snap && real(l.lower) && alone(l.lower, 'top')) top.set(l, b);
    else if (real(l.upper) && alone(l.upper, 'bottom') && near(l.upper, t)) bottom.set(l, t);
    else if (real(l.lower) && alone(l.lower, 'top') && near(l.lower, b)) top.set(l, b);
  }
  return { top, bottom };
}
