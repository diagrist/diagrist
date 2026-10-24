import type { Rect } from '@diagrist/core';
import type { SequenceModel } from '../model/types.js';
import { bars } from './bars.js';
import { boxArts } from './boxes.js';
import type { Columns } from './columns.js';
import { frameArts } from './frames.js';
import { refBoxes, snapFragmentGates } from './gates.js';
import { headArt } from './heads.js';
import { messageArts, messageExtent } from './messages.js';
import { outerFrame } from './outer.js';
import { obstacles } from './rail-spot.js';
import { railArts } from './rails.js';
import type { Rows } from './rows.js';
import type { Measured, SeqCtx } from './text.js';
import type { SeqShape, SequenceLayout } from './types.js';

/** What the body is laid out from: model, measured texts, columns and rows. */
export interface Parts {
  readonly m: SequenceModel;
  readonly texts: readonly Measured[];
  readonly cols: Columns;
  readonly rows: Rows;
  readonly c: SeqCtx;
}

/** Everything of the picture except header, size and decision bar. */
export type Body = Omit<SequenceLayout, 'header' | 'width' | 'height' | 'strip'>;

/** End of a lifeline: at its destruction X, or a piece below the last event. */
function lifelineEnd(p: Parts, id: string): number {
  const k = p.m.diagram.events.findIndex((e) => e.type === 'destroy' && e.target === id);
  return k >= 0 ? (p.rows.y[k] ?? 0) : p.rows.bottom + p.c.s.lifelineTail;
}

/** Coregion: square brackets at its top and bottom on the lifeline, ticks pointing inwards (UML 2.5.1, 17.6.4.10). */
function coregionArts(p: Parts, xs: ReadonlyMap<string, number>): SeqShape[] {
  const { coregionW: w, coregionTick: t } = p.c.s;
  return p.m.coregions.flatMap((k): SeqShape[] => {
    const x = xs.get(k.on);
    const [top, bottom] = [p.rows.y[k.index], k.end === undefined ? p.rows.bottom : p.rows.y[k.end]];
    if (x === undefined || top === undefined || bottom === undefined) return [];
    const bracket = (y: number, d: number) => `M${x - w} ${y + d} V${y} H${x + w} V${y + d}`;
    return [
      { kind: 'path', d: bracket(top, t), role: 'coregion' },
      { kind: 'path', d: bracket(bottom, -t), role: 'coregion' },
    ];
  });
}

/** Lowest end of all lifelines. */
export const lowest = (lines: readonly SeqShape[]): number =>
  Math.max(...lines.flatMap((l) => (l.kind === 'line' ? [l.seg.y2] : [])));

/** Horizontal extent of all parts, for the shift and the picture width. */
export function extent(b: Body): [number, number] {
  const xs: number[] = [];
  const rect = (r: Rect) => xs.push(r.x, r.x + r.w);
  for (const h of b.heads) rect(h.rect);
  for (const s of b.frames) if (s.kind === 'rect') rect(s.rect);
  for (const r of b.bounds) rect(r);
  for (const msg of b.messages) xs.push(...messageExtent(msg));
  return [Math.min(...xs), Math.max(...xs)];
}

function destroyMarks(p: Parts, xs: ReadonlyMap<string, number>): SeqShape[] {
  const d = p.c.s.destroyR;
  return p.m.diagram.events.flatMap((e, i): SeqShape[] => {
    if (e.type !== 'destroy') return [];
    const [x, y] = [xs.get(e.target) ?? 0, p.rows.y[i] ?? 0];
    return [
      {
        kind: 'path',
        d: `M${x - d} ${y - d} L${x + d} ${y + d} M${x + d} ${y - d} L${x - d} ${y + d}`,
        role: 'destroy',
      },
    ];
  });
}

/** All parts with the lifeline centres shifted by `shift`; the second pass only moves to the right. */
export function body(p: Parts, shift: number): Body {
  const { m, rows: r, c } = p;
  const xs = new Map([...p.cols.x].map(([id, x]) => [id, x + shift]));
  const heads = m.order.flatMap((id) => {
    const participant = m.participants.get(id);
    if (participant === undefined) return [];
    const size = p.cols.size.get(id) ?? { w: 0, h: 0 };
    const created = r.created.get(id);
    const top = created === undefined ? r.headBottom - size.h : (r.y[created] ?? 0) - size.h / 2;
    return [headArt(participant, xs.get(id) ?? 0, top, size, c)];
  });
  const lifelines: SeqShape[] = heads.map((h) => ({
    kind: 'line',
    seg: {
      x1: h.rect.x + h.rect.w / 2,
      y1: h.rect.y + h.rect.h,
      x2: h.rect.x + h.rect.w / 2,
      y2: lifelineEnd(p, h.id),
    },
    role: 'lifeline',
  }));
  const all = bars(m, r, xs, c);
  const createdHeads = new Map(heads.filter((h) => r.created.has(h.id)).map((h): [string, Rect] => [h.id, h.rect]));
  const boxes = boxArts(m, r, xs, p.texts, c);
  const refs = refBoxes(m, boxes);
  const placed = messageArts({ m, rows: r, xs, bars: all, createdHeads, texts: p.texts, refBoxes: refs }, c);
  const frames = frameArts({ m, rows: r, xs, messages: placed, boxes, bars: all }, c);
  const messages = snapFragmentGates(m, placed, frames, c);
  const base: Body = {
    lifelines,
    activations: all.map((b) => ({ kind: 'rect', rect: b.rect, role: 'activation' })),
    frames,
    boxes: boxes.flatMap((b) => b.shapes),
    bounds: boxes.map((b) => b.rect),
    messages,
    heads,
    marks: [...coregionArts(p, xs), ...destroyMarks(p, xs)],
    guides: [],
    annotations: [],
  };
  const [minX, maxX] = extent(base);
  const rails = railArts({ m, messages, bars: all, xs, obstacles: obstacles(base), minX, maxX }, c);
  const railed = {
    ...base,
    bounds: [...base.bounds, ...rails.bounds],
    guides: rails.guides,
    annotations: rails.shapes,
  };
  if (m.framed === undefined) return railed;
  const outer = outerFrame(m.framed, extent(railed), lowest(lifelines), messages, c);
  return { ...railed, frames: [...outer.shapes, ...railed.frames], messages: outer.messages };
}
