import { dock, type Extension, extensions, firstSides, type Side } from './hub.js';
import { lanesOf } from './lanes.js';
import { type Neighbours, neighboursOf, orderRanked, shortened } from './order.js';
import { arrangeRails, type RailSide } from './rail-order.js';
import { type Ranked, rank } from './rank.js';
import type { LayeredSpec } from './spec.js';

/** The layers of a picture with their order, and the links the order and the positions weigh. */
export interface Arrangement {
  readonly ranked: Ranked;
  readonly neighbours: Neighbours;
  readonly layers: string[][];
  /** Boxes kept outside the core of a hub, at its left or right. */
  readonly pins?: ReadonlyMap<string, 'left' | 'right'>;
  /** The sides each rail may run beside, by edge, where both its ends stand outermost. */
  readonly rails?: ReadonlyMap<string, readonly RailSide[]>;
  /** An order of shorter lines that may cost crossings, to be laid out beside `layers` and weighed (`laidOut`). */
  readonly shorter?: string[][];
  /** Laid out without the passes that move boxes to straighten lines, for a quick comparison of two orders. */
  readonly rough?: boolean;
}

/** The layers and their order along the edges of a plain picture, or as the kind gave them in `layers`. */
export function arrange(spec: LayeredSpec): Arrangement {
  const given = spec.layers;
  const fixed = given && new Map(given.flatMap((layer, l) => layer.map((n) => [n, l] as const)));
  if (spec.edges.some((e) => e.rail !== undefined && e.rail !== false)) return arrangeRails(spec, fixed);
  const ranked = rank(spec, fixed);
  const neighbours = neighboursOf(spec, ranked);
  const places = new Map(spec.reorder ? [] : given?.flatMap((layer) => layer.map((n, i) => [n, i] as const)));
  const lanes = lanesOf(spec, ranked);
  const layers = lanes.sort(orderRanked(spec, ranked, neighbours, new Map(), places));
  const shorter = shortened(spec, ranked, neighbours, layers, new Map(), places);
  return { ranked, neighbours, layers, ...(shorter === undefined ? {} : { shorter: lanes.sort(shorter) }) };
}

/** A hub picture before its extensions dock: the layers of its core alone, its extensions, the first guess of sides. */
export interface HubPlan {
  readonly own: ReadonlyMap<string, number>;
  readonly parts: readonly Extension[];
  readonly first: readonly Side[];
}

/** Lays out the core of a hub alone and finds its extensions and where they may dock. */
export function planHub(spec: LayeredSpec, core: readonly string[]): HubPlan {
  const inner = new Set(core);
  const alone: LayeredSpec = {
    nodes: spec.nodes.filter((n) => inner.has(n.id)),
    edges: spec.edges.filter((e) => inner.has(e.from) && inner.has(e.to)),
    metrics: spec.metrics,
  };
  const own = new Map([...rank(alone).layerOf].filter(([n]) => inner.has(n)));
  const parts = extensions(spec, own);
  return { own, parts, first: firstSides(spec, parts) };
}

/** The layers and their order of a hub picture with its extensions at `sides`, left and right kept outside. */
export function arrangeHub(spec: LayeredSpec, plan: HubPlan, sides: readonly Side[]): Arrangement {
  const docked = dock(spec, plan.own, plan.parts, sides);
  const ranked = rank(spec, docked.layer);
  const neighbours = neighboursOf(spec, ranked);
  return { ranked, neighbours, layers: orderRanked(spec, ranked, neighbours, docked.pin), pins: docked.pin };
}
