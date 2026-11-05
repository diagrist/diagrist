import { type Placed, type Point, type Rect, segmentMeetsRect } from '@diagrist/core';
import { type GridLayout, overlaps, type Route } from '@diagrist/layout-grid';
import { type Mark, markRect } from './marks.js';

/** Room a node mark keeps from lines, boxes and the lines of frames. */
const PAD = 4;
/** How far a mark stands out from the corner of its node. */
const OUT = 20;
const UP = 2;

const holds = (outer: Rect, r: Rect): boolean =>
  r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h;

/** The centres a mark at a node may take, best first: beside its top right corner, above it, then the other corners. */
const spotsOf = (r: Rect): Point[] => [
  [r.x + r.w + OUT, r.y - UP],
  [r.x + r.w - OUT, r.y - OUT + UP],
  [r.x + r.w + OUT, r.y + r.h + UP],
  [r.x - OUT, r.y - UP],
  [r.x + OUT, r.y - OUT + UP],
  [r.x - OUT, r.y + r.h + UP],
];

/**
 * Decision marks at nodes of a channel grid take the first spot around their node that meets no box, no line, no
 * frame line and no head, so a mark beside a node at the edge of a frame does not sit on the frame; a mark without
 * such a spot stays beside the top right corner. Marks at edges and marks of other nodes stay as they are.
 */
export function placeNodeMarks(
  marks: readonly Mark[],
  owners: ReadonlyMap<string, string>,
  grid: GridLayout,
  routes: readonly Route[],
  heads: readonly Rect[],
): Mark[] {
  const nodes = new Map(grid.nodes.map((n) => [n.id, n.rect]));
  const taken: Rect[] = [];
  return marks.map((mark) => {
    const owner = owners.get(mark.id);
    const rect = owner === undefined ? undefined : nodes.get(owner);
    if (mark.route !== undefined || !rect) return mark;
    const clear = (at: Point) => {
      const r = markRect({ ...mark, x: at[0], y: at[1] });
      const frame = (g: Rect) => overlaps(r, g, PAD) && !holds(g, r);
      return (
        !grid.nodes.some((n) => overlaps(r, n.rect, PAD)) &&
        !grid.groups.some((g) => frame(g.rect)) &&
        !heads.some((h) => overlaps(r, h, PAD)) &&
        !taken.some((t) => overlaps(r, t, PAD)) &&
        !routes.some((route) =>
          route.points.slice(1).some((q, i) => segmentMeetsRect(route.points[i] as Point, q, r, PAD)),
        )
      );
    };
    const at = spotsOf(rect).find(clear);
    const placed = at ? { ...mark, x: at[0], y: at[1] } : mark;
    taken.push(markRect(placed));
    return placed;
  });
}

/**
 * Decision marks at nodes for the kernel's placement check, as texts keyed `<node>.mark` inside the smallest frame
 * that holds them; marks inside a box (`marks: inside`) are part of the box and left out.
 */
export function nodeMarkTexts(marks: readonly Mark[], owners: ReadonlyMap<string, string>, grid: GridLayout): Placed[] {
  return marks.flatMap((mark): Placed[] => {
    const owner = owners.get(mark.id);
    const rect = markRect(mark);
    if (mark.route !== undefined || owner === undefined) return [];
    if (grid.nodes.some((n) => n.id === owner && holds(n.rect, rect))) return [];
    const frame = grid.groups
      .filter((g) => holds(g.rect, rect))
      .sort((a, b) => a.rect.w * a.rect.h - b.rect.w * b.rect.h)[0];
    return [{ key: `${owner}.mark`, kind: 'text', rect, ...(frame ? { within: frame.id } : {}) }];
  });
}
