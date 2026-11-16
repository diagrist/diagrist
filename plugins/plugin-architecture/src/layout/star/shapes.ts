import { type Rect, textWidth } from '@diagrist/core';
import type { Look } from '../../looks/look.js';
import type { ArchNode } from '../../model/types.js';
import type { Texts } from '../../texts/index.js';
import { isCircle, isFigure, linesWidth, nodeHeight, nodeWidth, secondLine } from '../measure.js';

/** The width of the cell of a stick figure, which the figure's arms and legs fit in. */
const FIGURE_W = 40;
/** Where the texts below a stick figure end, from the top of its cell: name, indented lines, second line. */
const FIGURE = { name: 70, line: 14, tech: 84, descent: 5 } as const;
/** Where the name below a circle stands and how far its texts reach below it. */
const CIRCLE_TEXT = 6;

/**
 * A node as the star sees it: the size of its rectangle, and the rectangles it covers relative to the rectangle's top
 * left corner, the rectangle first and the texts below a figure or circle after it. Lines end at their outline.
 */
export interface Shape {
  readonly node: ArchNode;
  readonly w: number;
  readonly h: number;
  readonly parts: readonly Rect[];
}

function caption(n: ArchNode, look: Look, top: number, line: number, tech: number, width: number): Rect {
  const { fonts } = look;
  const w = Math.max(
    textWidth(n.label, fonts.name),
    n.tech ? textWidth(n.tech, secondLine(n, fonts)) : 0,
    linesWidth(n, fonts),
  );
  const lines = n.lines.length * line;
  const bottom = (n.tech ? tech + lines : top + lines) + FIGURE.descent;
  return { x: (width - w) / 2, y: top - fonts.name.size, w, h: bottom - top + fonts.name.size };
}

/** The shape of a node: a box as wide as its texts need, a figure or circle with its texts below. */
export function shapeOf(n: ArchNode, look: Look, texts: Texts): Shape {
  const m = look.metrics;
  if (isFigure(n, look)) {
    const h = m.nodeH;
    return {
      node: n,
      w: FIGURE_W,
      h,
      parts: [{ x: 0, y: 0, w: FIGURE_W, h }, caption(n, look, FIGURE.name, FIGURE.line, FIGURE.tech, FIGURE_W)],
    };
  }
  if (isCircle(n, look)) {
    const d = 2 * m.circleR;
    const name = d + look.fonts.name.size + CIRCLE_TEXT;
    return {
      node: n,
      w: d,
      h: d,
      parts: [{ x: 0, y: 0, w: d, h: d }, caption(n, look, name, m.nodeLineH, name + m.nodeLineH, d)],
    };
  }
  const w = n.width ?? Math.max(m.nodeW, nodeWidth(n, look, texts.statusInBox));
  const h = nodeHeight(n, look);
  return { node: n, w, h, parts: [{ x: 0, y: 0, w, h }] };
}

/** The rectangles of a shape whose rectangle stands at (x, y). */
export const partsAt = (s: Shape, x: number, y: number): Rect[] =>
  s.parts.map((r) => ({ ...r, x: r.x + x, y: r.y + y }));
