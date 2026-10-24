import { type Diagnostic, diagnostic, type Span } from '@diagrist/lang';
import type { Rect } from './geometry.js';
import { KERNEL_CODES } from './messages.js';

/**
 * A rectangle the layout has filled, as the kernel checks it (ADR 0010): a box such as a node or frame, or the
 * extent of a text. The layout reports what it placed; how it got there is its own business.
 */
export interface Placed {
  /** Unique within the drawing, such as `api` or `api.label`; diagnostics name it. */
  readonly key: string;
  readonly kind: 'box' | 'text';
  readonly rect: Rect;
  /**
   * Key of the box this one belongs into, such as a label in its node or a node in its frame. It must lie inside
   * that box and may overlap it and everything around it.
   */
  readonly within?: string;
  /** The source the rectangle comes from, so the finding points at its line. */
  readonly span?: Span;
}

/** Overlap below this many pixels is rounding, not a collision; touching edges never overlap. */
const TOLERANCE = 1;

const NOWHERE: Span = { line: 1, column: 1, length: 1 };

/**
 * The generic placement check on what a layout placed, the same for every kind: boxes overlap (G400, case
 * `boxes`), texts overlap (`texts`), a text lies on a box it does not belong to (`covered`), something reaches
 * outside the picture (G401), or something does not fit into the box it belongs into (G402). Findings are
 * warnings: the picture is still drawn, so the overlap can be seen.
 */
export function checkPlacement(
  placed: readonly Placed[],
  picture: { readonly width: number; readonly height: number },
): Diagnostic[] {
  const byKey = new Map(placed.map((p) => [p.key, p]));
  const lineage = new Map(placed.map((p) => [p.key, ancestors(p, byKey)]));
  const related = (a: Placed, b: Placed) =>
    lineage.get(a.key)?.has(b.key) === true || lineage.get(b.key)?.has(a.key) === true;
  const whole: Rect = { x: 0, y: 0, w: picture.width, h: picture.height };
  const found: Diagnostic[] = [];
  placed.forEach((a, i) => {
    if (!inside(a.rect, whole)) found.push(warn(KERNEL_CODES.outside, a, { key: a.key }));
    const box = a.within === undefined ? undefined : byKey.get(a.within);
    if (box && !inside(a.rect, box.rect)) found.push(warn(KERNEL_CODES.overflow, a, { key: a.key, within: box.key }));
    for (const b of placed.slice(i + 1)) {
      if (related(a, b) || !overlap(a.rect, b.rect)) continue;
      const [first, second] = a.kind === 'box' && b.kind === 'text' ? [b, a] : [a, b];
      const kind = a.kind === b.kind ? (a.kind === 'box' ? 'boxes' : 'texts') : 'covered';
      found.push(warn(KERNEL_CODES.overlap, b, { case: kind, first: first.key, second: second.key }));
    }
  });
  return found;
}

/** Keys of the boxes `p` lies in, its own box first; a cycle of `within` ends the chain. */
function ancestors(p: Placed, byKey: ReadonlyMap<string, Placed>): Set<string> {
  const chain = new Set<string>();
  for (let next = p.within; next !== undefined && !chain.has(next); next = byKey.get(next)?.within) chain.add(next);
  return chain;
}

const overlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w - TOLERANCE &&
  b.x < a.x + a.w - TOLERANCE &&
  a.y < b.y + b.h - TOLERANCE &&
  b.y < a.y + a.h - TOLERANCE;

const inside = (a: Rect, box: Rect): boolean =>
  a.x >= box.x - TOLERANCE &&
  a.y >= box.y - TOLERANCE &&
  a.x + a.w <= box.x + box.w + TOLERANCE &&
  a.y + a.h <= box.y + box.h + TOLERANCE;

const warn = (code: string, at: Placed, values: Record<string, string>): Diagnostic =>
  diagnostic(code, 'warning', at.span ?? NOWHERE, values);
