import type { Point } from '../geometry.js';
import type { Shape } from '../scene.js';
import type { Styles } from '../styles.js';
import { strokeOfRole } from './heads.js';
import { polylineOf } from './polyline.js';

/** A drawn outline a line may end on: how far a point is from it, and half the width of its stroke. */
export interface Outline {
  readonly shape: Shape;
  readonly half: number;
  readonly distance: (p: Point) => number;
}

/** A rectangle with corners rounded by `r`. */
function roundedRect(x: number, y: number, w: number, h: number, r: number): Outline['distance'] {
  const [cx, cy] = [x + w / 2, y + h / 2];
  return ([px, py]) => {
    const dx = Math.abs(px - cx) - (w / 2 - r);
    const dy = Math.abs(py - cy) - (h / 2 - r);
    return Math.abs(Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r);
  };
}

/** An ellipse round `c` with radii `rx` and `ry`, its distance taken to first order, which is close near the curve. */
function ellipse(c: Point, rx: number, ry: number): Outline['distance'] {
  return ([px, py]) => {
    const [dx, dy] = [px - c[0], py - c[1]];
    const f = (dx / rx) ** 2 + (dy / ry) ** 2;
    return Math.abs(f - 1) / (Math.hypot((2 * dx) / rx ** 2, (2 * dy) / ry ** 2) || 1);
  };
}

/** A closed polygon. */
function polygon(points: readonly Point[]): Outline['distance'] {
  const sides = points.map((a, i) => [a, points[(i + 1) % points.length] as Point] as const);
  return (p) =>
    Math.min(
      ...sides.map(([a, b]) => {
        const [ux, uy] = [b[0] - a[0], b[1] - a[1]];
        const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ux + (p[1] - a[1]) * uy) / (ux * ux + uy * uy || 1)));
        return Math.hypot(p[0] - a[0] - t * ux, p[1] - a[1] - t * uy);
      }),
    );
}

/** A whole ellipse drawn as two arcs, `M x1 y A rx ry 0 1 0 x2 y A ... Z`, as the ellipses of the scenes are. */
const ELLIPSE =
  /^M\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*A\s*([\d.]+)[ ,]+([\d.]+)[ ,]+0[ ,]+[01][ ,]+[01][ ,]+(-?[\d.]+)[ ,]+(-?[\d.]+)\s*A[^MLHVZ]*Z$/;

/** The outline a closed shape draws, if it is one a line can end on. */
function outlineOf(shape: Shape): Outline['distance'] | undefined {
  switch (shape.kind) {
    case 'rect':
      return roundedRect(shape.x, shape.y, shape.w, shape.h, Math.min(shape.rx ?? 0, shape.w / 2, shape.h / 2));
    case 'circle':
      return ellipse([shape.cx, shape.cy], shape.r, shape.r);
    case 'path': {
      const [ox, oy] = shape.offset ?? [0, 0];
      const moved =
        (at: Outline['distance']): Outline['distance'] =>
        (p) =>
          at([p[0] - ox, p[1] - oy]);
      const arcs = ELLIPSE.exec(shape.d.trim());
      if (arcs !== null) {
        const [x1, y1, rx, ry, x2, y2] = arcs.slice(1).map(Number) as [number, number, number, number, number, number];
        return moved(ellipse([(x1 + x2) / 2, (y1 + y2) / 2], rx, ry));
      }
      const line = polylineOf(shape.d);
      return line?.closed === true && line.pieces.length === 1 ? moved(polygon(line.pieces[0] as Point[])) : undefined;
    }
    default:
      return undefined;
  }
}

/** Every stroked outline of the scene, inside groups too. */
export function outlinesOf(shapes: readonly Shape[], styles: Styles): Outline[] {
  return shapes.flatMap((shape): Outline[] => {
    if (shape.kind === 'group') return outlinesOf(shape.children, styles);
    const distance = outlineOf(shape);
    const half = distance === undefined ? 0 : strokeOfRole(shape.role, styles) / 2;
    return distance === undefined || half === 0 ? [] : [{ shape, half, distance }];
  });
}

/** How close an end must come to an outline to count as ending on it. */
const ON = 0.25;

/** The step in pixels the search for the outer edge goes back by. */
const STEP = 0.02;

/** How many times half its stroke an end goes back at most, for a line that grazes an outline. */
const FARTHEST = 3;

/**
 * How far an end arriving in `way` must step back so it touches the outer edge of the stroke it ends on rather
 * than its middle: until it is half that stroke away from the outline, which is longer the more slanted the line
 * meets it, and right at a corner too. The widest stroke wins.
 */
export function insetAt(end: Point, way: Point, outlines: readonly Outline[], self: Shape): number {
  let inset = 0;
  for (const o of outlines) {
    if (o.shape === self || o.distance(end) > ON) continue;
    let back = 0;
    const at = (t: number): Point => [end[0] - way[0] * t, end[1] - way[1] * t];
    while (back < o.half * FARTHEST && o.distance(at(back)) < o.half) back += STEP;
    inset = Math.max(inset, back);
  }
  return inset;
}
