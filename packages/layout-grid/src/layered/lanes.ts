import type { PlacedGroup, Route } from '../layout.js';
import type { Xs } from './coords.js';
import { nodeLanes } from './hand-overs.js';
import type { LayeredLayout } from './output.js';
import type { Ranked } from './rank.js';
import type { LayeredSpec } from './spec.js';

/** The lanes of a picture as hard columns: every layer ordered by lane, the lanes moved apart, their columns. */
export interface Lanes {
  /** Sorts every layer by lane, left to right, keeping the order the order stage chose within a lane. */
  sort(layers: readonly (readonly string[])[]): string[][];
  /** The place of the lane a node or placeholder stands in, left to right; undefined without lanes. */
  of(id: string): number | undefined;
  /**
   * The room each lane lacks at its sides for the upright pieces of the routes of `layout` that run in it beyond its
   * boxes, such as the rails of loops, and for the texts that start in it, `gap` clear of its borders, by lane; a
   * text beside an upright piece of its line counts for the lane of that piece.
   */
  room(layout: LayeredLayout, x: Xs, width: (id: string) => number, gap: number): Room[];
  /**
   * Moves every lane, only ever to the right, until its column starts where the one before it ends: the leftmost
   * box of a lane stands its `pad` inside it, and the first lane starts at `left`; a lane is as wide as its least
   * width at least, its boxes in the middle, and what `grow` asked more at its sides.
   */
  clear(x: Xs, width: (id: string) => number, left: number): void;
  /** Gives every lane so much more room at its sides, by its place, from the next `clear` on. */
  grow(room: readonly Room[]): void;
  /**
   * The layout with the column of every lane around the boxes of `x`, from `top` to its pad below the bottom of the
   * picture, which grows to hold them; the first lane also holds the lines and texts left of it.
   */
  around<T extends LayeredLayout>(layout: T, x: Xs, width: (id: string) => number, top: number): T;
}

/** How near a text stands to an upright piece of its line that it belongs to. */
const BESIDE = 12;

/** Room a lane lacks at its left and its right. */
export interface Room {
  readonly left: number;
  readonly right: number;
}

/** No lanes: layers as they are, nothing moves. */
const NONE: Lanes = {
  sort: (layers) => layers.map((l) => [...l]),
  of: () => undefined,
  room: () => [],
  grow: () => undefined,
  clear: () => undefined,
  around: (layout) => layout,
};

/**
 * The places of `x` moved as far as the boxes of `layout` were moved after the placement, such as to keep a rail
 * left of everything inside the picture.
 */
function shifted(layout: LayeredLayout, x: Xs, width: (id: string) => number): Xs {
  const kept = layout.nodes.find((n) => Math.abs(n.rect.w - width(n.id)) < 0.5);
  const dx = kept ? kept.rect.x + kept.rect.w / 2 - (x.get(kept.id) ?? 0) : 0;
  return dx === 0 ? x : new Map([...x].map(([id, v]) => [id, v + dx]));
}

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
  const bars = new Set(spec.nodes.flatMap((n) => (n.shape === 'bar' ? [n.id] : [])));
  const members = (x: Xs, i: number) => [...x.keys()].filter((id) => at(id) === i);
  const reach = new Map(spec.nodes.flatMap((n) => (n.reach ? [[n.id, n.reach] as const] : [])));
  let extra: readonly Room[] = [];
  const extent = (x: Xs, width: (id: string) => number, i: number) => {
    const all = members(x, i);
    const boxes = all.filter((id) => !bars.has(id));
    const ids = boxes.length > 0 ? boxes : all;
    const pad = lanes[i]?.pad ?? 0;
    const lo = Math.min(...ids.map((id) => (x.get(id) ?? 0) - width(id) / 2 - (reach.get(id)?.left ?? 0)));
    const hi = Math.max(...ids.map((id) => (x.get(id) ?? 0) + width(id) / 2 + (reach.get(id)?.right ?? 0)));
    const short = Math.max(0, (lanes[i]?.width ?? 0) - (hi - lo + 2 * pad)) / 2;
    const more = extra[i] ?? { left: 0, right: 0 };
    return ids.length === 0
      ? undefined
      : { lo: lo - pad - short - more.left, hi: hi + pad + short + more.right, ids: all };
  };
  return {
    sort: (layers) =>
      layers.map((l) =>
        l
          .map((id, k) => ({ id, k }))
          .sort((a, b) => at(a.id) - at(b.id) || a.k - b.k)
          .map((e) => e.id),
      ),
    of: (id) => lane.get(id),
    room: (layout, x, width, gap) => {
      const moved = shifted(layout, x, width);
      const spans = lanes.map((_, i) => extent(moved, width, i));
      const need = lanes.map(() => ({ left: 0, right: 0 }));
      const at = (v: number) => spans.findLastIndex((e) => e !== undefined && e.lo <= v);
      const grow = (from: number, to: number, anchor = from) => {
        const i = at(anchor);
        const [e, n] = [spans[i], need[i]];
        if (e === undefined || n === undefined) return;
        n.right = Math.max(n.right, to + gap - e.hi);
        n.left = Math.max(n.left, e.lo + gap - from);
      };
      const uprights = (r: Route) => r.points.slice(1).flatMap((b, k) => (r.points[k]?.[0] === b[0] ? [b[0]] : []));
      for (const r of layout.routes)
        for (let k = 1; k + 2 < r.points.length; k++) {
          const [a, b] = [r.points[k], r.points[k + 1]];
          if (a && b && a[0] === b[0]) grow(a[0], a[0]);
        }
      for (const l of layout.labels) {
        const mid = l.box.x + l.box.w / 2;
        const xs = uprights(
          layout.routes[l.route] ?? { edge: '', points: [], shape: 'orthogonal', fromSide: 'top', toSide: 'top' },
        );
        const near = xs.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a), xs[0] ?? mid);
        const [from, to] = [l.box.x, l.box.x + l.box.w];
        grow(from, to, Math.min(Math.abs(near - from), Math.abs(near - to)) <= BESIDE ? near : from);
      }
      return need;
    },
    grow: (room) => {
      extra = room;
    },
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
    around: (layout, placed, width, top) => {
      const x = shifted(layout, placed, width);
      const bottom = layout.bottom + Math.max(0, ...lanes.map((l) => l.pad));
      const spans = lanes.flatMap((l, i) => {
        const e = extent(x, width, i);
        return e === undefined ? [] : [{ l, lo: e.lo, hi: e.hi }];
      });
      const pad = lanes[0]?.pad ?? 0;
      const xs = [...layout.routes.flatMap((r) => r.points.map((p) => p[0])), ...layout.labels.map((t) => t.box.x)];
      const first = Math.min(spans[0]?.lo ?? 0, ...xs.map((v) => v - pad));
      const cut = spans.map((s, k) => (k === 0 ? first : Math.max(s.lo, ((spans[k - 1]?.hi ?? s.lo) + s.lo) / 2)));
      const end = spans.at(-1)?.hi ?? Number.NEGATIVE_INFINITY;
      const columns = spans.map(({ l }, k): PlacedGroup => {
        const [lo, hi] = [cut[k] ?? 0, cut[k + 1] ?? end];
        const y = top - (l.top ?? 0);
        return { id: l.id, rect: { x: lo, y, w: hi - lo, h: bottom - y } };
      });
      return { ...layout, width: Math.max(layout.width, end), bottom, lanes: columns };
    },
  };
}
