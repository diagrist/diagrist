import type { Point, Rect } from '@diagrist/core';
import type { Route, Side } from '@diagrist/layout-grid';
import { endBox } from '../ends.js';
import type { RouteContext } from './context.js';
import { clashes } from './steps.js';

/** Ends keep this far from the corners of a box, or stand in the middle of a smaller one. */
const INSET = 12;

const slanted = (points: readonly Point[]) =>
  points.slice(1).some((q, k) => {
    const p = points[k] ?? q;
    return p[0] !== q[0] && p[1] !== q[1];
  });

/** A straight line between the facing sides of two boxes that share a stretch across the way between them. */
function across(a: Rect, b: Rect): { points: Point[]; from: Side; to: Side } | undefined {
  const inset = (size: number) => Math.min(INSET, size / 2);
  const [x0, x1] = [
    Math.max(a.x + inset(a.w), b.x + inset(b.w)),
    Math.min(a.x + a.w - inset(a.w), b.x + b.w - inset(b.w)),
  ];
  const [y0, y1] = [
    Math.max(a.y + inset(a.h), b.y + inset(b.h)),
    Math.min(a.y + a.h - inset(a.h), b.y + b.h - inset(b.h)),
  ];
  if (x0 <= x1 && (a.y + a.h <= b.y || b.y + b.h <= a.y)) {
    const x = Math.round((x0 + x1) / 2);
    const down = a.y + a.h <= b.y;
    const points: Point[] = down
      ? [
          [x, a.y + a.h],
          [x, b.y],
        ]
      : [
          [x, a.y],
          [x, b.y + b.h],
        ];
    return { points, from: down ? 'bottom' : 'top', to: down ? 'top' : 'bottom' };
  }
  if (y0 <= y1 && (a.x + a.w <= b.x || b.x + b.w <= a.x)) {
    const y = Math.round((y0 + y1) / 2);
    const right = a.x + a.w <= b.x;
    const points: Point[] = right
      ? [
          [a.x + a.w, y],
          [b.x, y],
        ]
      : [
          [a.x, y],
          [b.x + b.w, y],
        ];
    return { points, from: right ? 'right' : 'left', to: right ? 'left' : 'right' };
  }
  return undefined;
}

/** An L from the side of `a` facing `b` along the flow, turning once into the side of `b`, if it passes beside `b`. */
function corner(a: Rect, b: Rect): { points: Point[]; from: Side; to: Side } | undefined {
  const down = b.y >= a.y + a.h / 2;
  const x = Math.round(a.x + a.w / 2);
  if (x >= b.x && x <= b.x + b.w) return undefined;
  const y = Math.round(b.y + b.h / 2);
  const start: Point = [x, down ? a.y + a.h : a.y];
  const right = b.x >= x;
  const end: Point = [right ? b.x : b.x + b.w, y];
  return { points: [start, [x, y], end], from: down ? 'bottom' : 'top', to: right ? 'left' : 'right' };
}

/**
 * Transitions the router found no way for, or drew with a slanted piece, drawn orthogonal: straight where the two
 * ends share a stretch, else with one corner, if that meets nothing in its way; else they stay as they were.
 */
export function unslant(routes: readonly Route[], c: RouteContext): Route[] {
  const out = [...routes];
  routes.forEach((r, i) => {
    const e = c.ends[i];
    if (!e || e.from === e.to || (!r.unroutable && !slanted(r.points))) return;
    const [a, b] = [endBox(e.from, c.grid)?.rect, endBox(e.to, c.grid)?.rect];
    if (!a || !b) return;
    for (const way of [across(a, b), corner(a, b)]) {
      if (way === undefined || clashes(way.points, i, out, c)) continue;
      const { unroutable: _, ...rest } = r;
      out[i] = {
        ...rest,
        points: way.points,
        shape: way.points.length === 2 ? 'straight' : 'orthogonal',
        fromSide: way.from,
        toSide: way.to,
      };
      return;
    }
  });
  return out;
}
