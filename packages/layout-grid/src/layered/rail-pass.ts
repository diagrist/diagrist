import type { Rect } from '@diagrist/core';
import type { PlacedGroup, Route } from '../layout.js';
import type { Arrangement } from './arrange.js';
import { grownFrames } from './rail-frames.js';
import { drawRails, type Railed } from './rails.js';
import type { LayeredSpec } from './spec.js';

const NONE: Railed = { routes: new Map(), reach: new Map() };

/**
 * A placed picture before its rails: boxes, boxes with the room of their loops, the frames around them where the
 * picture has frames, and the other lines.
 */
export interface BeforeRails {
  readonly boxes: ReadonlyMap<string, Rect>;
  readonly rects: ReadonlyMap<string, Rect>;
  readonly around: readonly PlacedGroup[] | undefined;
  readonly lines: readonly Route[];
  /** The lane of every node and placeholder, in a picture with lanes. */
  readonly lane?: (id: string) => number;
  /** The sides of boxes other lines take at a corner, as `box|side`. */
  readonly taken?: ReadonlySet<string>;
}

/** The rails of a picture, every route in the order of the edges, and its frames grown for the rails they hold. */
export interface Railing {
  readonly railed: Railed;
  readonly routes: readonly Route[];
  readonly frames: readonly PlacedGroup[] | undefined;
}

/**
 * The rails of an arranged picture on its placed boxes (`drawRails`), beyond the texts beside them (`reach`), every
 * route in the order of the edges, and the frames grown around the rails they hold. Where frames stand, the rails
 * are drawn twice: first beside the frames as they stand around their boxes, then beside the frames grown for the
 * rails inside them, so a rail outside a frame passes it as it is drawn.
 */
export function railsOn(spec: LayeredSpec, arrangement: Arrangement, before: BeforeRails): Railing {
  const edges = arrangement.ranked.rails ?? [];
  const frames = before.around ?? [];
  if (edges.length === 0) return { railed: NONE, routes: before.lines, frames: before.around };
  const sides = arrangement.rails ?? new Map();
  const reach = new Map(spec.nodes.flatMap((n) => (n.reach ? [[n.id, n.reach] as const] : [])));
  const rects = new Map(
    [...before.rects].map(([id, r]) => {
      const out = reach.get(id);
      return [id, out ? { ...r, x: r.x - out.left, w: r.w + out.left + out.right } : r] as const;
    }),
  );
  const input = { ...before, rects, frames, edges, sides, layerOf: arrangement.ranked.layerOf };
  const first = drawRails(input, spec.metrics, spec);
  const railed =
    frames.length === 0 || first.reach.size === 0
      ? first
      : drawRails({ ...input, frames: grownFrames(frames, first, spec) }, spec.metrics, spec);
  const others = new Map(before.lines.map((r) => [r.edge, r]));
  const routes = spec.edges.flatMap((e) => railed.routes.get(e.id) ?? others.get(e.id) ?? []);
  return { railed, routes, frames: before.around && grownFrames(before.around, railed, spec) };
}
