import type { Xs } from './coords.js';
import type { Placement } from './jogs.js';

/** What `squeezed` works with: the layers, widths and gaps, the frames, and the placement's steps and price. */
export interface Squeezing {
  readonly layers: readonly (readonly string[])[];
  readonly width: (id: string) => number;
  readonly gap: (left: string, right: string) => number;
  /** The outermost frames, each with every node it holds, placeholders included. */
  readonly blocks: readonly (readonly string[])[];
  readonly left: number;
  readonly settle: (x: Xs) => Placement;
  readonly price: (p: Placement) => number;
}

/**
 * A placement with frames moved left where that makes the picture cheaper: each outermost frame, with everything
 * right of it in the layers it spans, or in those and every layer below them, moves left as far as the nodes left of
 * it in those layers and the left margin allow, and the move stays where the whole picture, drawn, costs less by
 * `price`. So a package that the straightening left far right of the free room beside it closes up with its
 * neighbours beyond and what hangs below it, and the picture narrows. Pictures without frames stay as they are.
 */
export function squeezed(s: Squeezing, start: Placement): Placement {
  if (s.blocks.length === 0) return start;
  let best = start;
  let cost = s.price(start);
  for (const block of s.blocks)
    for (const below of [false, true]) {
      const x = moved(s, best.x, block, below, s.blocks);
      if (x === undefined) continue;
      const tried = s.settle(x);
      const c = s.price(tried);
      if (c < cost) [best, cost] = [tried, c];
    }
  return best;
}

/**
 * The places `x` with `block` moved left, with everything right of its left edge in the layers it spans, and with
 * `below` in every layer under them too, and every frame of `blocks` one of those stands in, as far as the nodes left
 * of them and the left margin allow; undefined where there is no room.
 */
function moved(
  s: Squeezing,
  x: Xs,
  block: readonly string[],
  below: boolean,
  blocks: readonly (readonly string[])[],
): Xs | undefined {
  const inBlock = new Set(block);
  const at = (n: string) => x.get(n) ?? 0;
  const half = (n: string) => s.width(n) / 2;
  const cut = Math.min(...block.map((n) => at(n) - half(n)));
  const first = s.layers.findIndex((layer) => layer.some((n) => inBlock.has(n)));
  const last = s.layers.findLastIndex((layer) => layer.some((n) => inBlock.has(n)));
  const touched = s.layers.slice(first, below ? s.layers.length : last + 1);
  const moving = new Set(touched.flatMap((layer) => layer.filter((n) => inBlock.has(n) || at(n) - half(n) >= cut)));
  for (const other of blocks) if (other.some((n) => moving.has(n))) for (const n of other) moving.add(n);
  let room = Number.POSITIVE_INFINITY;
  for (const layer of s.layers) {
    const i = layer.findIndex((n) => moving.has(n));
    if (i < 0) continue;
    if (layer.slice(i).some((n) => !moving.has(n))) return undefined;
    const [n, before] = [layer[i] as string, layer[i - 1]];
    const floor = before === undefined ? s.left + half(n) : at(before) + half(before) + s.gap(before, n) + half(n);
    room = Math.min(room, at(n) - floor);
  }
  if (!(room >= 1 && room < Number.POSITIVE_INFINITY)) return undefined;
  return new Map([...x].map(([n, v]) => [n, moving.has(n) ? v - room : v]));
}
