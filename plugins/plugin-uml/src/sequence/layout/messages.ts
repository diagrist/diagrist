import type { Point, Rect } from '@diagrist/core';
import { FOUND, LOST, type MessageEvent } from '../diagram.js';
import { fragmentGateSide } from '../model/fragment-side.js';
import type { SequenceModel } from '../model/types.js';
import { type Bar, dock } from './bars.js';
import { gateLength, refEnds } from './gates.js';
import { durationText, messageLabel as label } from './label.js';
import type { Rows } from './rows.js';
import { labelWidth, type Measured, type SeqCtx } from './text.js';
import type { SeqMessageArt } from './types.js';

interface Inputs {
  readonly m: SequenceModel;
  readonly rows: Rows;
  readonly xs: ReadonlyMap<string, number>;
  readonly bars: readonly Bar[];
  /** Heads of created lifelines: the creation ends at their edge. */
  readonly createdHeads: ReadonlyMap<string, Rect>;
  readonly texts: readonly Measured[];
  /** References with `id=`: messages at them end at their edge. */
  readonly refBoxes: ReadonlyMap<string, Rect>;
}

/** Self call: rectangular loop to the right, back to the new, deeper bar; text right of it. */
function selfCall(e: MessageEvent, i: number, input: Inputs, c: SeqCtx): SeqMessageArt {
  const s = c.s;
  const x = input.xs.get(e.from) ?? 0;
  const outY = input.rows.y[i] ?? 0;
  const backY = input.rows.back.get(i) ?? outY;
  const outX = dock(input.bars, e.from, x, outY, 'right');
  const backX = dock(input.bars, e.from, x, backY, 'right');
  const loopX = Math.max(outX, backX) + s.selfW;
  const text = input.texts[i] ?? { lines: [], w: 0 };
  const block = text.lines.length * s.lineH;
  const first = (outY + backY) / 2 - block / 2 + s.lineH - s.descent;
  const points: Point[] = [
    [outX, outY],
    [loopX, outY],
    [loopX, backY],
    [backX, backY],
  ];
  return {
    index: i,
    from: e.from,
    to: e.to,
    kind: e.kind,
    emph: e.emph === true,
    points,
    ends: [],
    label: label(text, loopX + s.selfLabelGap, first, 'start', c, e.emph === true),
  };
}

/**
 * Centre of the label: in the first gap between two lifelines, counted from the sender, that it fits in. So
 * it crosses no other lifeline; where it fits nowhere it stands in the middle of the arrow.
 */
function labelCenter(sx: number, ex: number, w: number, xs: Iterable<number>, c: SeqCtx): number {
  const [lo, hi] = [Math.min(sx, ex), Math.max(sx, ex)];
  const half = c.s.barW;
  const cuts = [...xs].filter((x) => x - half > lo && x + half < hi).sort((a, b) => a - b);
  const gaps: [number, number][] = [];
  let from = lo;
  for (const x of cuts) {
    gaps.push([from, x - half]);
    from = x + half;
  }
  gaps.push([from, hi]);
  const ordered = sx <= ex ? gaps : gaps.reverse();
  const fit = ordered.find(([a, b]) => b - a >= w + c.s.labelPadX);
  return fit ? (fit[0] + fit[1]) / 2 : (lo + hi) / 2;
}

/** Open end: 1 circle at the end, 0 circle at the start (lost/found), 2 gate at the start, 3 gate at the end. */
type Open = 0 | 1 | 2 | 3;

/**
 * Ends of a message at height `y` (sender) and `y2` (receiver). A lost message runs right into nothing, a
 * found one comes from the left; their open end is a filled circle (UML 2.5.1, 17.4.3.1). A gate comes in from
 * the left; a reply to the gate leaves to the left, everything else to the right. A gate on a fragment
 * lies on the nearer side.
 */
