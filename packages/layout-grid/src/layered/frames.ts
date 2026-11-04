import type { Point, Rect } from '@diagrist/core';
import type { PlacedGroup } from '../layout.js';
import type { Xs } from './coords.js';
import type { Ranked } from './rank.js';
import type { LayeredFrame, LayeredSpec } from './spec.js';

/** Where the frames of a picture make room and stand: walls between neighbours, heads and feet in the gaps. */
export interface Frames {
  /** The pads of the frames standing between two neighbours of a layer. */
  walls(a: string, b: string): number;
  /** Room above layer `l` for the heads of frames starting there, and below it for the feet of frames ending there. */
  head(l: number): number;
  foot(l: number): number;
  /** Moves boxes out of frames they do not belong to, with what stands beyond them in their layer. */
  clear(x: Xs, layers: readonly (readonly string[])[], width: (id: string) => number, gap: number): void;
  /** The rectangle of every frame around its boxes, `tops` and `bottoms` being those of the layers. */
  rects(boxes: ReadonlyMap<string, Rect>, tops: readonly number[], bottoms: readonly number[]): PlacedGroup[];
}

/** No frames: nothing to make room for. */
const NONE: Frames = { walls: () => 0, head: () => 0, foot: () => 0, clear: () => undefined, rects: () => [] };

const prefix = (a: readonly string[], b: readonly string[]) => {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return i;
};

/**
 * The frames of a picture: the path of frames around every box, outermost first, and of every placeholder the
 * frames around both ends of its edge; the layers each frame spans with its boxes; and the room its head and foot
 * take, frames starting or ending in the same layer stacked inside each other.
 */
export function framesOf(spec: LayeredSpec, ranked: Ranked): Frames {
  const list = spec.frames ?? [];
  if (list.length === 0) return NONE;
  const byId = new Map(list.map((f) => [f.id, f]));
  const chain = (id: string | undefined): string[] => {
    const out: string[] = [];
    for (let f = id; f !== undefined && byId.has(f) && !out.includes(f); f = byId.get(f)?.parent) out.unshift(f);
    return out;
  };
  const home = new Map(list.flatMap((f) => f.members.map((n) => [n, f.id] as const)));
  const paths = new Map<string, string[]>([...ranked.layerOf.keys()].map((n) => [n, chain(home.get(n))]));
  for (const [edge, nodes] of ranked.chains) {
    const [a, b] = [paths.get(nodes[0] as string) ?? [], paths.get(nodes.at(-1) as string) ?? []];
    const shared = a.slice(0, prefix(a, b));
    for (const d of nodes.slice(1, -1)) if (d.startsWith(`d:${edge}:`)) paths.set(d, shared);
  }
  const path = (n: string) => paths.get(n) ?? [];
  const pads = (ids: readonly string[]) => ids.reduce((s, f) => s + (byId.get(f)?.pad ?? 0), 0);
  const real = [...ranked.layerOf].filter(([n]) => !ranked.dummies.has(n));
  const span = new Map<string, [number, number]>();
  for (const [n, l] of real)
    for (const f of path(n)) {
      const s = span.get(f);
      span.set(f, [Math.min(s?.[0] ?? l, l), Math.max(s?.[1] ?? l, l)]);
    }
  const placed = list.filter((f) => span.has(f.id));
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
  const inside = (n: string, f: string) => path(n).includes(f);
  const inset = (n: string, f: string) => pads(path(n).slice(path(n).indexOf(f)));
  return {
    walls: (a, b) => {
      const [pa, pb] = [path(a), path(b)];
      const c = prefix(pa, pb);
      return pads(pa.slice(c)) + pads(pb.slice(c));
    },
    head: (l) => room(l, 0),
    foot: (l) => room(l, 1),
    clear: (x, layers, width, gap) => {
      for (const f of deepest) {
        const own = real.filter(([n]) => inside(n, f.id)).map(([n]) => n);
        const left = Math.min(...own.map((n) => (x.get(n) ?? 0) - width(n) / 2 - inset(n, f.id)));
        const right = Math.max(...own.map((n) => (x.get(n) ?? 0) + width(n) / 2 + inset(n, f.id)));
        const [top, bottom] = span.get(f.id) ?? [0, -1];
        const ancestors = chain(f.parent);
        for (const layer of layers.slice(top, bottom + 1)) {
          const out = layer.filter((n) => !inside(n, f.id));
          const mine = layer.filter((n) => inside(n, f.id)).map((n) => layer.indexOf(n));
          const middle = (left + right) / 2;
          const after = (n: string) =>
            mine.length > 0 ? layer.indexOf(n) > (mine[0] as number) : (x.get(n) ?? 0) > middle;
          const clearance = (n: string) =>
            (ranked.dummies.has(n) ? gap / 2 : gap) + pads(path(n).slice(prefix(path(n), ancestors)));
          const next = out.find(after);
          if (next !== undefined) {
            const shift = right + clearance(next) - ((x.get(next) ?? 0) - width(next) / 2);
            if (shift > 0) for (const n of layer.slice(layer.indexOf(next))) x.set(n, (x.get(n) ?? 0) + shift);
          }
          const before = out.filter((n) => !after(n)).at(-1);
          if (before !== undefined) {
            const shift = (x.get(before) ?? 0) + width(before) / 2 + clearance(before) - left;
            if (shift > 0) for (const n of layer.slice(0, layer.indexOf(before) + 1)) x.set(n, (x.get(n) ?? 0) - shift);
          }
        }
      }
    },
    rects: (boxes, tops, bottoms) => {
      const out = new Map<string, Rect>();
      for (const f of deepest) {
        const [top, bottom] = span.get(f.id) ?? [0, 0];
        const inner = [
          ...f.members.flatMap((n) => boxes.get(n) ?? []),
          ...children(f).flatMap((c) => out.get(c.id) ?? []),
        ];
        const x = Math.min(...inner.map((r) => r.x)) - f.pad;
        const y = (tops[top] ?? 0) - stack(f, 0);
        const w = Math.max(...inner.map((r) => r.x + r.w)) + f.pad - x;
        out.set(f.id, { x, y, w, h: (bottoms[bottom] ?? 0) + stack(f, 1) - y });
      }
      const outerFirst = [...placed].sort((a, b) => chain(a.id).length - chain(b.id).length);
      return outerFirst.map((f) => ({ id: f.id, rect: out.get(f.id) as Rect }));
    },
  };
}

