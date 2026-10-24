import type { Rect } from '@diagrist/core';
import type { SeqHeadArt, SeqMessageArt, SeqShape } from './types.js';

/**
 * Something a time constraint should not cover. `soft`: frame edges and dividers a guide line may cross;
 * `message`: the line of this message, which its own constraint may touch.
 */
export interface Obstacle {
  readonly rect: Rect;
  readonly soft?: boolean;
  readonly message?: number;
}

/** Parts of a placed constraint: bracket and text cover nothing, guide lines cross no lifeline. */
export interface RailPieces {
  readonly solid: readonly Rect[];
  readonly guides: readonly Rect[];
}

const EPS = 0.5;

const thin = (x1: number, y1: number, x2: number, y2: number): Rect => ({
  x: Math.min(x1, x2) - EPS,
  y: Math.min(y1, y2) - EPS,
  w: Math.abs(x2 - x1) + 2 * EPS,
  h: Math.abs(y2 - y1) + 2 * EPS,
});

/** Outline of a path of `M`, `L`, `H`, `V`, `Z`, as the layout writes them. */
function pathBox(d: string): Rect | undefined {
  const xs: number[] = [];
  const ys: number[] = [];
  const tokens = d.match(/[MLHVZ]|-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? [];
  let cmd = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i] ?? '';
    if (/^[MLHVZ]$/.test(t)) cmd = t;
    else if (cmd === 'H') xs.push(Number(t));
    else if (cmd === 'V') ys.push(Number(t));
    else {
      xs.push(Number(t));
      ys.push(Number(tokens[++i]));
    }
  }
  if (xs.length === 0 || ys.length === 0) return undefined;
  const [x, y] = [Math.min(...xs), Math.min(...ys)];
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Obstacle of an area or line; frames fall apart into their four edges. */
function fromShape(s: SeqShape, message?: number): Obstacle[] {
  const own = message === undefined ? {} : { message };
  if (s.kind === 'line') return [{ rect: thin(s.seg.x1, s.seg.y1, s.seg.x2, s.seg.y2), soft: s.role === 'separator' }];
  if (s.kind === 'circle') return [{ rect: { x: s.cx - s.r, y: s.cy - s.r, w: 2 * s.r, h: 2 * s.r }, ...own }];
  if (s.kind === 'path') {
    const rect = pathBox(s.d);
    return rect ? [{ rect }] : [];
  }
  if (s.kind !== 'rect') return [];
  const r = s.rect;
  if (s.role !== 'frame') return [{ rect: r }];
  return [
    thin(r.x, r.y, r.x + r.w, r.y),
    thin(r.x, r.y + r.h, r.x + r.w, r.y + r.h),
    thin(r.x, r.y, r.x, r.y + r.h),
    thin(r.x + r.w, r.y, r.x + r.w, r.y + r.h),
  ].map((rect) => ({ rect, soft: true }));
}

/** Everything in the picture before the time constraints come. */
export function obstacles(parts: {
  readonly heads: readonly SeqHeadArt[];
  readonly lifelines: readonly SeqShape[];
  readonly activations: readonly SeqShape[];
  readonly frames: readonly SeqShape[];
  readonly boxes: readonly SeqShape[];
  readonly messages: readonly SeqMessageArt[];
}): Obstacle[] {
  const out: Obstacle[] = parts.heads.map((h) => ({ rect: h.rect }));
  for (const s of [...parts.lifelines, ...parts.activations, ...parts.frames, ...parts.boxes])
    out.push(...fromShape(s));
  for (const art of parts.messages) {
    art.points.slice(1).forEach(([x, y], k) => {
      const [px, py] = art.points[k] ?? [x, y];
      out.push({ rect: thin(px, py, x, y), message: art.index });
    });
    for (const s of art.ends) out.push(...fromShape(s, art.index));
    for (const s of art.label) if (s.kind === 'rect') out.push({ rect: s.rect });
  }
  return out;
}

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS && a.y < b.y + b.h - EPS && a.y + a.h > b.y + EPS;

/** Obstacles a placed constraint hits; the lines of its own messages do not count. */
export function hits(p: RailPieces, all: readonly Obstacle[], own: readonly number[]): Rect[] {
  const out: Rect[] = [];
  for (const o of all) {
    if (o.message !== undefined && own.includes(o.message)) continue;
    if (p.solid.some((r) => overlaps(r, o.rect)) || (!o.soft && p.guides.some((r) => overlaps(r, o.rect))))
      out.push(o.rect);
  }
  return out;
}