function ends(
  e: MessageEvent,
  i: number,
  y: number,
  y2: number,
  text: Measured,
  input: Inputs,
  c: SeqCtx,
): [number, number, Open?] {
  const fx = input.xs.get(e.from) ?? 0;
  const tx = input.xs.get(e.to) ?? 0;
  const gate = input.m.gates.get(i);
  const len = gateLength(text, gate?.name, c);
  const side = fragmentGateSide(input.m, i);
  if (e.to === LOST || (gate?.end === 'to' && (side ? side === 'right' : e.kind !== 'reply'))) {
    const sx = dock(input.bars, e.from, fx, y, 'right');
    return [sx, sx + len, e.to === LOST ? 1 : 3];
  }
  if (gate?.end === 'to') {
    const sx = dock(input.bars, e.from, fx, y, 'left');
    return [sx, sx - len, 3];
  }
  if (gate?.end === 'from' && side === 'right') {
    const ex = dock(input.bars, e.to, tx, y2, 'right');
    return [ex + len, ex, 2];
  }
  if (e.from === FOUND || gate?.end === 'from') {
    const ex = dock(input.bars, e.to, tx, y2, 'left');
    return [ex - len, ex, e.from === FOUND ? 0 : 2];
  }
  const right = tx > fx;
  const sx = dock(input.bars, e.from, fx, y, right ? 'right' : 'left');
  const head = e.kind === 'create' ? input.createdHeads.get(e.to) : undefined;
  const ex = head ? (right ? head.x : head.x + head.w) : dock(input.bars, e.to, tx, y2, right ? 'left' : 'right');
  return [sx, ex];
}

/** A message from bar edge to bar edge, label above; with a duration it slopes down. */
function straight(e: MessageEvent, i: number, input: Inputs, c: SeqCtx): SeqMessageArt {
  const s = c.s;
  const y = input.rows.y[i] ?? 0;
  const y2 = input.rows.arrive.get(i) ?? y;
  const text = input.texts[i] ?? { lines: [], w: 0 };
  const gate = input.m.gates.get(i);
  const box = gate?.frame === undefined ? undefined : input.refBoxes.get(gate.frame);
  const atRef = gate && box ? refEnds(e, gate, box, y, input.bars, input.xs, c) : undefined;
  const [sx, ex, open] = atRef ? [atRef.x1, atRef.x2] : ends(e, i, y, y2, text, input, c);
  const first = y - s.labelLift - (Math.max(1, text.lines.length) - 1) * s.lineH;
  const dot = open === 1 ? ex : open === 0 ? sx : undefined;
  const crossing = open === undefined ? input.xs.values() : [];
  const center = labelCenter(sx, ex, labelWidth(text, c), crossing, c);
  const tip = open === 1 ? ex - s.dotR : ex;
  const slope = e.duration && y2 > y ? durationText(e.duration, sx, y, tip, y2, c) : [];
  return {
    index: i,
    from: e.from,
    to: e.to,
    kind: e.kind,
    emph: e.emph === true,
    points: [
      [sx, y],
      [tip, y2],
    ],
    ends: dot === undefined ? [] : [{ kind: 'circle', cx: dot, cy: open === 1 ? y2 : y, r: s.dotR, role: 'dot' }],
    label: [...label(text, center, first, 'middle', c, e.emph === true), ...slope, ...(atRef?.name ?? [])],
    ...(open === 2 ? { gate: 'start' as const } : open === 3 ? { gate: 'end' as const } : {}),
    ...(gate?.frame !== undefined && !atRef ? { via: gate.frame } : {}),
    ...(gate?.name && !atRef ? { gateName: gate.name } : {}),
  };
}

export function messageArts(input: Inputs, c: SeqCtx): SeqMessageArt[] {
  const out: SeqMessageArt[] = [];
  input.m.diagram.events.forEach((e, i) => {
    if (e.type !== 'message') return;
    out.push(e.from === e.to ? selfCall(e, i, input, c) : straight(e, i, input, c));
  });
  return out;
}

/** Horizontal extent of a message with its label, for the width of frames. */
export function messageExtent(art: SeqMessageArt): readonly [number, number] {
  const xs = art.points.map((p) => p[0]);
  for (const shape of art.ends) if (shape.kind === 'circle') xs.push(shape.cx - shape.r, shape.cx + shape.r);
  for (const shape of art.label) if (shape.kind === 'rect') xs.push(shape.rect.x, shape.rect.x + shape.rect.w);
  return [Math.min(...xs), Math.max(...xs)];
}
