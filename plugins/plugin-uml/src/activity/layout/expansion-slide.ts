import type { Point, Rect } from '@diagrist/core';
import { expansionText } from './expansion.js';
import { ACT, SIZE, widthOf } from './metrics.js';
import { meets, piecesOf, through } from './pieces.js';
import type { PlacedNode, Placement, Routed } from './placement.js';
import type { RegionArt } from './regions.js';
import { activityArt } from './size.js';

/** How far inside its node a line ends at least: the middle of its outer slot. */
const INSET = ACT.expansionSlot / 2;

/** The shortest step across a line may take, as the line check reads a shorter one as a slip. */
const JOG = 24;

/** The box of a node with the text beside it. */
function boxes(p: PlacedNode): Rect[] {
  const t = p.art.side;
  if (!t) return [p.rect];
  const w = widthOf.label(t.text);
  const x = t.anchor === 'start' ? t.x : t.anchor === 'end' ? t.x - w : t.x - w / 2;
  return [p.rect, { x, y: t.y - SIZE.label, w, h: SIZE.label + 3 }];
}

/** `points` with the end at `at` (`0` the start, else the end) moved to `x`, its last piece kept upright. */
function movedEnd(points: readonly Point[], at: 0 | 1, x: number): Point[] {
  const pts = at === 0 ? [...points] : [...points].reverse();
  const [end, next] = [pts[0] as Point, pts[1] as Point];
  if (end[0] === x) return [...points];
  if (pts.length >= 3 && next[0] === end[0]) {
    pts[0] = [x, end[1]];
    pts[1] = [x, next[1]];
  } else {
    const mid = (end[1] + next[1]) / 2;
    pts.splice(0, 1, [x, end[1]], [x, mid], [next[0], mid]);
  }
  return at === 0 ? pts : pts.reverse();
}

/** Whether changed routes pass no box but their own ends and meet no route of another pair of ends. */
function fits(changed: readonly Routed[], all: readonly Routed[], nodes: readonly PlacedNode[]): boolean {
  return changed.every((r) => {
    const own = (id: string) => id === r.flow.from || id === r.flow.to;
    const pieces = piecesOf(r.points);
    if (nodes.some((n) => !own(n.id) && boxes(n).some((b) => pieces.some(([a, c]) => through(a, c, b))))) return false;
    return all.every(
      (o) =>
        o.flow === r.flow ||
        own(o.flow.from) ||
        own(o.flow.to) ||
        piecesOf(o.points).every(([c, d]) => pieces.every(([a, b]) => !meets(a, b, c, d))),
    );
  });
}

/**
 * Expansion nodes slide along the outline of their region until the one line between them and a pin inside runs
 * straight (UML 2.5.1, 16.12.4): the layout keeps them in layers of their own and the pins come after it, so that
 * line bent at the pin. A node slides only within its region, clear of every other box and text, and only where the
 * lines it moves, the line outside taking up the bend where it must, pass no box and meet no other line.
 */
export function slideExpansions(
  pl: Placement,
  routes: readonly Routed[],
  regions: readonly RegionArt[],
): { placement: Placement; routes: Routed[] } {
  const nodes = new Map(pl.nodes);
  let all = [...routes];
  for (const [id, p] of pl.nodes) {
    const port = p.node.port;
    const region = regions.find((r) => r.id === port?.region);
    if (!port || !region) continue;
    const inward = port.side === 'in';
    const inner = all.filter((r) => (inward ? r.flow.from : r.flow.to) === id);
    const [line] = inner;
    if (inner.length !== 1 || !line) continue;
    const pin = (inward ? line.points.at(-1) : line.points[0]) as Point;
    const start = (inward ? line.points[0] : line.points.at(-1)) as Point;
    if (pin[0] === start[0]) continue;
    const r = p.rect;
    const dx = Math.min(0, pin[0] - (r.x + INSET)) + Math.max(0, pin[0] - (r.x + r.w - INSET));
    const rect = { ...r, x: r.x + dx };
    const moved: PlacedNode = { ...p, rect, art: activityArt(p.node, rect) };
    const others = [...nodes.values()].filter((n) => n.id !== id);
    const inside =
      rect.x >= region.rect.x + ACT.regionPad && rect.x + rect.w <= region.rect.x + region.rect.w - ACT.regionPad;
    const clear = boxes(moved).every((b) => others.every((n) => boxes(n).every((o) => !overlaps(b, o))));
    if (!inside || !clear) continue;
    const lineNow: Routed = { ...line, points: inward ? [[pin[0], start[1]], pin] : [pin, [pin[0], start[1]]] };
    const outer = all
      .filter((o) => (inward ? o.flow.to : o.flow.from) === id)
      .map((o): Routed => {
        const end = (inward ? o.points.at(-1) : o.points[0]) as Point;
        const x = Math.min(rect.x + rect.w - INSET, Math.max(rect.x + INSET, end[0]));
        return { ...o, points: movedEnd(o.points, inward ? 1 : 0, x) };
      });
    const changed = [lineNow, ...outer];
    const slips = outer.some((o) =>
      piecesOf(o.points).some(([a, b]) => a[1] === b[1] && a[0] !== b[0] && Math.abs(a[0] - b[0]) < JOG),
    );
    if (slips) continue;
    const next = all.map((o) => changed.find((c) => c.flow === o.flow) ?? o);
    if (!fits(changed, next, [...others, moved])) continue;
    nodes.set(id, { ...moved, art: { ...moved.art, side: expansionText(port, rect) } });
    all = next;
  }
  return { placement: { ...pl, nodes }, routes: all };
}

/** Do two boxes overlap, with the gap of a pin's name between them? */
function overlaps(a: Rect, b: Rect): boolean {
  const g = ACT.pinGap;
  return a.x < b.x + b.w + g && b.x < a.x + a.w + g && a.y < b.y + b.h + g && b.y < a.y + a.h + g;
}
