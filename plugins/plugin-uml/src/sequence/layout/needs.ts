import { FOUND, LOST } from '../diagram.js';
import { fragmentGateSide } from '../model/fragment-side.js';
import type { SequenceModel } from '../model/types.js';
import { gateLength } from './gates.js';
import { boxWidth, labelWidth, type Measured, type SeqCtx } from './text.js';

/** Minimum distance between the centres of the lifelines at index `left` and `right` (`left < right`). */
export interface Need {
  readonly left: number;
  readonly right: number;
  readonly distance: number;
}

/** An open end of a message, beside the lifeline it starts or ends at, and whether the message has it. */
interface OpenEnd {
  readonly lifeline: number | undefined;
  readonly side: 'left' | 'right';
  readonly when: boolean;
}

/**
 * The gaps beside the open ends of message `i` from lifeline `from` to `to`: a lost or found end, or a gate on the
 * frame of a fragment, on the side the fragment puts it. A gate on a reference is the reference's need instead.
 */
function openEndNeeds(
  m: SequenceModel,
  i: number,
  from: number | undefined,
  to: number | undefined,
  open: number,
  atRef: boolean,
): Need[] {
  const e = m.diagram.events[i];
  if (e?.type !== 'message') return [];
  const gate = m.gates.get(i);
  const toGate = gate?.end === 'to' && !atRef;
  const fromGate = gate?.end === 'from' && !atRef;
  const side = fragmentGateSide(m, i);
  const outward = side ? side === 'right' : e.kind !== 'reply';
  const ends: readonly OpenEnd[] = [
    { lifeline: from, side: 'right', when: e.to === LOST || (toGate && outward) },
    { lifeline: from, side: 'left', when: toGate && !outward },
    { lifeline: to, side: 'left', when: e.from === FOUND || (fromGate && side !== 'right') },
    { lifeline: to, side: 'right', when: fromGate && side === 'right' },
  ];
  return ends.filter((end) => end.when).flatMap((end) => beside(end.lifeline, end.side, open, m.order.length));
}

/** The need of a label `distance` wide in the gap beside lifeline `at`, if there is a neighbour on that side. */
function beside(at: number | undefined, side: 'left' | 'right', distance: number, count: number): Need[] {
  if (at === undefined) return [];
  if (side === 'right') return at < count - 1 ? [{ left: at, right: at + 1, distance }] : [];
  return at > 0 ? [{ left: at - 1, right: at, distance }] : [];
}

/**
 * Room for a message: its label between the lifelines, open ends and gates beside them. The needs come in a fixed
 * order, since `columns` settles needs of equal span in the order they come.
 */
export function messageNeeds(
  m: SequenceModel,
  i: number,
  text: Measured,
  ctx: SeqCtx,
  widths: readonly number[],
): Need[] {
  const tokens = ctx.s;
  const e = m.diagram.events[i];
  if (e?.type !== 'message') return [];
  const index = (id: string) => m.order.indexOf(id);
  const [from, to] = [index(e.from), index(e.to)].map((k) => (k < 0 ? undefined : k));
  const bar = tokens.barW + tokens.barLevel;
  const width = labelWidth(text, ctx);
  const gate = m.gates.get(i);
  const ref = refNeed(m, i, width, ctx);
  const open = gateLength(text, gate?.name, ctx) + bar + tokens.labelPadX;
  const out = [...(ref ? [ref] : []), ...openEndNeeds(m, i, from, to, open, ref !== undefined)];
  if (from === undefined || to === undefined) return out;
  if (from === to) {
    const self = bar + tokens.selfW + tokens.selfLabelGap + width + tokens.labelPadX;
    return [...out, ...beside(from, 'right', self, m.order.length)];
  }
  const head = e.kind === 'create' ? (widths[to] ?? 0) / 2 : 0;
  const distance = width + 2 * tokens.labelPadX + bar + head;
  return [...out, { left: Math.min(from, to), right: Math.max(from, to), distance }];
}

/**
 * A message at a reference: between its lifeline and the nearest lifeline of the reference fit the label, the
 * gate name and the overhang of the frame.
 */
function refNeed(m: SequenceModel, i: number, width: number, ctx: SeqCtx): Need | undefined {
  const tokens = ctx.s;
  const index = (id: string) => (m.order.includes(id) ? m.order.indexOf(id) : undefined);
  const gate = m.gates.get(i);
  const ref = m.diagram.events[gate?.frame === undefined ? -1 : (m.frameIds.get(gate.frame) ?? -1)];
  const e = m.diagram.events[i];
  if (!gate || ref?.type !== 'ref' || e?.type !== 'message') return undefined;
  const lifeline = index(gate.end === 'to' ? e.from : e.to);
  const covered = ref.over.map(index).filter((k) => k !== undefined);
  if (lifeline === undefined || covered.length === 0) return undefined;
  const [first, last] = [Math.min(...covered), Math.max(...covered)];
  const label = { lines: [ref.label], w: ctx.width(ref.label, tokens.messageSize, true) };
  const reach = first === last ? boxWidth(ref, label, ctx) / 2 : tokens.overhang;
  const name = gate.name ? ctx.width(gate.name, tokens.messageSize) + 2 * tokens.gateNameGap : 0;
  const distance = Math.max(width + 2 * tokens.labelPadX, name) + tokens.barW + tokens.barLevel + reach;
  if (lifeline < first) return { left: lifeline, right: first, distance };
  return lifeline > last ? { left: last, right: lifeline, distance } : undefined;
}
