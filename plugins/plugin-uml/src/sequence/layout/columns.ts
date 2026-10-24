import { FOUND, LOST, type SequenceEvent } from '../diagram.js';
import { fragmentGateSide } from '../model/fragment-side.js';
import type { SequenceModel } from '../model/types.js';
import { gateLength } from './gates.js';
import { railNeeds } from './rail-anchor.js';
import {
  boxWidth,
  fragmentTag,
  guardText,
  headSize,
  labelWidth,
  type Measured,
  operandGuard,
  type SeqCtx,
  tagWidth,
  wrap,
} from './text.js';

/** Minimum distance between the centres of lifelines `a` and `b` (a < b). */
interface Need {
  readonly a: number;
  readonly b: number;
  readonly d: number;
}

export interface Columns {
  /** Centre of every lifeline, from 0 for the first. */
  readonly x: ReadonlyMap<string, number>;
  readonly size: ReadonlyMap<string, { readonly w: number; readonly h: number }>;
}

/** Room for a message: its label between the lifelines, open ends and gates beside them. */
function messageNeeds(m: SequenceModel, i: number, text: Measured, c: SeqCtx, widths: readonly number[]): Need[] {
  const s = c.s;
  const e = m.diagram.events[i];
  if (e?.type !== 'message') return [];
  const out: Need[] = [];
  const pos = (id: string) => m.order.indexOf(id);
  const [p, q] = [pos(e.from), pos(e.to)].map((k) => (k < 0 ? undefined : k));
  const bar = s.barW + s.barLevel;
  const w = labelWidth(text, c);
  const gate = m.gates.get(i);
  const ref = refNeed(m, i, w, c);
  if (ref) out.push(ref);
  const open = gateLength(text, gate?.name, c) + bar + s.labelPadX;
  const toGate = gate?.end === 'to' && !ref;
  const side = fragmentGateSide(m, i);
  const outward = side ? side === 'right' : e.kind !== 'reply';
  const right = e.to === LOST || (toGate && outward);
  if (right && p !== undefined && p < m.order.length - 1) out.push({ a: p, b: p + 1, d: open });
  if (toGate && !outward && p !== undefined && p > 0) out.push({ a: p - 1, b: p, d: open });
  const fromGate = gate?.end === 'from' && !ref;
  const fromRight = fromGate && side === 'right';
  if ((e.from === FOUND || (fromGate && !fromRight)) && q !== undefined && q > 0) out.push({ a: q - 1, b: q, d: open });
  if (fromRight && q !== undefined && q < m.order.length - 1) out.push({ a: q, b: q + 1, d: open });
  if (p === undefined || q === undefined) return out;
  if (p === q) {
    if (p < m.order.length - 1) out.push({ a: p, b: p + 1, d: bar + s.selfW + s.selfLabelGap + w + s.labelPadX });
    return out;
  }
  const head = e.kind === 'create' ? (widths[q] ?? 0) / 2 : 0;
  out.push({ a: Math.min(p, q), b: Math.max(p, q), d: w + 2 * s.labelPadX + bar + head });
  return out;
}

/** Distances from measuring: head widths, messages, self calls, notes and references. */
function needs(m: SequenceModel, texts: readonly Measured[], c: SeqCtx, widths: readonly number[]): Need[] {
  const s = c.s;
  const pos = new Map(m.order.map((id, k) => [id, k]));
  const out: Need[] = widths.slice(1).map((w, k) => ({ a: k, b: k + 1, d: (widths[k] ?? 0) / 2 + w / 2 + s.headGap }));
  const bar = s.barW + s.barLevel;
  m.diagram.events.forEach((e, i) => {
    const text = texts[i] ?? { lines: [], w: 0 };
    out.push(...messageNeeds(m, i, text, c, widths));
    if (e.type === 'note' || e.type === 'ref' || e.type === 'invariant') {
      const over = e.type === 'invariant' ? (e.on ? [e.on] : []) : e.over;
      const ks = over.map((id) => pos.get(id)).filter((k) => k !== undefined);
      if (ks.length === 0) return;
      const [a, b] = [Math.min(...ks), Math.max(...ks)];
      const w = boxWidth(e, text, c);
      if (a < b) out.push({ a, b, d: w - 2 * s.overhang });
      else {
        if (a > 0) out.push({ a: a - 1, b: a, d: w / 2 + bar + s.labelPadX });
        if (a < m.order.length - 1) out.push({ a, b: a + 1, d: w / 2 + bar + s.labelPadX });
      }
    }
  });
  return out;
}

/**
 * A message at a reference: between its lifeline and the nearest lifeline of the reference fit the label, the
 * gate name and the overhang of the frame.
 */
