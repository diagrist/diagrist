import type { Point, Rect } from '@diagrist/core';
import type { Look } from '../../looks/look.js';
import type { Head } from '../frame-cell.js';
import type { StarRoom } from '../spacing.js';
import { alongWidth, evenGaps } from './arc.js';
import { grown, hull } from './geometry.js';
import type { Unit } from './order.js';
import { partsAt, type Shape } from './shapes.js';

/** The room between the members of a frame. */
const MEMBER_GAP = 32;

/** How the units stand round the hub: the angle of the first, the way round, width to height, and the size. */
export interface Ring {
  readonly theta: number;
  readonly turn: 1 | -1;
  readonly aspect: number;
  readonly scale: number;
  /** How far each unit stands from the hub, in shares of the ring; 1 where missing. */
  readonly reach?: readonly number[];
}

/** A node in the picture: its shape with the top left corner of its rectangle. */
export interface Spot {
  readonly shape: Shape;
  readonly x: number;
  readonly y: number;
  /** The index of its unit on the ring; the hub has none. */
  readonly unit?: number;
}

/** A frame round the members of a unit, and the rectangle its head takes. */
export interface StarFrame {
  readonly id: string;
  readonly rect: Rect;
  readonly members: readonly string[];
  readonly head?: Rect;
}

/** Where the hub, the neighbours and the frames stand, the hub's middle at the origin. */
export interface Placement {
  readonly spots: ReadonlyMap<string, Spot>;
  readonly frames: readonly StarFrame[];
  /** The angle each unit stands at. */
  readonly angles: readonly number[];
}

/** A unit of the ring with the shapes of its members in its order. */
export interface UnitShapes {
  readonly unit: Unit;
  readonly shapes: readonly Shape[];
}

/** The rectangles a spot covers. */
export const coverOf = (s: Spot): Rect[] => partsAt(s.shape, s.x, s.y);

/** The middle of a spot's rectangle, where its lines aim. */
export const middleOf = (s: Spot): Point => [s.x + s.shape.w / 2, s.y + s.shape.h / 2];

/**
 * The members of a unit side by side, in a row at the top and bottom of the ring and in a column on its sides, in
 * the order the ring runs there, their middles on one line.
 */
function membersOf(u: UnitShapes, angle: number, turn: 1 | -1, gap: number): { shape: Shape; x: number; y: number }[] {
  const row = Math.abs(Math.sin(angle)) >= 0.7;
  const tangent = row ? -Math.sin(angle) * turn : Math.cos(angle) * turn;
  const shapes = tangent >= 0 ? u.shapes : [...u.shapes].reverse();
  let cursor = 0;
  return shapes.map((shape) => {
    const at = row ? { x: 0, y: -shape.h / 2 } : { x: -shape.w / 2, y: 0 };
    const foot = hull(partsAt(shape, at.x, at.y));
    const spot = row ? { shape, x: cursor - foot.x, y: at.y } : { shape, x: at.x, y: cursor - foot.y };
    cursor += (row ? foot.w : foot.h) + gap;
    return spot;
  });
}

/** The units on an ellipse round the hub, each with the middle of all it covers on the ellipse. */
export function placeRing(
  hub: Shape,
  units: readonly UnitShapes[],
  ring: Ring,
  look: Look,
  heads: ReadonlyMap<string, Head>,
  room: StarRoom,
): Placement {
  const m = look.metrics;
  const gap = MEMBER_GAP * room.factor;
  const a = ring.scale * ring.aspect;
  const footOf = (i: number, angle: number) =>
    hull(membersOf(units[i] as UnitShapes, angle, ring.turn, gap).flatMap((s) => partsAt(s.shape, s.x, s.y)));
  const spots = new Map<string, Spot>([[hub.node.id, { shape: hub, x: -hub.w / 2, y: -hub.h / 2 }]]);
  const frames: StarFrame[] = [];
  const angles = evenGaps(units.length, ring.theta, ring.turn, a, ring.scale, (i, angle) => {
    const f = footOf(i, angle);
    return alongWidth(f.w, f.h, a, ring.scale, angle);
  });
  units.forEach((u, i) => {
    const angle = angles[i] as number;
    const members = membersOf(u, angle, ring.turn, gap);
    const foot = hull(members.flatMap((s) => partsAt(s.shape, s.x, s.y)));
    const reach = ring.reach?.[i] ?? 1;
    const dx = reach * a * Math.cos(angle) - (foot.x + foot.w / 2);
    const dy = reach * ring.scale * Math.sin(angle) - (foot.y + foot.h / 2);
    for (const s of members) spots.set(s.shape.node.id, { shape: s.shape, x: s.x + dx, y: s.y + dy, unit: i });
    if (u.unit.group === undefined) return;
    const around = { x: foot.x + dx, y: foot.y + dy, w: foot.w, h: foot.h };
    const rect = {
      x: around.x - m.groupPadX,
      y: around.y - m.groupPadTop,
      w: around.w + 2 * m.groupPadX,
      h: around.h + m.groupPadTop + m.groupPadBottom,
    };
    const head = heads.get(u.unit.group);
    frames.push({
      id: u.unit.group,
      rect,
      members: u.unit.ids,
      ...(head
        ? {
            head: grown(
              {
                x: head.x + rect.x + (head.origin === 'middle' ? rect.w / 2 : 0),
                y: head.y + rect.y,
                w: head.w,
                h: head.h,
              },
              2,
            ),
          }
        : {}),
    });
  });
  return { spots, frames, angles };
}
