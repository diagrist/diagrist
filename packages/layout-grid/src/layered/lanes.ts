import type { PlacedGroup } from '../layout.js';
import type { Xs } from './coords.js';
import { nodeLanes } from './hand-overs.js';
import type { LayeredLayout } from './output.js';
import type { Ranked } from './rank.js';
import type { LayeredSpec } from './spec.js';

/** The lanes of a picture as hard columns: every layer ordered by lane, the lanes moved apart, their columns. */
export interface Lanes {
  /** Sorts every layer by lane, left to right, keeping the order the order stage chose within a lane. */
  sort(layers: readonly (readonly string[])[]): string[][];
  /**
   * Moves every lane, only ever to the right, until its column starts where the one before it ends: the leftmost
   * box of a lane stands its `pad` inside it, and the first lane starts at `left`.
   */
  clear(x: Xs, width: (id: string) => number, left: number): void;
  /**
   * The layout with the column of every lane around the boxes of `x`, from `top` to its pad below the bottom of the
   * picture, which grows to hold them.
   */
  around<T extends LayeredLayout>(layout: T, x: Xs, width: (id: string) => number, top: number): T;
}

/** No lanes: layers as they are, nothing moves. */
const NONE: Lanes = {
  sort: (layers) => layers.map((l) => [...l]),
  clear: () => undefined,
  around: (layout) => layout,
};

/**
 * The lane of every node and placeholder: a node's as `nodeLanes` gives it, a placeholder that of its line's upper
 * end, so a long line runs down in the lane it leaves and crosses the others in the gap above its lower end.
 */
function laneIndex(spec: LayeredSpec, ranked: Ranked): Map<string, number> {
  const of = nodeLanes(spec);
  for (const chain of ranked.chains.values()) {
    const lane = of.get(chain[0] ?? '') ?? 0;
    for (const id of chain.slice(1, -1)) of.set(id, lane);
  }
  return of;
}

/**
 * The lanes of a picture (`LayeredSpec.lanes`), hard columns in the order given: the order stage keeps the nodes of
 * a lane together and the lanes in their order in every layer, and the placement gives every lane a column of its
 * own, as wide as what stands in it in any layer, the lanes side by side.
 */
export function lanesOf(spec: LayeredSpec, ranked: Ranked): Lanes {
  const lanes = spec.lanes ?? [];
  if (lanes.length === 0) return NONE;
  const lane = laneIndex(spec, ranked);
  const at = (id: string) => lane.get(id) ?? 0;
  const members = (x: Xs, i: number) => [...x.keys()].filter((id) => at(id) === i);
  const extent = (x: Xs, width: (id: string) => number, i: number) => {
    const ids = members(x, i);
    const pad = lanes[i]?.pad ?? 0;
    const lo = Math.min(...ids.map((id) => (x.get(id) ?? 0) - width(id) / 2));
    const hi = Math.max(...ids.map((id) => (x.get(id) ?? 0) + width(id) / 2));
    return ids.length === 0 ? undefined : { lo: lo - pad, hi: hi + pad, ids };
  };
  return {
    sort: (layers) =>
      layers.map((l) =>
        l
          .map((id, k) => ({ id, k }))
          .sort((a, b) => at(a.id) - at(b.id) || a.k - b.k)
          .map((e) => e.id),
      ),
    clear: (x, width, left) => {
      let end = left;
      lanes.forEach((_, i) => {
        const e = extent(x, width, i);
        if (e === undefined) return;
        const shift = Math.max(0, end - e.lo);
        for (const id of e.ids) x.set(id, (x.get(id) ?? 0) + shift);
        end = e.hi + shift;
      });
    },
    around: (layout, x, width, top) => {
      const bottom = layout.bottom + Math.max(0, ...lanes.map((l) => l.pad));
      let end = Number.NEGATIVE_INFINITY;
      const columns = lanes.flatMap((l, i): PlacedGroup[] => {
        const e = extent(x, width, i);
        if (e === undefined) return [];
        const lo = Math.max(e.lo, end);
        end = e.hi;
        return [{ id: l.id, rect: { x: lo, y: top, w: e.hi - lo, h: bottom - top } }];
      });
      return { ...layout, width: Math.max(layout.width, end), bottom, lanes: columns };
    },
  };
}
