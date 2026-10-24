import type { SequenceEvent } from '../diagram.js';
import type { SequenceModel } from '../model/types.js';
import { messageNeeds, type Need } from './needs.js';
import { railNeeds } from './rail-anchor.js';
import {
  boxWidth,
  fragmentTag,
  guardText,
  headSize,
  type Measured,
  operandGuard,
  type SeqCtx,
  tagWidth,
  wrap,
} from './text.js';

export interface Columns {
  /** Centre of every lifeline, from 0 for the first. */
  readonly x: ReadonlyMap<string, number>;
  readonly size: ReadonlyMap<string, { readonly w: number; readonly h: number }>;
}

/** Distances from measuring: head widths, messages, self calls, notes and references, in this order. */
function needs(m: SequenceModel, texts: readonly Measured[], ctx: SeqCtx, widths: readonly number[]): Need[] {
  const heads: Need[] = widths.slice(1).map((w, k) => ({
    left: k,
    right: k + 1,
    distance: (widths[k] ?? 0) / 2 + w / 2 + ctx.s.headGap,
  }));
  const events = m.diagram.events.flatMap((e, i) => {
    const text = texts[i] ?? { lines: [], w: 0 };
    return [...messageNeeds(m, i, text, ctx, widths), ...boxNeeds(m, e, text, ctx)];
  });
  return [...heads, ...events];
}

/**
 * A note, reference or invariant: over several lifelines it spans the gaps between them, less the overhang on both
 * sides; over one lifeline half of it stands in the gap on either side, beside the bar.
 */
function boxNeeds(m: SequenceModel, e: SequenceEvent, text: Measured, ctx: SeqCtx): Need[] {
  if (e.type !== 'note' && e.type !== 'ref' && e.type !== 'invariant') return [];
  const tokens = ctx.s;
  const over = e.type === 'invariant' ? (e.on ? [e.on] : []) : e.over;
  const covered = over.map((id) => m.order.indexOf(id)).filter((k) => k >= 0);
  if (covered.length === 0) return [];
  const [first, last] = [Math.min(...covered), Math.max(...covered)];
  const width = boxWidth(e, text, ctx);
  if (first < last) return [{ left: first, right: last, distance: width - 2 * tokens.overhang }];
  const half = width / 2 + (tokens.barW + tokens.barLevel) + tokens.labelPadX;
  return [
    ...(first > 0 ? [{ left: first - 1, right: first, distance: half }] : []),
    ...(first < m.order.length - 1 ? [{ left: first, right: first + 1, distance: half }] : []),
  ];
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
function guardNeeds(m: SequenceModel, ctx: SeqCtx): Need[] {
  const tokens = ctx.s;
  const index = new Map(m.order.map((id, k) => [id, k]));
  const last = m.diagram.events.length - 1;
  const reach = (text: string, tag: number) =>
    tag +
    2 * tokens.guardGap +
    ctx.width(text, tokens.messageSize) -
    tokens.framePadX +
    tokens.barW / 2 +
    tokens.barLevel;
  return m.fragments.flatMap((f) => {
    const covered = m.diagram.events
      .slice(f.index, (f.end ?? last) + 1)
      .flatMap(named)
      .map((id) => index.get(id))
      .filter((k) => k !== undefined);
    const left = Math.min(...covered);
    if (covered.length === 0 || left >= m.order.length - 1) return [];
    const first = guardText(f.event);
    const guards = [
      ...(first ? [reach(first, tagWidth(fragmentTag(f.event), ctx))] : []),
      ...f.operands.slice(1).flatMap((o) => {
        const text = operandGuard(o.guard, o.marker);
        return text ? [reach(text, 0)] : [];
      }),
    ];
    return guards.map((distance) => ({ left, right: left + 1, distance }));
  });
}

/**
 * Columns by content: short constraints first, and a shortfall spreads evenly over the gaps in between. So
 * every label gets room without all columns becoming equally wide.
 */
export function columns(m: SequenceModel, texts: readonly Measured[], ctx: SeqCtx): Columns {
  const size = new Map(
    m.order.flatMap((id) => {
      const p = m.participants.get(id);
      return p ? [[id, headSize(p, ctx)] as const] : [];
    }),
  );
  const widths = m.order.map((id) => size.get(id)?.w ?? 0);
  const all = [...needs(m, texts, ctx, widths), ...guardNeeds(m, ctx), ...railNeeds(m, ctx)];
  const gaps = settle(all, widths.length - 1);
  const x = new Map<string, number>();
  let at = 0;
  m.order.forEach((id, k) => {
    x.set(id, at);
    at += gaps[k] ?? 0;
  });
  return { x, size };
}

/**
 * The gaps between `count + 1` lifelines that meet every need: the narrowest spans first, each shortfall spread
 * evenly over the gaps of its span and rounded up per gap. Needs of equal span keep their order.
 */
function settle(all: readonly Need[], count: number): number[] {
  const gaps = Array.from({ length: Math.max(count, 0) }, () => 0);
  const span = (n: Need) => n.right - n.left;
  for (const n of [...all].sort((p, q) => span(p) - span(q))) {
    const between = gaps.slice(n.left, n.right);
    const have = between.reduce((sum, g) => sum + g, 0);
    if (have >= n.distance) continue;
    const add = (n.distance - have) / between.length;
    for (let k = n.left; k < n.right; k++) gaps[k] = Math.ceil((gaps[k] ?? 0) + add);
  }
  return gaps;
}

/** Notes over several lifelines may wrap as wide as their frame becomes anyway. */
export function widenNotes(m: SequenceModel, texts: readonly Measured[], cols: Columns, ctx: SeqCtx): Measured[] {
  const tokens = ctx.s;
  return m.diagram.events.map((e, i) => {
    const text = texts[i] ?? { lines: [], w: 0 };
    if (e.type !== 'note' || e.over.length < 2) return text;
    const xs = e.over.map((id) => cols.x.get(id)).filter((x) => x !== undefined);
    const room = Math.max(...xs) - Math.min(...xs) + 2 * tokens.overhang - 2 * tokens.notePad - tokens.noteFold;
    return room > tokens.noteMaxW ? wrap(e.text, room, ctx.noteSize, ctx) : text;
  });
}
