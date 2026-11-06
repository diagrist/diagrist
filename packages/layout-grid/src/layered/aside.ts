import type { Group, Link } from './links.js';

/** The room an end has on its side between its neighbours, as `portsOf` measures it. */
type Room = (box: string, side: 'top' | 'bottom', l: Link) => [number, number];

/**
 * Ends on the top of a box that would stand under a line beside its layer: such a line runs down out of a box of
 * the layer above, along a track below all others of the gap and up again, so its two verticals cross the whole
 * gap, and a piece that enters a box below at the same place would lie on one of them. Such an end moves `gap`
 * away from it, to the side its room allows, the nearer first; the links of a join move together.
 */
export function clearOfAside(
  groups: readonly Group[],
  aside: readonly Link[],
  top: Map<Link, number>,
  bottom: ReadonlyMap<Link, number>,
  room: Room,
  gap: number,
  placeholder: (id: string) => boolean,
): void {
  for (const g of groups) {
    const lower = g.kind === 'join' ? [g.links[0] as Link] : g.links;
    for (const l of lower) {
      if (placeholder(l.lower)) continue;
      const at = top.get(l) ?? 0;
      const near = aside.filter((a) => a.gap === l.gap).map((a) => bottom.get(a) ?? 0);
      const hit = near.find((v) => Math.abs(v - at) < gap);
      if (hit === undefined) continue;
      const [lo, hi] = room(l.lower, 'top', l);
      const free = [hit - gap, hit + gap]
        .filter((v) => v >= lo && v <= hi && near.every((u) => Math.abs(u - v) >= gap))
        .sort((a, b) => Math.abs(a - at) - Math.abs(b - at));
      const to = free[0];
      if (to === undefined) continue;
      for (const k of g.kind === 'join' ? g.links : [l]) top.set(k, to);
    }
  }
}
