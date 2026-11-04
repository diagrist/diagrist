import type { Point, Rect } from '@diagrist/core';
import type { Piece } from './channels.js';
import type { Group, Link } from './links.js';
import type { Ports } from './ports.js';

/** Where the layers and the gaps between them stand once their heights are known. */
export interface Frame {
  /** Box of every node and placeholder; a placeholder is as high as its layer and has no width. */
  readonly rects: ReadonlyMap<string, Rect>;
  /** Top of every gap below a layer, and the height of the room above its first track. */
  readonly gapTop: readonly number[];
  readonly first: readonly number[];
  readonly track: number;
}

/** Points without repeats and without points in the middle of a straight run. */
export function simplify(points: readonly Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out.at(-1);
    if (last && last[0] === p[0] && last[1] === p[1]) continue;
    const before = out.at(-2);
    if (before && last && ((before[0] === last[0] && last[0] === p[0]) || (before[1] === last[1] && last[1] === p[1])))
      out.pop();
    out.push(p);
  }
  return out;
}

/**
 * The points of one piece from its upper end to its lower end: down out of the upper box, along its track when its
 * ends are not on one vertical, down into the lower box.
 */
export function linkPoints(l: Link, group: Group, piece: Piece | undefined, ports: Ports, frame: Frame): Point[] {
  const a = frame.rects.get(l.upper);
  const b = frame.rects.get(l.lower);
  if (!a || !b) return [];
  const x1 = ports.bottom.get(l) ?? a.x;
  const x2 = ports.top.get(l) ?? b.x;
  const y1 = a.y + a.h;
  const y2 = b.y;
  if (piece === undefined || group.links.length === 0)
    return [
      [x1, y1],
      [x2, y2],
    ];
  const ty = (frame.gapTop[l.gap] ?? y1) + (frame.first[l.gap] ?? 0) + piece.track * frame.track;
  return [
    [x1, y1],
    [x1, ty],
    [x2, ty],
    [x2, y2],
  ];
}
