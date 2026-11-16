import type { Point, Rect } from '@diagrist/core';

/** How far the ports of one side keep from its corners. */
const INSET = 18;
/** How far a port moves from where its line would meet the side towards an even spread, in shares of the way. */
const SPREAD = 0.75;
/** How far a way starts inside the hub, so cutting it at the outline finds the port. */
const INSIDE = 40;
/** The flattest a line may meet its side when the pair beside it is spread along the side. */
const FLAT = 0.35;

/** A port: where a line meets the hub's box, and the outward normal of that side. */
export interface Port {
  readonly at: Point;
  readonly normal: Point;
}

const NORMALS: Readonly<Record<'top' | 'right' | 'bottom' | 'left', Point>> = {
  top: [0, -1],
  right: [1, 0],
  bottom: [0, 1],
  left: [-1, 0],
};

type Side = 'top' | 'right' | 'bottom' | 'left';

/** Where a line from the middle of `r` towards `p` leaves it: the side and how far along it, from its start. */
function exit(r: Rect, p: Point): { side: Side; at: number } {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const dx = p[0] - cx;
  const dy = p[1] - cy;
  if (Math.abs(dx) * r.h >= Math.abs(dy) * r.w) {
    const y = cy + (dy * (r.w / 2)) / (Math.abs(dx) || 1);
    return { side: dx >= 0 ? 'right' : 'left', at: y - r.y };
  }
  const x = cx + (dx * (r.h / 2)) / (Math.abs(dy) || 1);
  return { side: dy >= 0 ? 'bottom' : 'top', at: x - r.x };
}

/** The point at `at` along a side of `r`. */
const pointOn = (r: Rect, side: Side, at: number): Point =>
  side === 'top'
    ? [r.x + at, r.y]
    : side === 'bottom'
      ? [r.x + at, r.y + r.h]
      : side === 'left'
        ? [r.x, r.y + at]
        : [r.x + r.w, r.y + at];

/**
 * The ports of the lines at the hub's box: each where its line from the middle would leave the box, then moved
 * towards an even spread over that side in the same order, so lines on one side meet it at even distances rather
 * than crowding round the middle. `towards` holds the far end of each way by key and how many lines run on it, as a
 * pair takes the room of two.
 */
export function hubPorts(box: Rect, towards: ReadonlyMap<string, { far: Point; lines: number }>): Map<string, Port> {
  const bySide = new Map<Side, { key: string; at: number; lines: number }[]>();
  for (const [key, { far, lines }] of towards) {
    const { side, at } = exit(box, far);
    bySide.set(side, [...(bySide.get(side) ?? []), { key, at, lines }]);
  }
  const out = new Map<string, Port>();
  for (const [side, list] of bySide) {
    const length = side === 'top' || side === 'bottom' ? box.w : box.h;
    const inset = Math.min(INSET, length / 4);
    const sorted = [...list].sort((a, b) => a.at - b.at);
    const total = sorted.reduce((sum, s) => sum + s.lines, 0);
    let before = 0;
    sorted.forEach((s) => {
      const even = inset + ((length - 2 * inset) * (before + s.lines / 2)) / total;
      before += s.lines;
      const at = s.at + (even - s.at) * SPREAD;
      out.set(s.key, { at: pointOn(box, side, Math.min(length - inset, Math.max(inset, at))), normal: NORMALS[side] });
    });
  }
  return out;
}

const behind = (start: Point, u: Point): Point => [start[0] - u[0] * INSIDE, start[1] - u[1] * INSIDE];

/**
 * The way of a line between the hub and a far middle, moved `by` to the left of its way from source to target as a
 * pair needs: from the port, or from the hub's middle without one, to the far end, the moved line meeting the port's
 * side beside the port, so both lines of a pair run parallel. `hubFirst` when the way starts at the hub.
 */
export function spokeWay(port: Port | undefined, middle: Point, far: Point, by: number, hubFirst: boolean): Point[] {
  const from = port?.at ?? middle;
  const len = Math.hypot(far[0] - from[0], far[1] - from[1]) || 1;
  const u: Point = [(far[0] - from[0]) / len, (far[1] - from[1]) / len];
  const dir = hubFirst ? u : ([-u[0], -u[1]] as Point);
  const n: Point = [dir[1] * by, -dir[0] * by];
  const end: Point = [far[0] + n[0], far[1] + n[1]];
  let start: Point = [from[0] + n[0], from[1] + n[1]];
  if (port) {
    const facing = Math.max(FLAT, u[0] * port.normal[0] + u[1] * port.normal[1]);
    const t = -(n[0] * port.normal[0] + n[1] * port.normal[1]) / facing;
    start = [start[0] + u[0] * t, start[1] + u[1] * t];
  }
  const inner = port ? behind(start, u) : start;
  return hubFirst ? [inner, end] : [end, inner];
}