function refNeed(m: SequenceModel, i: number, w: number, c: SeqCtx): Need | undefined {
  const s = c.s;
  const pos = (id: string) => (m.order.includes(id) ? m.order.indexOf(id) : undefined);
  const gate = m.gates.get(i);
  const ref = m.diagram.events[gate?.frame === undefined ? -1 : (m.frameIds.get(gate.frame) ?? -1)];
  const e = m.diagram.events[i];
  if (!gate || ref?.type !== 'ref' || e?.type !== 'message') return undefined;
  const k = pos(gate.end === 'to' ? e.from : e.to);
  const ks = ref.over.map(pos).filter((x) => x !== undefined);
  if (k === undefined || ks.length === 0) return undefined;
  const [a, b] = [Math.min(...ks), Math.max(...ks)];
  const label = { lines: [ref.label], w: c.width(ref.label, s.messageSize, true) };
  const reach = a === b ? boxWidth(ref, label, c) / 2 : s.overhang;
  const name = gate.name ? c.width(gate.name, s.messageSize) + 2 * s.gateNameGap : 0;
  const d = Math.max(w + 2 * s.labelPadX, name) + s.barW + s.barLevel + reach;
  if (k < a) return { a: k, b: a, d };
  return k > b ? { a: b, b: k, d } : undefined;
}

/** Lifelines an event names; the unknown end of lost and found messages is left out. */
function named(e: SequenceEvent): readonly string[] {
  if (e.type === 'message') return [e.from, e.to];
  if (e.type === 'destroy' || e.type === 'activate' || e.type === 'deactivate') return [e.target];
  if (e.type === 'invariant' || e.type === 'coregion') return e.on ? [e.on] : [];
  return e.type === 'note' || e.type === 'ref' ? e.over : [];
}

/**
 * Guards stand at the top left of their frame and should end before the next lifeline instead of covering it
 * and its bar: the gap right of the fragment's left lifeline grows accordingly.
 */
function guardNeeds(m: SequenceModel, c: SeqCtx): Need[] {
  const s = c.s;
  const pos = new Map(m.order.map((id, k) => [id, k]));
  const last = m.diagram.events.length - 1;
  const out: Need[] = [];
  for (const f of m.fragments) {
    const ks = m.diagram.events
      .slice(f.index, (f.end ?? last) + 1)
      .flatMap(named)
      .map((id) => pos.get(id))
      .filter((k) => k !== undefined);
    const p = Math.min(...ks);
    if (ks.length === 0 || p >= m.order.length - 1) continue;
    const reach = (text: string, tag: number) =>
      tag + 2 * s.guardGap + c.width(text, s.messageSize) - s.framePadX + s.barW / 2 + s.barLevel;
    const first = guardText(f.event);
    if (first) out.push({ a: p, b: p + 1, d: reach(first, tagWidth(fragmentTag(f.event), c)) });
    for (const o of f.operands.slice(1)) {
      const text = operandGuard(o.guard, o.marker);
      if (text) out.push({ a: p, b: p + 1, d: reach(text, 0) });
    }
  }
  return out;
}

/**
 * Columns by content: short constraints first, and a shortfall spreads evenly over the gaps in between. So
 * every label gets room without all columns becoming equally wide.
 */
export function columns(m: SequenceModel, texts: readonly Measured[], c: SeqCtx): Columns {
  const size = new Map(
    m.order.flatMap((id) => {
      const p = m.participants.get(id);
      return p ? [[id, headSize(p, c)] as const] : [];
    }),
  );
  const widths = m.order.map((id) => size.get(id)?.w ?? 0);
  const gaps = widths.slice(1).map(() => 0);
  const all = [...needs(m, texts, c, widths), ...guardNeeds(m, c), ...railNeeds(m, c)];
  const sorted = all.sort((p, q) => p.b - p.a - (q.b - q.a));
  for (const n of sorted) {
    const span = gaps.slice(n.a, n.b);
    const have = span.reduce((sum, g) => sum + g, 0);
    if (have >= n.d) continue;
    const add = (n.d - have) / span.length;
    for (let k = n.a; k < n.b; k++) gaps[k] = Math.ceil((gaps[k] ?? 0) + add);
  }
  const x = new Map<string, number>();
  let at = 0;
  m.order.forEach((id, k) => {
    x.set(id, at);
    at += gaps[k] ?? 0;
  });
  return { x, size };
}

/** Notes over several lifelines may wrap as wide as their frame becomes anyway. */
export function widenNotes(m: SequenceModel, texts: readonly Measured[], cols: Columns, c: SeqCtx): Measured[] {
  const s = c.s;
  return m.diagram.events.map((e, i) => {
    const text = texts[i] ?? { lines: [], w: 0 };
    if (e.type !== 'note' || e.over.length < 2) return text;
    const xs = e.over.map((id) => cols.x.get(id)).filter((x) => x !== undefined);
    const room = Math.max(...xs) - Math.min(...xs) + 2 * s.overhang - 2 * s.notePad - s.noteFold;
    return room > s.noteMaxW ? wrap(e.text, room, c.noteSize, c) : text;
  });
}
