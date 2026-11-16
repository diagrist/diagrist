import type { Point } from '../geometry.js';
import { classesOf, type Marker, type Styles } from '../styles.js';

/** The x of the tip of a marker outline, at (11, 6) in the 12-unit grid (`MarkerShape`). */
const TIP_X = 11;

/** How far a line runs into a closed head past its back, in pixels, so no seam shows between them. */
const OVERLAP = 0.5;

/** The miter limit SVG strokes with unless told otherwise; a sharper corner is cut off flat. */
const MITER_LIMIT = 4;

/**
 * The width a stroke of these classes is drawn with, from the rules in stylesheet order as the cascade reads them:
 * 0 when no rule sets a stroke or the last one sets `none`, 1 when none sets a width.
 */
export function strokeOfClasses(classes: ReadonlySet<string>, styles: Styles): number {
  let stroke = false;
  let width = 1;
  for (const r of styles.rules) {
    if (!classes.has(r.name)) continue;
    const paint = /(?:^|;)\s*stroke:\s*([^;]+)/.exec(r.declarations)?.[1];
    if (paint !== undefined) stroke = paint.trim() !== 'none';
    const size = /stroke-width:\s*([\d.]+)/.exec(r.declarations)?.[1];
    if (size !== undefined) width = Number(size);
  }
  return stroke ? width : 0;
}

/** The stroke width of a role's classes, see `strokeOfClasses`. */
export const strokeOfRole = (role: string, styles: Styles): number =>
  strokeOfClasses(new Set(classesOf(role, styles)), styles);

/** Pixels per grid unit of a marker drawn at `size`. */
export const unitOf = (m: Marker, size: number): number => (size * (m.scale ?? 1)) / 12;

/**
 * Where the line ends inside the marker, in grid units: at the tip for an open head, whose strokes the line runs
 * between, and just past the back for a closed one, which covers it, so its narrow tip shows no line.
 */
export function lineEndOf(m: Marker, size: number): number {
  if (m.shape.closed !== true) return TIP_X;
  const back = Math.min(...m.shape.points.map(([x]) => x));
  return Math.min(TIP_X, back + OVERLAP / unitOf(m, size));
}

/** Half the angle at the tip of the outline, between its two sides; `undefined` when the tip ends an open outline. */
function halfAngleAtTip(m: Marker): number | undefined {
  const points = m.shape.points;
  const i = points.findIndex(([x, y]) => Math.abs(x - TIP_X) < 1e-9 && Math.abs(y - 6) < 1e-9);
  const n = points.length;
  const closed = m.shape.closed === true;
  const before = i > 0 ? points[i - 1] : closed ? points[n - 1] : undefined;
  const after = i >= 0 && i < n - 1 ? points[i + 1] : closed ? points[0] : undefined;
  if (i < 0 || before === undefined || after === undefined) return undefined;
  const side = (p: Point) => Math.atan2(p[1] - 6, p[0] - TIP_X);
  const between = Math.abs(side(before) - side(after));
  return Math.min(between, 2 * Math.PI - between) / 2;
}

/**
 * How far the head reaches past the end of its line, in pixels: from there to the tip of the outline, and on to
 * where its stroke ends, which a miter join draws out to a point.
 */
export function reachOf(m: Marker, size: number, styles: Styles): number {
  const stroke = strokeOfClasses(new Set([m.name]), styles);
  const half = halfAngleAtTip(m);
  const miter = half !== undefined && 1 / Math.sin(half) <= MITER_LIMIT ? 1 / Math.sin(half) : 1;
  return (TIP_X - lineEndOf(m, size)) * unitOf(m, size) + (stroke / 2) * miter;
}
