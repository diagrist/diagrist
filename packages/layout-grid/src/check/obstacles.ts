import type { Point, Rect } from '@diagrist/core';
import { segmentMeetsEllipse, segmentMeetsRect } from '../label/segment.js';
import { bundled, middle, rounded, type Segment, segmentsOf, TOLERANCE } from './lines.js';
import type { LineFinding, LineInput, LineThresholds } from './types.js';

/** Something a line must keep clear of, with the ids it belongs to: its own and its owner's. */
export interface Obstacle {
  readonly key: string;
  readonly rect: Rect;
  readonly ellipse: boolean;
  /** Ids whose lines may touch it: the box itself and what it is part of. */
  readonly owners: readonly string[];
  /** Edge of a text on a line. */
  readonly edge?: string;
}

/** Boxes, texts, texts on lines and heads of frames, as obstacles. */
export function obstaclesOf(input: LineInput): Obstacle[] {
  const owned = (id: string, owner: string | undefined) => (owner === undefined ? [id] : [id, owner]);
  return [
    ...input.nodes.map((n) => ({
      key: n.id,
      rect: n.rect,
      ellipse: n.outline === 'ellipse',
      owners: owned(n.id, n.owner),
    })),
    ...(input.texts ?? []).map((t) => ({ key: t.key, rect: t.rect, ellipse: false, owners: owned(t.key, t.owner) })),
    ...(input.labels ?? []).map((l) => ({ key: l.key, rect: l.box, ellipse: false, owners: [l.key], edge: l.edge })),
    ...(input.frames ?? []).flatMap((f) =>
      f.head === undefined ? [] : [{ key: f.id, rect: f.head, ellipse: false, owners: [f.id] }],
    ),
  ];
}

const meets = (s: Segment, o: Obstacle, pad: number): boolean => {
  if (!o.ellipse) return segmentMeetsRect(s.a, s.b, o.rect, pad);
  const centre = [o.rect.x + o.rect.w / 2, o.rect.y + o.rect.h / 2] as const;
  return segmentMeetsEllipse(s.a, s.b, centre, o.rect.w / 2, o.rect.h / 2, pad);
};

/** Whether a point lies in or on a rectangle. */
const holds = (r: Rect, p: Point): boolean =>
  p[0] >= r.x - TOLERANCE && p[0] <= r.x + r.w + TOLERANCE && p[1] >= r.y - TOLERANCE && p[1] <= r.y + r.h + TOLERANCE;

/**
 * Lines through boxes, texts and heads of frames that are not their own, with `clearance` around them (Q2). A line
 * may touch its own ends and what belongs to them or holds one of its end points, its own texts and those of its
 * bundle; it may not run through the inside of an own end past its first or last segment (`own`).
 */
export function throughFindings(input: LineInput, obstacles: readonly Obstacle[], t: LineThresholds): LineFinding[] {
  const byEdge = new Map(input.routes.map((r) => [r.edge, r]));
  return input.routes.flatMap((r) => {
    const segments = segmentsOf(r);
    const ends = [r.from, r.to, r.edge];
    const points = [r.points[0], r.points.at(-1)].filter((p) => p !== undefined);
    const last = segments.at(-1);
    return obstacles.flatMap((o): LineFinding[] => {
      const route = o.edge === undefined ? undefined : byEdge.get(o.edge);
      if (route !== undefined && bundled(r, route)) return [];
      const end = o.key === r.from || o.key === r.to;
      const own = end || o.owners.some((id) => ends.includes(id)) || points.some((p) => holds(o.rect, p));
      const inner = segments.filter((s) => !(o.key === r.from && s.index === 0) && !(o.key === r.to && s === last));
      const hit = own
        ? inner.find((s) => end && meets(s, o, -TOLERANCE))
        : segments.find((s) => meets(s, o, t.clearance));
      if (hit === undefined) return [];
      const found: LineFinding = { rule: 'through', edges: [r.edge], at: rounded(middle(hit)), other: o.key };
      return [own ? { ...found, detail: 'own' } : found];
    });
  });
}
