import type { Rect } from '@diagrist/core';
import type { Group, Link } from './links.js';
import type { Ports } from './ports.js';
import type { Ranked } from './rank.js';
import type { LayeredSpec } from './spec.js';

/** The boxes in a frame, directly or in the frames inside it. */
function boxesOf(spec: LayeredSpec, frame: string): string[] {
  const frames = spec.frames ?? [];
  const inside = (f: string | undefined, seen = 0): boolean =>
    f !== undefined &&
    seen <= frames.length &&
    (f === frame || inside(frames.find((g) => g.id === f)?.parent, seen + 1));
  return frames.flatMap((f) => (inside(f.id) ? f.members : []));
}

/**
 * The ports of the ends that stand for a frame (`LayeredEdge.framed`) moved across the frame: such an end runs to a
 * box of the frame only to take a place in the order, and `released` cuts its line at the frame's outline, so its
 * port may stand anywhere across the frame. Where the piece at such an end stands alone (no fan or join), it runs
 * straight: both its ends move to one vertical across the boxes of the frame, as near the other end's port as its
 * box allows where that end is the only one on its side, else at that port, and `gap` clear of the ends of every
 * other piece between the two layers, the nearest such vertical first; where there is none, the port alone moves
 * as near the other end as the frame allows, so the passes that move boxes can bring the other end under it. So a
 * line leaving a frame at its bottom runs straight down to a box below it, wherever in the frame's last layer that
 * stands, and clear of the lines beside it.
 */
export function acrossFrames(
  spec: LayeredSpec,
  groups: readonly Group[],
  rects: ReadonlyMap<string, Rect>,
  ports: Ports,
  gap: number,
  ranked: Pick<Ranked, 'dummies'>,
): Ports {
  const framed = new Map(spec.edges.flatMap((e) => (e.framed === undefined ? [] : [[e.id, e] as const])));
  if (framed.size === 0) return ports;
  const top = new Map(ports.top);
  const bottom = new Map(ports.bottom);
  const span = (frame: string): [number, number] => {
    const rs = boxesOf(spec, frame).flatMap((n) => rects.get(n) ?? []);
    const pad = spec.frames?.find((f) => f.id === frame)?.pad ?? 0;
    return [Math.min(...rs.map((r) => r.x)) - pad + gap, Math.max(...rs.map((r) => r.x + r.w)) + pad - gap];
  };
  const all = groups.flatMap((g) => g.links);
  const alone = (box: string, end: 'upper' | 'lower') => all.filter((o) => o[end] === box).length === 1;
  const reach = (box: string, at: number, end: 'upper' | 'lower'): [number, number] => {
    const r = rects.get(box);
    if (r === undefined || ranked.dummies.has(box) || !alone(box, end)) return [at, at];
    const inset = Math.min(16, r.w / 4);
    return [r.x + inset, r.x + r.w - inset];
  };
  for (const g of groups) {
    const l = g.links[0] as Link;
    const e = framed.get(l.edge);
    if (g.kind !== 'single' || e === undefined) continue;
    for (const end of ['from', 'to'] as const) {
      const frame = e.framed?.[end];
      if (frame === undefined || (l.upper !== e[end] && l.lower !== e[end])) continue;
      const up = l.upper === e[end];
      const [mine, theirs] = up ? [bottom, top] : [top, bottom];
      const x = theirs.get(l) ?? 0;
      const [a, b] = reach(up ? l.lower : l.upper, x, up ? 'lower' : 'upper');
      const [f0, f1] = span(frame);
      const [lo, hi] = [Math.max(a, f0), Math.min(b, f1)];
      const others = all.filter((o) => o !== l && o.gap === l.gap).flatMap((o) => [top.get(o), bottom.get(o)]);
      const clear = (v: number) => others.every((w) => w === undefined || Math.abs(w - v) >= gap);
      const nearest = (from: number, to: number) =>
        [0, 1, -1, 2, -2, 3, -3]
          .map((k) => Math.min(to, Math.max(from, x)) + k * gap)
          .find((v) => v >= from && v <= to && clear(v));
      const both = nearest(lo, hi);
      const at = both ?? nearest(f0, f1);
      if (at === undefined) continue;
      mine.set(l, at);
      if (both !== undefined) theirs.set(l, at);
    }
  }
  return { ...ports, top, bottom };
}
