import { type Diagnostic, diagnostic, type Severity, type Span } from '@diagrist/lang';
import type { Rect } from './geometry.js';
import { KERNEL_CODES } from './messages.js';
import { outlineHolds, outlinesOverlap } from './outline.js';

/**
 * Something the layout has filled, as the kernel checks it (ADR 0010, 0020): a node, a frame, a lane or the extent of a
 * text, with its rectangle and the outline in it. The layout reports what it placed; how it got there is its own
 * business.
 */
export interface Placed {
  /** Unique within the drawing, such as `api` or `api.label`; diagnostics name it. */
  readonly key: string;
  /**
   * What it is to the check. A `box` or `text` overlapping something it does not belong to is a warning (G400). A
   * `frame` claims what lies in it, such as an interruptible region: a box or frame reaching into it without belonging
   * into it is an error (G403), since the picture then says it is part of the frame. An `area` is background, such as
   * a lane: things lie in it and cross it freely, so it meets only other areas.
   */
  readonly kind: 'box' | 'text' | 'frame' | 'area';
  readonly rect: Rect;
  /**
   * The shape drawn in `rect`: the rectangle itself, which is the default, or the ellipse inscribed in it, such as a
   * use case. A text in the empty corner of an ellipse's rectangle does not touch the ellipse.
   */
  readonly outline?: 'rectangle' | 'ellipse';
  /**
   * Key of the box this one belongs into, such as a label in its node or a node in its frame. It must lie inside
   * that box and may overlap it and everything around it.
   */
  readonly within?: string;
  /**
   * Key of the box this one sits on the border of, such as an entry point on its state: it may overlap that box and
   * everything around it, and need not lie inside. Stands instead of `within`.
   */
  readonly on?: string;
  /** The source the rectangle comes from, so the finding points at its line. */
  readonly span?: Span;
}

/** Overlap below this many pixels is rounding, not a collision; touching edges never overlap. */
const TOLERANCE = 1;

const NOWHERE: Span = { line: 1, column: 1, length: 1 };

/**
 * The generic placement check on what a layout placed, the same for every kind: boxes overlap (G400, case `boxes`),
 * texts overlap (`texts`), a text lies on a box it does not belong to (`covered`), something reaches outside the
 * picture (G401), something does not fit into the box it belongs into (G402), or a box reaches into a frame it does
 * not belong to (G403). Outlines count, not rectangles. G403 is an error, because the picture then says something the
 * source does not; the others are warnings, and the picture is still drawn, so the overlap can be seen.
 */
export function checkPlacement(
  placed: readonly Placed[],
  picture: { readonly width: number; readonly height: number },
): Diagnostic[] {
  const byKey = new Map(placed.map((p) => [p.key, p]));
  const lineage = new Map(placed.map((p) => [p.key, ancestors(p, byKey)]));
  const related = (a: Placed, b: Placed) =>
    lineage.get(a.key)?.has(b.key) === true || lineage.get(b.key)?.has(a.key) === true;
  const whole: Placed = { key: '', kind: 'area', rect: { x: 0, y: 0, w: picture.width, h: picture.height } };
  const found: Diagnostic[] = [];
  placed.forEach((a, i) => {
    if (!outlineHolds(whole, a, TOLERANCE)) found.push(warn(KERNEL_CODES.outside, a, { key: a.key }));
    const box = a.within === undefined ? undefined : byKey.get(a.within);
    if (box && !outlineHolds(box, a, TOLERANCE))
      found.push(warn(KERNEL_CODES.overflow, a, { key: a.key, within: box.key }));
    for (const b of placed.slice(i + 1)) {
      if (meet(a, b) && !related(a, b) && outlinesOverlap(a, b, TOLERANCE)) found.push(overlap(a, b));
    }
  });
  return found;
}

/** Whether the check compares the two at all: an area meets only areas. */
const meet = (a: Placed, b: Placed): boolean => (a.kind === 'area') === (b.kind === 'area');

/** The finding for two placed things that overlap: G403 for a box or frame in a foreign frame, else G400. */
function overlap(a: Placed, b: Placed): Diagnostic {
  const claimed = (frame: Placed, other: Placed) => frame.kind === 'frame' && other.kind !== 'text';
  if (claimed(a, b)) return found(KERNEL_CODES.foreign, 'error', b, { frame: a.key, key: b.key });
  if (claimed(b, a)) return found(KERNEL_CODES.foreign, 'error', a, { frame: b.key, key: a.key });
  const solid = (p: Placed) => p.kind !== 'text';
  const [first, second] = solid(a) && !solid(b) ? [b, a] : [a, b];
  const kind = solid(a) === solid(b) ? (solid(a) ? 'boxes' : 'texts') : 'covered';
  return warn(KERNEL_CODES.overlap, b, { case: kind, first: first.key, second: second.key });
}

/** Keys of the boxes `p` lies in or on, its own box first; a cycle ends the chain. */
function ancestors(p: Placed, byKey: ReadonlyMap<string, Placed>): Set<string> {
  const chain = new Set<string>();
  const up = (q: Placed | undefined) => q?.within ?? q?.on;
  for (let next = up(p); next !== undefined && !chain.has(next); next = up(byKey.get(next))) chain.add(next);
  return chain;
}

const found = (code: string, severity: Severity, at: Placed, values: Record<string, string>): Diagnostic =>
  diagnostic(code, severity, at.span ?? NOWHERE, values);

const warn = (code: string, at: Placed, values: Record<string, string>): Diagnostic =>
  found(code, 'warning', at, values);
