import type { Xs } from './coords.js';
import { type FramePaths, prefix } from './paths.js';

/** What the clearing of frames works on: the frames, deepest first, and the centres it moves. */
export interface Clearing {
  readonly fp: FramePaths;
  readonly frames: readonly string[];
  readonly dummies: ReadonlySet<string>;
  readonly x: Xs;
  readonly layers: readonly (readonly string[])[];
  readonly width: (id: string) => number;
  /** Least gap between a frame and what stands beside it. */
  readonly gap: number;
  /** Room a frame takes left of its boxes beyond its pad, so its head stands clear of a line entering it, by frame. */
  readonly extra: ReadonlyMap<string, number>;
}

/** Rounds of clearing; each round settles every frame once, and a picture of a few frames needs two or three. */
const ROUNDS = 12;

/**
 * Moves boxes and placeholders out of frames they do not stand in, and sibling frames that share a layer apart, so
 * every frame is a rectangle that holds only its own. Everything moves to the right only, a node with what stands
 * after it in its layer and a frame with what stands after its first node in every layer it holds a node in, so
 * the order of every layer stays and the picture never grows past its left edge. A frame reaches `extra` further
 * left than its pad.
 */
export function clearFrames(c: Clearing): void {
  const { fp, x, layers, width } = c;
  const path = (n: string) => fp.paths.get(n) ?? [];
  const pads = (ids: readonly string[]) => ids.reduce((s, f) => s + (fp.byId.get(f)?.pad ?? 0), 0);
  const inside = (n: string, f: string) => path(n).includes(f);
  const inset = (n: string, f: string) => pads(path(n).slice(path(n).indexOf(f)));
  const all = layers.flat();
  const leftInset = (n: string, f: string) =>
    inset(n, f) +
    path(n)
      .slice(path(n).indexOf(f))
      .reduce((s, g) => s + (c.extra.get(g) ?? 0), 0);
  const extent = (f: string): [number, number] => {
    const own = all.filter((n) => inside(n, f));
    return [
      Math.min(...own.map((n) => (x.get(n) ?? 0) - width(n) / 2 - leftInset(n, f))),
      Math.max(...own.map((n) => (x.get(n) ?? 0) + width(n) / 2 + inset(n, f))),
    ];
  };
  const shiftFrom = (layer: readonly string[], i: number, by: number) => {
    for (const n of layer.slice(i)) x.set(n, (x.get(n) ?? 0) + by);
  };
  const shiftFrame = (f: string, by: number) => {
    for (const layer of layers) {
      const i = layer.findIndex((n) => inside(n, f));
      if (i >= 0) shiftFrom(layer, i, by);
    }
  };
  const firstIn = (f: string, l: number) => (layers[l] ?? []).findIndex((n) => inside(n, f));
  const settle = (f: string): boolean => {
    let moved = false;
    const [top, bottom] = fp.span.get(f) ?? [0, -1];
    const ancestors = fp.chain(fp.byId.get(f)?.parent);
    for (let l = top; l <= bottom; l++) {
      const layer = layers[l] ?? [];
      for (const n of layer) {
        if (inside(n, f)) continue;
        const [left, right] = extent(f);
        const clearance = (c.dummies.has(n) ? c.gap / 2 : c.gap) + pads(path(n).slice(prefix(path(n), ancestors)));
        const [nl, nr] = [(x.get(n) ?? 0) - width(n) / 2, (x.get(n) ?? 0) + width(n) / 2];
        if (nr + clearance <= left || nl - clearance >= right) continue;
        const mine = firstIn(f, l);
        const after = mine >= 0 ? layer.indexOf(n) > mine : (x.get(n) ?? 0) > (left + right) / 2;
        if (after) shiftFrom(layer, layer.indexOf(n), right + clearance - nl);
        else shiftFrame(f, nr + clearance - left);
        moved = true;
      }
    }
    return moved;
  };
  const apart = (f: string): boolean => {
    let moved = false;
    const parent = fp.byId.get(f)?.parent;
    const [top, bottom] = fp.span.get(f) ?? [0, -1];
    for (const g of c.frames) {
      const [gt, gb] = fp.span.get(g) ?? [0, -1];
      if (g === f || fp.byId.get(g)?.parent !== parent || gb < top || gt > bottom) continue;
      const shared = layers.findIndex((_, l) => firstIn(f, l) >= 0 && firstIn(g, l) >= 0);
      const [fe, ge] = [extent(f), extent(g)];
      const before = shared >= 0 ? firstIn(f, shared) < firstIn(g, shared) : fe[0] + fe[1] <= ge[0] + ge[1];
      if (!before || ge[0] >= fe[1] + c.gap) continue;
      shiftFrame(g, fe[1] + c.gap - ge[0]);
      moved = true;
    }
    return moved;
  };
  for (let round = 0, moved = true; moved && round < ROUNDS; round++) {
    moved = false;
    for (const f of c.frames) if (settle(f)) moved = true;
    for (const f of c.frames) if (apart(f)) moved = true;
  }
}
