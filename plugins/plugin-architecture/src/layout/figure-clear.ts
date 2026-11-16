import type { Point, Rect } from '@diagrist/core';
import type { Route } from '@diagrist/layout-grid';
import type { Look } from '../looks/look.js';
import type { ArchitectureModel } from '../model/types.js';
import { FIGURE_RISE } from './art.js';
import { isFigure } from './measure.js';

/** Room between the head of a stick figure and the tip of a line coming down onto it. */
const HEAD_CLEAR = 2;

/** The end `p` of a line arriving from `before`, moved up clear of the head when it comes straight down onto it. */
function clear(p: Point, before: Point | undefined, rect: Rect): Point {
  const down = before !== undefined && before[0] === p[0] && before[1] < p[1];
  const onTop = p[1] >= rect.y - FIGURE_RISE && p[1] <= rect.y + 1 && p[0] >= rect.x && p[0] <= rect.x + rect.w;
  return down && onTop ? [p[0], rect.y - FIGURE_RISE - HEAD_CLEAR] : p;
}

/**
 * The routes with every end that comes straight down onto a stick figure stopped above its head, which reaches a
 * little above the figure's box, so no arrow tip lands on the head. Only a star of ranks (`layout=ranks`) asks for it
 * so far; other layouts keep their lines as they are.
 */
export function clearOfHeads(
  routes: readonly Route[],
  model: ArchitectureModel,
  rects: ReadonlyMap<string, Rect>,
  look: Look,
): Route[] {
  const figures = new Set(model.nodes.filter((n) => isFigure(n, look)).map((n) => n.id));
  return routes.map((r) => {
    const e = model.edges.find((x) => String(x.index) === r.edge);
    const [to, from] = [e?.to, e?.from].map((id) => (id && figures.has(id) ? rects.get(id) : undefined));
    if (!to && !from) return r;
    const pts = [...r.points];
    const last = pts.length - 1;
    if (to && pts[last]) pts[last] = clear(pts[last] as Point, pts[last - 1], to);
    if (from && pts[0]) pts[0] = clear(pts[0], pts[1], from);
    return { ...r, points: pts };
  });
}
