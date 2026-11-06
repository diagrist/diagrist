import type { Group, Link } from './links.js';

/** The room an end has on its side between its neighbours, as `portsOf` measures it. */
type Room = (box: string, side: 'top' | 'bottom', l: Link) => [number, number];

/**
 * Whole trunks that slip past a member: the trunk of a fan leaves its box where the member nearest the middle would
 * run straight, but that member's own end may have moved a little in the order of its side. Where one member's end
 * lies less than `jog` from the trunk and within the trunk's room, the trunk moves onto it, so that member runs
 * straight and no vertical of the trunk stands a slip beside it; the same for the trunk of a join.
 */
export function straightTrunks(
  groups: readonly Group[],
  top: Map<Link, number>,
  bottom: Map<Link, number>,
  room: Room,
  jog: number,
  placeholder: (id: string) => boolean,
): void {
  for (const g of groups) {
    if (g.kind === 'single' || g.whole !== true) continue;
    const first = g.links[0] as Link;
    const fan = g.kind === 'fan';
    const [trunk, member] = fan ? [bottom, top] : [top, bottom];
    const box = fan ? first.upper : first.lower;
    if (placeholder(box)) continue;
    const at = trunk.get(first) ?? 0;
    const [lo, hi] = room(box, fan ? 'bottom' : 'top', first);
    const to = g.links
      .map((l) => member.get(l) ?? at)
      .filter((v) => v !== at && Math.abs(v - at) < jog && v >= lo && v <= hi)
      .sort((a, b) => Math.abs(a - at) - Math.abs(b - at) || a - b)[0];
    if (to === undefined) continue;
    for (const l of g.links) trunk.set(l, to);
  }
}