/** Room between the head of a frame and a line passing it. */
const AIR = 12;

const meets = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const holds = (a: Rect, b: Rect) => a.x <= b.x && a.y <= b.y && a.x + a.w >= b.x + b.w && a.y + a.h >= b.y + b.h;

/**
 * Frames whose head a line crosses grow to the left until the head stands `AIR` beside the leftmost such line, unless
 * they would then reach a box or frame they do not hold; frames around them grow along. Inner frames come last.
 */
export function clearHeads(
  frames: readonly PlacedGroup[],
  spec: LayeredSpec,
  lines: readonly { readonly points: readonly Point[] }[],
  boxes: ReadonlyMap<string, Rect>,
): PlacedGroup[] {
  const out = frames.map((g) => ({ id: g.id, rect: { ...g.rect } }));
  const byId = new Map((spec.frames ?? []).map((f) => [f.id, f]));
  for (const g of [...out].reverse()) {
    const head = byId.get(g.id)?.head;
    if (head === undefined) continue;
    const [x0, x1] = [g.rect.x, g.rect.x + head.width + AIR];
    const [y0, y1] = [g.rect.y, g.rect.y + head.height];
    const xs = lines.flatMap((l) =>
      l.points.slice(1).flatMap((q, k) => {
        const p = l.points[k] ?? q;
        const crosses =
          p[0] === q[0] && p[0] > x0 && p[0] < x1 && Math.min(p[1], q[1]) < y1 && Math.max(p[1], q[1]) > y0;
        return crosses ? [p[0]] : [];
      }),
    );
    if (xs.length === 0) continue;
    const shift = g.rect.x - (Math.min(...xs) - head.width - AIR);
    if (shift <= 0) continue;
    const grown = { ...g.rect, x: g.rect.x - shift, w: g.rect.w + shift };
    const mine = new Set(out.filter((o) => holds(g.rect, o.rect)).map((o) => o.id));
    const foreignBoxes = [...boxes.values()].filter((b) => !holds(g.rect, b));
    const foreignFrames = out.filter((o) => o !== g && !mine.has(o.id) && !holds(o.rect, g.rect));
    if ([...foreignBoxes, ...foreignFrames.map((o) => o.rect)].some((r) => meets(r, grown))) continue;
    const around = out.filter((o) => o !== g && holds(o.rect, g.rect));
    g.rect = grown;
    for (const o of around) {
      const x = Math.min(o.rect.x, grown.x - (byId.get(o.id)?.pad ?? 0));
      o.rect = { ...o.rect, x, w: o.rect.x + o.rect.w - x };
    }
  }
  return out;
}
