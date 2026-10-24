import { type Point, type Rect, textWidth } from '@diagrist/core';
import type { PlacedNode, Route } from '@diagrist/layout-grid';
import type { Metrics } from '../../layout/metrics.js';
import type { ArchNode } from '../../model/types.js';

/** The tab: inset of the gap from the corner, room beside the name, and the room a line keeps from the gap. */
const TAB = { inset: 14, pad: 6, keep: 10 } as const;

/** The name a box writes into its top edge: its label, with the number of replicas. */
export const tabName = (n: ArchNode): string => (n.replicas !== undefined ? `${n.label} ×${n.replicas}` : n.label);

/**
 * Whether a box writes its name into its top edge: not when it has no name, and not when it has neither icon nor
 * second line, since then the name stands in the middle.
 */
export const hasTab = (n: ArchNode): boolean =>
  n.keyword !== 'person' && n.label !== '' && (n.tech !== undefined || n.icon !== undefined || n.shape !== undefined);

/** Where the name of a box stands in its top edge: the gap cut into the line and the start of the text. */
export function tabOf(n: ArchNode, rect: Rect, m: Metrics): { readonly gap: Rect; readonly x: number } {
  const w = textWidth(tabName(n), m.fonts.name);
  const left = rect.x + TAB.inset;
  return { gap: { x: left, y: rect.y, w: w + 2 * TAB.pad, h: 0 }, x: left + TAB.pad };
}

const near = (p: Point | undefined, y: number): p is Point => p !== undefined && Math.abs(p[1] - y) < 2;

/** Does a line still end under the gap after `clearTabs`, because the box had no room right of its name? */
export const tabBlocked = (gap: Rect, routes: readonly Route[]): boolean =>
  routes.some((r) =>
    [r.points[0], r.points.at(-1)].some(
      (p) => near(p, gap.y) && p[0] >= gap.x - TAB.keep / 2 && p[0] <= gap.x + gap.w + TAB.keep / 2,
    ),
  );

/**
 * Routes whose end meets the top edge of a box under its name move right of the name. Lines move by lanes: every
 * vertical end at the same x moves to the same new x, the right end of the widest name in that lane, so a column of
 * boxes keeps one straight spine. The segment at the end moves with its neighbour point, so the line stays
 * orthogonal; a straight line moves only while it stays on both boxes.
 */
export function clearTabs(
  routes: readonly Route[],
  placed: readonly PlacedNode[],
  nodes: readonly ArchNode[],
  m: Metrics,
): Route[] {
  const boxes = placed.flatMap((p) => {
    const n = nodes.find((x) => x.id === p.id);
    return n && hasTab(n) ? [{ rect: p.rect, gap: tabOf(n, p.rect, m).gap }] : [];
  });
  const under = (p: Point | undefined) =>
    boxes.find(
      (b) => near(p, b.rect.y) && p !== undefined && p[0] >= b.gap.x - TAB.keep && p[0] <= b.gap.x + b.gap.w + TAB.keep,
    );
  const lanes = new Map<number, number>();
  for (const r of routes)
    for (const p of [r.points[0], r.points.at(-1)]) {
      const box = under(p);
      if (box && p) lanes.set(p[0], Math.max(lanes.get(p[0]) ?? 0, box.gap.x + box.gap.w + TAB.keep));
    }
  const onEdge = (p: Point | undefined, x: number) =>
    placed.some(
      ({ rect: o }) => (near(p, o.y) || near(p, o.y + o.h)) && x >= o.x + TAB.inset && x <= o.x + o.w - TAB.inset,
    );
  return routes.map((r) => {
    let points = [...r.points];
    for (const end of [0, points.length - 1]) {
      const p = points[end];
      const x = p && lanes.get(p[0]);
      if (!p || x === undefined || !onEdge(p, x)) continue;
      const next = end === 0 ? 1 : points.length - 2;
      if (points.length === 2 && !onEdge(points[next], x)) continue;
      points = points.map((q, i): Point => (i === end || (i === next && q[0] === p[0]) ? [x, q[1]] : q));
    }
    return { ...r, points };
  });
}
