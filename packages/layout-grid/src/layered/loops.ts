import type { Rect } from '@diagrist/core';
import type { EdgeLabel } from '../label/types.js';
import type { Route } from '../layout.js';
import type { Ranked } from './rank.js';
import type { LayeredEdge, LayeredMetrics, LayeredSpec } from './spec.js';

/** The loops of a picture: what they ask of the gaps beside their boxes, and how they are drawn. */
export interface Loops {
  /** The room the loops of neighbours `a` and `b` and their texts take between them, `a` standing left. */
  room(a: string, b: string): number;
  /** The loop of `e` around a side of its box `r`. */
  route(e: LayeredEdge, r: Rect): Route;
  /** The text of the loop at route index `at` beside its outer piece, one line per line of its label. */
  labels(e: LayeredEdge, route: Route, at: number): EdgeLabel[];
  /** The boxes with the room of their loops, as the frames around them see them. */
  widened(rects: ReadonlyMap<string, Rect>): Map<string, Rect>;
}

/**
 * Edges from a box to itself, drawn as a loop profile: out of a side of the box a quarter down, two tracks out, and
 * back into the same side three quarters down, its text beside the outer piece. The loop takes the right side, or
 * the left where a line beside the layer joins the box to its right neighbour and none to its left one. The gap on
 * that side grows by the loop and its text, and frames hold both.
 */
export function loopsOf(
  spec: LayeredSpec,
  m: LayeredMetrics,
  ranked: Ranked,
  layers: readonly (readonly string[])[],
): Loops {
  const reach = 2 * m.track;
  const own = new Map<string, LayeredEdge[]>();
  for (const e of spec.edges)
    if (e.from === e.to && e.hidden !== true) own.set(e.from, [...(own.get(e.from) ?? []), e]);
  const linked = (a: string, b: string | undefined) =>
    ranked.beside.some((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));
  const left = new Set(
    [...own.keys()].filter((n) => {
      const layer = layers.find((l) => l.includes(n)) ?? [];
      const i = layer.indexOf(n);
      return linked(n, layer[i + 1]) && !linked(n, layer[i - 1]);
    }),
  );
  const textOf = (e: LayeredEdge) => (e.label === undefined ? 0 : m.labelGap + e.label.width);
  const room = (n: string) => {
    const list = own.get(n) ?? [];
    return list.length === 0 ? 0 : reach + Math.max(...list.map(textOf));
  };
  return {
    room: (a, b) => (left.has(a) ? 0 : room(a)) + (left.has(b) ? room(b) : 0),
    route: (e, r) => {
      const toLeft = left.has(e.from);
      const side = toLeft ? r.x : r.x + r.w;
      const out = side + (toLeft ? -reach : reach);
      const [y1, y2] = [r.y + r.h / 4, r.y + (3 * r.h) / 4];
      return {
        edge: e.id,
        points: [
          [side, y1],
          [out, y1],
          [out, y2],
          [side, y2],
        ],
        shape: 'loop',
        fromSide: toLeft ? 'left' : 'right',
        toSide: toLeft ? 'left' : 'right',
      };
    },
    labels: (e, route, at) => {
      const label = e.label;
      if (label === undefined) return [];
      const lines = label.lines ?? [{ text: label.text, width: label.width }];
      const [[side], [x, y1], [, y2]] = route.points as [[number, number], [number, number], [number, number]];
      const line = label.size + 2;
      const top = (y1 + y2) / 2 - (lines.length * line) / 2;
      const toLeft = x < side;
      return lines.map((l, i) => ({
        text: l.text,
        x: toLeft ? x - m.labelGap : x + m.labelGap,
        y: top + i * line + label.size,
        anchor: toLeft ? ('end' as const) : ('start' as const),
        box: { x: toLeft ? x - m.labelGap - l.width : x + m.labelGap, y: top + i * line, w: l.width, h: line },
        route: at,
        part: 'name' as const,
      }));
    },
    widened: (rects) =>
      new Map(
        [...rects].map(([n, r]) => [
          n,
          left.has(n) ? { ...r, x: r.x - room(n), w: r.w + room(n) } : { ...r, w: r.w + room(n) },
        ]),
      ),
  };
}
