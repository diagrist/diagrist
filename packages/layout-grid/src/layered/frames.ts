import type { Rect } from '@diagrist/core';
import type { PlacedGroup } from '../layout.js';
import { clearFrames } from './clear.js';
import type { Xs } from './coords.js';
import { AIR } from './heads.js';
import { type FramePaths, framePaths, prefix } from './paths.js';
import type { Ranked } from './rank.js';
import type { LayeredFrame, LayeredSpec } from './spec.js';

/** Where the frames of a picture make room and stand: walls between neighbours, heads and feet in the gaps. */
export interface Frames {
  /** The pads of the frames standing between two neighbours of a layer, and the room beside the heads of the right. */
  walls(a: string, b: string): number;
  /** Room above layer `l` for the heads of frames starting there, and below it for the feet of frames ending there. */
  head(l: number): number;
  foot(l: number): number;
  /**
   * Moves boxes and placeholders out of frames they do not stand in, and frames sharing a layer apart, only ever to
   * the right, with what stands beyond them.
   */
  clear(x: Xs, layers: readonly (readonly string[])[], width: (id: string) => number, gap: number): void;
  /**
   * Widens frames at the left whose head a line entering from above would cross, given where the lines meet the boxes
   * they enter (`x`), so the next `clear` makes room for it; whether any frame grew.
   */
  heads(
    entries: readonly { readonly upper: string; readonly lower: string; readonly x: number }[],
    boxes: ReadonlyMap<string, Rect>,
  ): boolean;
  /** The nodes of the innermost frame around `n`, placeholders included, or `n` alone. */
  block(n: string): readonly string[];
  /** The rectangle of every frame around its boxes, `tops` and `bottoms` being those of the layers. */
  rects(boxes: ReadonlyMap<string, Rect>, tops: readonly number[], bottoms: readonly number[]): PlacedGroup[];
}

/** No frames: nothing to make room for. */
const NONE: Frames = {
  walls: () => 0,
  head: () => 0,
  foot: () => 0,
  clear: () => undefined,
  heads: () => false,
  block: (n) => [n],
  rects: () => [],
};

/**
 * The frames of a picture (`framePaths`): the layers each frame spans with its boxes, and the room its head and foot
 * take, frames starting or ending in the same layer stacked inside each other. A frame stands around its boxes and the
 * placeholders of the lines that run inside it, wider at the left where a line entering it from above would cross its
 * head.
 */
export function framesOf(spec: LayeredSpec, ranked: Ranked): Frames {
  if ((spec.frames ?? []).length === 0) return NONE;
  const fp: FramePaths = framePaths(spec, ranked);
  const { span, chain } = fp;
  const path = (n: string) => fp.paths.get(n) ?? [];
  const pads = (ids: readonly string[]) => ids.reduce((s, f) => s + (fp.byId.get(f)?.pad ?? 0), 0);
  const placed = (spec.frames ?? []).filter((f) => span.has(f.id));
  const deepest = [...placed].sort((a, b) => chain(b.id).length - chain(a.id).length);
  const children = (f: LayeredFrame) => placed.filter((c) => c.parent === f.id);
  const stack = (f: LayeredFrame, end: 0 | 1): number => {
    const own = end === 0 ? f.top : f.pad;
    const at = span.get(f.id)?.[end];
    const inner = children(f).filter((c) => span.get(c.id)?.[end] === at);
    return own + Math.max(0, ...inner.map((c) => stack(c, end)));
  };
  const room = (l: number, end: 0 | 1) =>
    Math.max(0, ...placed.filter((f) => span.get(f.id)?.[end] === l).map((f) => stack(f, end)));
  const head = (f: string) => (fp.byId.get(f)?.head.width ?? 0) + AIR;
  const extra = new Map<string, number>();
  const first = new Map(placed.map((f) => [f.id, span.get(f.id)?.[0]]));
  const framed = (boxes: ReadonlyMap<string, Rect>, tops: readonly number[], bottoms: readonly number[]) => {
    const out = new Map<string, Rect>();
    const direct = (f: string) => [...fp.paths].filter(([, p]) => p.at(-1) === f).map(([n]) => n);
    for (const f of deepest) {
      const [top, bottom] = span.get(f.id) ?? [0, 0];
      const inner = [
        ...direct(f.id).flatMap((n) => boxes.get(n) ?? []),
        ...children(f).flatMap((c) => out.get(c.id) ?? []),
      ];
      const x = Math.min(...inner.map((r) => r.x)) - f.pad - (extra.get(f.id) ?? 0);
      const y = (tops[top] ?? 0) - stack(f, 0);
      const w = Math.max(...inner.map((r) => r.x + r.w)) + f.pad - x;
      out.set(f.id, { x, y, w, h: (bottoms[bottom] ?? 0) + stack(f, 1) - y });
    }
    const outerFirst = [...placed].sort((a, b) => chain(a.id).length - chain(b.id).length);
    return outerFirst.map((f) => ({ id: f.id, rect: out.get(f.id) as Rect }));
  };
  return {
    walls: (a, b) => {
      const [pa, pb] = [path(a), path(b)];
      const c = prefix(pa, pb);
      return pads(pa.slice(c)) + pads(pb.slice(c)) + pb.slice(c).reduce((sum, f) => sum + (extra.get(f) ?? 0), 0);
    },
    head: (l) => room(l, 0),
    foot: (l) => room(l, 1),
    clear: (x, layers, width, gap) => {
      const frames = deepest.map((f) => f.id);
      clearFrames({ fp, frames, dummies: ranked.dummies, x, layers, width, gap, extra });
    },
    heads: (entries, boxes) => {
      const around = new Map(framed(boxes, [], []).map((g) => [g.id, g.rect]));
      const need = new Map<string, number>();
      for (const { upper, lower, x } of entries)
        for (const f of path(lower)) {
          const r = around.get(f);
          if (r === undefined || first.get(f) !== ranked.layerOf.get(lower) || path(upper).includes(f)) continue;
          need.set(f, Math.max(need.get(f) ?? 0, r.x + head(f) - x));
        }
      const grown = [...need].filter(([, n]) => n > 0);
      for (const [f, n] of grown) extra.set(f, (extra.get(f) ?? 0) + n);
      return grown.length > 0;
    },
    block: (n) => {
      const f = path(n).at(-1);
      return f === undefined ? [n] : [...fp.paths].filter(([, p]) => p.includes(f)).map(([m]) => m);
    },
    rects: (boxes, tops, bottoms) => framed(boxes, tops, bottoms),
  };
}
