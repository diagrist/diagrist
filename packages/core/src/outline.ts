import type { Point, Rect } from './geometry.js';

/** A rectangle and the outline drawn in it, as far as the placement check is concerned. */
interface Shaped {
  readonly rect: Rect;
  readonly outline?: 'rectangle' | 'ellipse';
}

interface Ellipse {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/** Points taken around an ellipse; a multiple of four, so its extremes are among them. */
const STEPS = 32;

const ellipseIn = (r: Rect, inset = 0): Ellipse => ({
  cx: r.x + r.w / 2,
  cy: r.y + r.h / 2,
  rx: Math.max(0, r.w / 2 - inset),
  ry: Math.max(0, r.h / 2 - inset),
});

/** Is the point inside the ellipse grown by `grow`, its curve excluded? */
function inEllipse(p: Point, e: Ellipse, grow = 0): boolean {
  const [rx, ry] = [e.rx + grow, e.ry + grow];
  if (rx <= 0 || ry <= 0) return false;
  return ((p[0] - e.cx) / rx) ** 2 + ((p[1] - e.cy) / ry) ** 2 < 1;
}

const corners = (r: Rect): Point[] => [
  [r.x, r.y],
  [r.x + r.w, r.y],
  [r.x + r.w, r.y + r.h],
  [r.x, r.y + r.h],
];

/** `STEPS` points on the curve of an ellipse, evenly by angle. */
function rim(e: Ellipse): Point[] {
  return Array.from({ length: STEPS }, (_, i): Point => {
    const angle = (2 * Math.PI * i) / STEPS;
    return [e.cx + e.rx * Math.cos(angle), e.cy + e.ry * Math.sin(angle)];
  });
}

/**
 * Does the rectangle reach into the ellipse? The point of the rectangle nearest to the centre decides; stretching the
 * ellipse into a circle keeps the rectangle axis-aligned, so clamping finds it exactly.
 */
function rectMeetsEllipse(r: Rect, e: Ellipse): boolean {
  const near: Point = [Math.min(Math.max(e.cx, r.x), r.x + r.w), Math.min(Math.max(e.cy, r.y), r.y + r.h)];
  return inEllipse(near, e);
}

const boxesOverlap = (a: Rect, b: Rect, tolerance: number): boolean =>
  a.x < b.x + b.w - tolerance &&
  b.x < a.x + a.w - tolerance &&
  a.y < b.y + b.h - tolerance &&
  b.y < a.y + a.h - tolerance;

/**
 * Do the outlines overlap by more than `tolerance`? Rectangles overlap when they share more than `tolerance` in both
 * directions. An ellipse shrinks by `tolerance` first, and then counts exactly against a rectangle and point by point
 * against another ellipse, so a text in the empty corner of an ellipse's rectangle does not touch it.
 */
export function outlinesOverlap(a: Shaped, b: Shaped, tolerance: number): boolean {
  if (!boxesOverlap(a.rect, b.rect, tolerance)) return false;
  if (a.outline !== 'ellipse' && b.outline !== 'ellipse') return true;
  const [round, other] = a.outline === 'ellipse' ? [a, b] : [b, a];
  const e = ellipseIn(round.rect, tolerance);
  if (other.outline !== 'ellipse') return rectMeetsEllipse(other.rect, e);
  const f = ellipseIn(other.rect);
  return rim(e).some((p) => inEllipse(p, f)) || rim(f).some((p) => inEllipse(p, e));
}

/** Does `a` lie inside the outline of `box`, give or take `tolerance`? */
export function outlineHolds(box: Shaped, a: Shaped, tolerance: number): boolean {
  const r = box.rect;
  if (box.outline !== 'ellipse')
    return (
      a.rect.x >= r.x - tolerance &&
      a.rect.y >= r.y - tolerance &&
      a.rect.x + a.rect.w <= r.x + r.w + tolerance &&
      a.rect.y + a.rect.h <= r.y + r.h + tolerance
    );
  const points = a.outline === 'ellipse' ? rim(ellipseIn(a.rect)) : corners(a.rect);
  const e = ellipseIn(r);
  return points.every((p) => inEllipse(p, e, tolerance));
}
