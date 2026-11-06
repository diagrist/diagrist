import type { Point, Rect } from '@diagrist/core';
import { longestSegment, pointAlong, polylineLength, type Route } from '@diagrist/layout-grid';
import type { LookOptions } from '../looks/look.js';
import type { ArchitectureModel, ArchNode } from '../model/types.js';
import type { Metrics } from './metrics.js';

/** A flow number on its edge, centred on (x, y). */
export interface Badge {
  readonly n: number;
  readonly route: number;
  readonly x: number;
  readonly y: number;
  readonly accent: boolean;
}

/** A decision mark at an edge (`route`) or at the corner of a node. */
export interface Mark {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly route?: number;
}

/** The size of a flow number by `numbers.form`: `(3)` on a rounded plate, or the digit in a disc. */
export const NUMBER_SIZE: Readonly<Record<LookOptions['numbers']['form'], { readonly w: number; readonly h: number }>> =
  { plate: { w: 24, h: 16 }, disc: { w: 15, h: 15 } };

/** How far the gap behind texts on a line reaches beyond them to the sides and up and down (`ground: gap`). */
export const TEXT_GAP = { x: 4, y: 2 } as const;

/** The size of a decision mark, which `markShapes` of `parts` draws centred on its spot. */
const MARK_SIZE = { w: 24, h: 14 } as const;

/** The rectangle a decision mark takes, for what keeps clear of it. */
/** The size of a decision mark. */
export const MARK = MARK_SIZE;

export const markRect = (k: Mark): Rect => ({
  x: k.x - MARK_SIZE.w / 2,
  y: k.y - MARK_SIZE.h / 2,
  ...MARK_SIZE,
});

const MARK_BACK = 24;
const MARK_ASIDE = 24;
/** How far apart the further spots of a decision mark on an edge lie along it. */
const MARK_STEP = 16;

/**
 * The spots a decision mark on an edge may take in a channel grid, best first: `MARK_BACK` before the end, right of
 * the direction of travel, then left, then each `MARK_STEP` further back, as long as the edge is long enough; then
 * the same again twice `MARK_STEP` further aside, above or below the texts of the edge.
 */
export function markSpots(points: readonly Point[]): { at: Point; on: Point }[] {
  const length = polylineLength(points);
  const out: { at: Point; on: Point }[] = [];
  for (const aside of [MARK_ASIDE, MARK_ASIDE + 2 * MARK_STEP])
    for (let back = MARK_BACK; back === MARK_BACK || back <= length - MARK_BACK; back += MARK_STEP) {
      const { p, dir } = pointAlong(points, Math.max(0, length - back));
      for (const side of [1, -1]) out.push({ at: [p[0] - dir[1] * aside * side, p[1] + dir[0] * aside * side], on: p });
    }
  return out;
}
const CORNER_DX = 20;
const CORNER_DY = 2;

/**
 * Flow numbers sit a little after the start of the longest segment, so never in a frame head; edge marks stand
 * near the end, right of the direction of travel; node marks at the top right corner.
 */
export function marksOf(
  model: ArchitectureModel,
  routes: readonly Route[],
  nodes: ReadonlyMap<string, Rect>,
  m: Metrics,
): { badges: Badge[]; marks: Mark[] } {
  const badges: Badge[] = [];
  const marks: Mark[] = [];
  routes.forEach((r, route) => {
    const edge = model.edges[Number(r.edge)];
    const { p1, p2, len } = longestSegment(r.points);
    if (edge?.step) {
      const { p } = pointAlong([p1, p2], Math.min(m.badgeOffset, len / 2));
      badges.push({ n: edge.step.n, route, x: p[0], y: p[1], accent: edge.step.accent });
    }
    if (edge?.mark) {
      const { p, dir } = pointAlong(r.points, Math.max(0, polylineLength(r.points) - MARK_BACK));
      marks.push({ id: edge.mark, x: p[0] - dir[1] * MARK_ASIDE, y: p[1] + dir[0] * MARK_ASIDE, route });
    }
  });
  for (const n of model.nodes) {
    const rect = nodes.get(n.id);
    if (n.mark && rect) marks.push({ id: n.mark, x: rect.x + rect.w + CORNER_DX, y: rect.y - CORNER_DY });
  }
  return { badges, marks };
}

/** Where a decision mark stands inside the top right corner of its node, left of a replica tag. */
const CORNER = { dx: 20, dy: 13, replicas: 30 } as const;

/**
 * Decision marks at nodes move into the top right corner of their box, where the width of the box keeps room for
 * them, so they never meet a line or a text outside; marks at edges stay.
 */
export function marksInside(
  marks: readonly Mark[],
  nodes: readonly ArchNode[],
  rects: ReadonlyMap<string, Rect>,
): Mark[] {
  return marks.map((mark) => {
    if (mark.route !== undefined) return mark;
    const node = nodes.find((n) => n.mark === mark.id && rects.has(n.id));
    const r = node && rects.get(node.id);
    if (!node || !r) return mark;
    const shift = node.replicas !== undefined || node.shape === 'job' ? CORNER.replicas : 0;
    return { ...mark, x: r.x + r.w - CORNER.dx - shift, y: r.y + CORNER.dy };
  });
}
