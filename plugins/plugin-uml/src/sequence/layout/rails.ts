import type { Rect } from '@diagrist/core';
import type { Constraint } from '../diagram.js';
import type { SequenceModel } from '../model/types.js';
import { type Bar, dock } from './bars.js';
import { messageIndex, railLifelines } from './rail-anchor.js';
import { type End, hiddenTicks, local, type Placed, pieces, type Side } from './rail-place.js';
import type { Obstacle } from './rail-spot.js';
import type { SeqCtx } from './text.js';
import type { SeqMessageArt, SeqShape } from './types.js';

export interface Rails {
  readonly guides: readonly SeqShape[];
  readonly shapes: readonly SeqShape[];
  readonly bounds: readonly Rect[];
}

export interface RailInputs {
  readonly m: SequenceModel;
  readonly messages: readonly SeqMessageArt[];
  readonly bars: readonly Bar[];
  readonly xs: ReadonlyMap<string, number>;
  readonly obstacles: readonly Obstacle[];
  /** Left edge of everything else; the shared rail starts there. */
  readonly minX: number;
  /** Right edge of everything else; the bracket right of the lifeline searches up to there. */
  readonly maxX: number;
}

/** A gate on the frame `sd` later reaches its edge: to the left or right without bound. */
function toFrameEdge(a: SeqMessageArt, x1: number, x2: number): [number, number] {
  const [first, last] = [a.points[0]?.[0] ?? 0, a.points.at(-1)?.[0] ?? 0];
  if (!a.gate || a.via !== undefined) return [x1, x2];
  const left = a.gate === 'start' || last < first;
  return left ? [Number.NEGATIVE_INFINITY, x2] : [x1, Number.POSITIVE_INFINITY];
}

function resolve(k: Constraint, input: RailInputs, ids: ReadonlyMap<string, number>, c: SeqCtx): Placed | undefined {
  const byIndex = new Map(input.messages.map((a) => [a.index, a]));
  const keys = k.type === 'duration' ? [k.from, k.to] : [k.at];
  const arts = keys.map((id) => byIndex.get(ids.get(id) ?? -1)).filter((a) => a !== undefined);
  if (arts.length !== keys.length) return undefined;
  const common = railLifelines(k, input.m.diagram.events, ids, input.m.order);
  const [lifeline, right] = [common[0], common.at(-1)];
  const x = lifeline === undefined ? undefined : (input.xs.get(lifeline) ?? 0);
  const xr = right === undefined ? undefined : (input.xs.get(right) ?? 0);
  const ends = arts.map((a): End => {
    const y = a.points[0]?.[1] ?? 0;
    const xs = a.points.map((p) => p[0]);
    const at = lifeline === undefined || x === undefined ? Math.min(...xs) : dock(input.bars, lifeline, x, y, 'left');
    const atR = right === undefined || xr === undefined ? Math.max(...xs) : dock(input.bars, right, xr, y, 'right');
    const [x1, x2] = toFrameEdge(a, Math.min(...xs), Math.max(...xs));
    return { index: a.index, y, x1, x2, dock: at, dockR: atR };
  });
  const ys = ends.map((e) => e.y);
  const [top, bottom] = [Math.min(...ys), Math.max(...ys)];
  const text = `{${k.text}}`;
  const near = (id: string | undefined) =>
    input.bars.filter((b) => b.lifeline === id && b.rect.y <= bottom && b.rect.y + b.rect.h >= top);
  const anchor = x === undefined ? undefined : Math.min(x, ...near(lifeline).map((b) => b.rect.x));
  const anchorR = xr === undefined ? undefined : Math.max(xr, ...near(right).map((b) => b.rect.x + b.rect.w));
  const leftmost = lifeline !== undefined && lifeline === input.m.order[0];
  return { text, w: c.width(text, c.s.messageSize), top, bottom, ends, anchor, anchorR, leftmost };
}

/**
 * Time constraints (UML 2.5.1, 8.5.3.2): a bracket from the first to the second message (`duration`) or a tick at
 * the height of one message (`time`), the text outside beside it. The bracket stands left of the lifeline both
 * messages touch when there is room; otherwise mirrored right of the right one of those lifelines, when the
 * rail on the left would cross other lifelines; otherwise at the left edge, where constraints that overlap
 * vertically get their own rail further left. Short constraints come first.
 */
export function railArts(input: RailInputs, c: SeqCtx): Rails {
  const s = c.s;
  const ids = messageIndex(input.m.diagram.events);
  const placed = input.m.diagram.constraints
    .map((k) => resolve(k, input, ids, c))
    .filter((p) => p !== undefined)
    .sort((a, b) => a.bottom - a.top - (b.bottom - b.top) || a.top - b.top);
  const out = { guides: [] as SeqShape[], shapes: [] as SeqShape[], bounds: [] as Rect[] };
  const draw = (p: Placed, x: number, side: Side = -1) => {
    const parts = pieces(p, x, side, c);
    const tick = x + side * s.railTick;
    for (const g of parts.guides)
      out.guides.push({ kind: 'line', seg: { x1: g.x, y1: g.y + 0.5, x2: g.x + g.w, y2: g.y + 0.5 }, role: 'guide' });
    const d =
      p.top === p.bottom
        ? `M${x} ${p.top} H${tick} M${tick} ${p.top - s.railTick / 2} V${p.top + s.railTick / 2}`
        : `M${x} ${p.top} H${tick} V${p.bottom} H${x}${hiddenTicks(p, x, tick, c)}`;
    const mid = (p.top + p.bottom) / 2;
    out.shapes.push(
      { kind: 'path', d, role: 'bracket' },
      { kind: 'rect', rect: parts.back, role: 'knockout' },
      {
        kind: 'text',
        at: { x: tick + side * s.railTextGap, y: mid + s.textMid },
        text: p.text,
        role: 'constraint',
        anchor: side < 0 ? 'end' : 'start',
      },
    );
    out.bounds.push(parts.back);
    return parts;
  };
  const taken: Obstacle[] = [];
  const rest: Placed[] = [];
  for (const p of placed) {
    const all = [...input.obstacles, ...taken];
    const left = local(p, -1, input.minX, all, c);
    const right = left === undefined && !p.leftmost ? local(p, 1, input.maxX, all, c) : undefined;
    if (left !== undefined) taken.push(...draw(p, left).solid.map((rect) => ({ rect })));
    else if (right !== undefined) taken.push(...draw(p, right, 1).solid.map((rect) => ({ rect })));
    else rest.push(p);
  }
  const reach = (p: Placed): [number, number] => {
    const mid = (p.top + p.bottom) / 2;
    return [Math.min(p.top, mid - s.lineH / 2) - s.railTick, Math.max(p.bottom, mid + s.lineH / 2) + s.railTick];
  };
  const columns: Placed[][] = [];
  for (const p of rest) {
    const [a, b] = reach(p);
    const free = columns.find((col) => col.every((q) => reach(q)[1] < a || reach(q)[0] > b));
    if (free) free.push(p);
    else columns.push([p]);
  }
  let x = Math.min(input.minX, ...out.bounds.map((r) => r.x)) - s.railGap;
  for (const col of columns) {
    for (const p of col) draw(p, x);
    x -= s.railTick + s.railTextGap + Math.max(...col.map((p) => p.w)) + s.railGap;
  }
  return out;
}
