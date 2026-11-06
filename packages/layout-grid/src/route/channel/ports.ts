import type { Board, Box } from '../boxes.js';
import type { Plan } from '../grid.js';
import type { Port } from '../ports.js';
import { reservedOn } from '../reserve.js';
import { type End, endsOf, flat, middle } from './ends.js';
import { freeOf, intersect, nearest, type Range, sideOf, within } from './free.js';
import { apartFacing, placeEnds } from './sides.js';

/**
 * The x a column of reserved sides keeps free for its vertical lines: right of the widest reserved stretch of its
 * boxes, so the lines of a column stand on one spine.
 */
function spineOf(board: Board, box: Box, gap: number): number | undefined {
  const reach = board.nodes
    .filter((n) => n.colIndex === box.colIndex)
    .flatMap((n) => [reservedOn(board.node(n.id), n.rect, 'top'), reservedOn(board.node(n.id), n.rect, 'bottom')])
    .flatMap((r) => (r ? [r[1] + gap] : []));
  return reach.length === 0 ? undefined : Math.max(...reach);
}

/**
 * Whether a box of one column only, in the column of `box`, has a stretch reserved from the start of its top or
 * bottom side, such as a name in the top edge, that reaches past `centre`: then every line of the column keeps to
 * the spine right of the names. A stretch centred on its side, such as an icon circle, moves only the lines it meets.
 */
function namesPast(board: Board, box: Box, centre: number, gap: number): boolean {
  return board.nodes.some((n) => {
    const node = board.node(n.id);
    if (n.colIndex !== box.colIndex || !node || (node.to?.col ?? node.col) !== node.col) return false;
    return (['top', 'bottom'] as const).some((side) => {
      const at = reservedOn(node, n.rect, side);
      return node.reserve?.[side]?.origin !== 'middle' && at !== undefined && at[1] + gap > centre;
    });
  });
}

/**
 * Straight edges between the same two boxes run `spread` apart around the middle of what their sides share, each
 * in the free stretches of both sides; a column of reserved sides keeps its spine, the column of the narrower box,
 * where its middle is reserved or a name of the column reaches past it (`namesPast`), so its lines stand on one x. An edge whose boxes share no free
 * stretch gets no place and bends instead.
 */
function straightPorts(board: Board, plans: readonly Plan[], spread: number, gap: number): Map<Plan, number> {
  const groups = new Map<string, Plan[]>();
  for (const p of plans.filter((q) => q.shape === 'straight')) {
    const k = `${[p.a.id, p.b.id].sort().join('|')}|${flat(p.fromSide)}`;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  const out = new Map<Plan, number>();
  for (const members of groups.values()) {
    const first = members[0] as Plan;
    const ranges = intersect(freeOf(board, first.a, first.fromSide, gap), freeOf(board, first.b, first.toSide, gap));
    if (ranges.length === 0) continue;
    const [a, b] = [sideOf(first.a, first.fromSide), sideOf(first.b, first.toSide)];
    const shared: Range = [Math.max(a[0], b[0]), Math.min(a[1], b[1])];
    const centre = middle(a) === middle(b) ? middle(a) : middle(shared);
    const narrow = first.b.rect.w < first.a.rect.w ? first.b : first.a;
    const spine = flat(first.fromSide) ? spineOf(board, narrow, gap) : undefined;
    const named = spine !== undefined && namesPast(board, narrow, centre, gap);
    const kept = spine === undefined || !within(spine, ranges) || (within(centre, ranges) && !named);
    const c = kept ? centre : spine;
    members.forEach((p, i) => {
      const at = nearest(c + (i - (members.length - 1) / 2) * spread, ranges);
      if (at !== undefined) out.set(p, at);
    });
  }
  return out;
}

/**
 * The ports of a channel grid, by plan: straight edges first, then the bent ends of every side around them, and
 * last the ends of two facing sides whose lines would run on one another across their gap, placed together
 * (`apartFacing`). A straight edge without a place shared by both sides is missing from the result and has to bend.
 */
export function channelPorts(board: Board, plans: readonly Plan[], spread: number, gap: number): Map<Plan, Port> {
  const straight = straightPorts(board, plans, 2 * spread, gap);
  const sides = new Map<string, End[]>();
  for (const e of plans.flatMap(endsOf)) {
    const k = `${e.box.id}|${e.side}`;
    sides.set(k, [...(sides.get(k) ?? []), e]);
  }
  const along = new Map<End, number>();
  for (const list of sides.values())
    for (const e of list) if (straight.has(e.plan)) along.set(e, straight.get(e.plan) as number);
  const placing = { board, sides, along, spread, gap };
  for (const list of sides.values()) {
    const first = list[0] as End;
    placeEnds(placing, list, freeOf(board, first.box, first.side, gap));
  }
  apartFacing(placing);
  const out = new Map<Plan, Port>();
  for (const [e, v] of along) {
    const port = out.get(e.plan) ?? { from: v, to: v };
    out.set(e.plan, e.at === 'from' ? { ...port, from: v } : { ...port, to: v });
  }
  return out;
}
