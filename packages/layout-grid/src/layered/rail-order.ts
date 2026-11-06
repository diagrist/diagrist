import type { Arrangement } from './arrange.js';
import { neighboursOf, orderRanked } from './order.js';
import { type Ranked, rank } from './rank.js';
import type { LayeredEdge, LayeredSpec } from './spec.js';

/** The side of the layers a rail runs beside. */
export type RailSide = 'left' | 'right';

/** The sides of its layer at which a node stands outermost among the boxes, placeholders not counted. */
function outermost(n: string, ranked: Ranked, layers: readonly (readonly string[])[]): RailSide[] {
  const layer = (layers[ranked.layerOf.get(n) ?? -1] ?? []).filter((k) => !ranked.dummies.has(k));
  const out: RailSide[] = [];
  if (layer[0] === n) out.push('left');
  if (layer.at(-1) === n) out.push('right');
  return out;
}

/**
 * The sides a rail may take: where both its ends stand outermost, so its pieces out of them pass no box, and not the
 * right of a box with a loop, which takes that side.
 */
function sidesOf(spec: LayeredSpec, ranked: Ranked, layers: readonly (readonly string[])[]): Map<string, RailSide[]> {
  const looped = new Set(spec.edges.flatMap((e) => (e.from === e.to ? [e.from] : [])));
  const sides = (n: string) => outermost(n, ranked, layers).filter((s) => s === 'left' || !looped.has(n));
  return new Map(
    (ranked.rails ?? []).map((e) => {
      const to = sides(e.to);
      return [e.id, sides(e.from).filter((s) => to.includes(s))] as const;
    }),
  );
}

/**
 * Whether pinning the ends of `e` to `side` clashes with the pins so far: an end pinned to the other side, or another
 * node of an end's layer pinned to the same side, where only one can stand outermost.
 */
function clashes(e: LayeredEdge, side: RailSide, pins: ReadonlyMap<string, RailSide>, ranked: Ranked): boolean {
  const layer = (n: string) => ranked.layerOf.get(n);
  return [e.from, e.to].some(
    (n) => (pins.get(n) ?? side) !== side || [...pins].some(([k, s]) => k !== n && s === side && layer(k) === layer(n)),
  );
}

/**
 * The layers and their order of a picture with rails (`LayeredEdge.rail`): edges that run up the layers leave the
 * order without placeholders, and each keeps its rail where both its ends stand outermost on one side of their
 * layers. Where they do not, the order runs again with both ends pinned to the side they stand nearer together, or to
 * the other where that clashes with the pins of a rail before (`clashes`), neither where both do; while
 * some still stand inside, the last of those runs through the layers like any other edge, one per new order.
 */
export function arrangeRails(spec: LayeredSpec, fixed?: ReadonlyMap<string, number>): Arrangement {
  const places = new Map(spec.reorder ? [] : spec.layers?.flatMap((layer) => layer.map((n, i) => [n, i] as const)));
  const chained = new Set<string>();
  const pins = new Map<string, RailSide>();
  for (let round = 0; ; round++) {
    const ranked = rank(spec, fixed, chained);
    const neighbours = neighboursOf(spec, ranked);
    const layers = orderRanked(spec, ranked, neighbours, pins, places);
    const rails = sidesOf(spec, ranked, layers);
    const failed = (ranked.rails ?? []).filter((e) => (rails.get(e.id) ?? []).length === 0);
    if (failed.length === 0) return { ranked, neighbours, layers, rails };
    const place = (n: string) => {
      const layer = (layers[ranked.layerOf.get(n) ?? -1] ?? []).filter((k) => !ranked.dummies.has(k));
      return layer.length < 2 ? 0.5 : layer.indexOf(n) / (layer.length - 1);
    };
    if (round === 0)
      for (const e of failed) {
        const near: RailSide = place(e.from) + place(e.to) <= 1 ? 'left' : 'right';
        const side = [near, near === 'left' ? 'right' : 'left'].find((s) => !clashes(e, s as RailSide, pins, ranked));
        for (const n of side === undefined ? [] : [e.from, e.to]) if (!pins.has(n)) pins.set(n, side as RailSide);
      }
    else {
      const given = failed.at(-1) as LayeredEdge;
      chained.add(given.id);
      const kept = (ranked.rails ?? []).filter((e) => !chained.has(e.id)).flatMap((e) => [e.from, e.to]);
      for (const n of [given.from, given.to]) if (!kept.includes(n)) pins.delete(n);
    }
  }
}
