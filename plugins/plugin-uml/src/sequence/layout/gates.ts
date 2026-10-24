import type { Point, Rect } from '@diagrist/core';
import type { MessageEvent } from '../diagram.js';
import type { SeqGate } from '../model/gates.js';
import type { SequenceModel } from '../model/types.js';
import { type Bar, dock } from './bars.js';
import type { BoxArt } from './boxes.js';
import { labelWidth, type Measured, type SeqCtx } from './text.js';
import type { SeqMessageArt, SeqShape } from './types.js';

/**
 * Gates on references and fragments (UML 2.5.1, 17.3). A reference with `id=` takes the messages right after
 * it at its edge (actual gates), a fragment with `id=` the messages inside it that start or end at its frame
 * (formal gates). Named gates carry their name small at the edge.
 */

/** Length of a lost or found message: as long as its label, at least `lostLen`. */
const openLength = (text: Measured, c: SeqCtx): number =>
  Math.max(c.s.lostLen, labelWidth(text, c) + 2 * c.s.labelPadX);

/** Length of a message with an open end: label or gate name, at least `lostLen`. */
export const gateLength = (text: Measured, name: string | undefined, c: SeqCtx): number =>
  Math.max(openLength(text, c), name ? c.width(name, c.s.messageSize) + 2 * c.s.labelPadX : 0);

/**
 * Name of a gate below the line, from the edge `x` in direction `dir` (1 right, -1 left), on a knocked-out
 * ground; the ground counts for the picture width and for time constraints.
 */
function gateName(name: string, x: number, y: number, dir: 1 | -1, c: SeqCtx): SeqShape[] {
  const { gateNameGap: gap, lineH, descent, knockout } = c.s;
  const w = c.width(name, c.s.messageSize);
  const at = { x: x + dir * gap, y: y + lineH - descent };
  const left = dir > 0 ? at.x : at.x - w;
  return [
    { kind: 'rect', rect: { x: left - knockout, y: y + 2, w: w + 2 * knockout, h: lineH - 2 }, role: 'knockout' },
    { kind: 'text', at, text: name, role: 'constraint', anchor: dir > 0 ? 'start' : 'end' },
  ];
}

/** Frames of references with `id=`, by name. */
export function refBoxes(m: SequenceModel, boxes: readonly BoxArt[]): Map<string, Rect> {
  const out = new Map<string, Rect>();
  for (const [id, index] of m.frameIds) {
    const box = boxes.find((b) => b.index === index);
    if (box && m.diagram.events[index]?.type === 'ref') out.set(id, box.rect);
  }
  return out;
}

/** A message between a lifeline and a reference: the end at the reference lies on the side of the lifeline. */
export function refEnds(
  e: MessageEvent,
  g: SeqGate,
  box: Rect,
  y: number,
  bars: readonly Bar[],
  xs: ReadonlyMap<string, number>,
  c: SeqCtx,
): { readonly x1: number; readonly x2: number; readonly name: readonly SeqShape[] } {
  const lifeline = g.end === 'to' ? e.from : e.to;
  const lx = xs.get(lifeline) ?? 0;
  const left = lx < box.x;
  const life = dock(bars, lifeline, lx, y, left ? 'right' : 'left');
  const edge = left ? box.x : box.x + box.w;
  const name = g.name ? gateName(g.name, edge, y, left ? -1 : 1, c) : [];
  return g.end === 'to' ? { x1: life, x2: edge, name } : { x1: edge, x2: life, name };
}

/**
 * Puts a gate end onto the edge of `rect`, on the side the message points to. The name stands outside on the
 * frame `sd` (`outward`) and inside on a fragment, where nothing else is.
 */
export function snapToFrame(art: SeqMessageArt, rect: Rect, c: SeqCtx, outward = false): SeqMessageArt {
  const pts = art.points;
  const first = pts[0];
  const last = pts.at(-1);
  if (!art.gate || !first || !last) return art;
  const [left, right] = [rect.x, rect.x + rect.w];
  const edge = (art.gate === 'start' ? first[0] <= last[0] : last[0] < first[0]) ? left : right;
  const points: Point[] =
    art.gate === 'start' ? [[edge, first[1]], ...pts.slice(1)] : [...pts.slice(0, -1), [edge, last[1]]];
  if (!art.gateName) return { ...art, points };
  const y = art.gate === 'start' ? first[1] : last[1];
  const inward = edge === left ? 1 : -1;
  const name = gateName(art.gateName, edge, y, outward ? (-inward as 1 | -1) : inward, c);
  return { ...art, points, label: [...art.label, ...name] };
}

/** Formal gates of fragments onto their frames; `frames` lists the frames in the order of the fragments. */
export function snapFragmentGates(
  m: SequenceModel,
  messages: readonly SeqMessageArt[],
  frames: readonly SeqShape[],
  c: SeqCtx,
): SeqMessageArt[] {
  const rects = frames.flatMap((s) => (s.kind === 'rect' && s.role === 'frame' ? [s.rect] : []));
  const byId = new Map<string, Rect>();
  m.fragments.forEach((f, k) => {
    const rect = rects[k];
    if (f.event.id && rect && !byId.has(f.event.id)) byId.set(f.event.id, rect);
  });
  return messages.map((art) => {
    const rect = art.via === undefined ? undefined : byId.get(art.via);
    return rect ? snapToFrame(art, rect, c) : art;
  });
}
