import { type Constraint, FOUND, GATE, LOST, type SequenceEvent } from '../diagram.js';
import type { SequenceModel } from '../model/types.js';
import type { SeqCtx } from './text.js';

const OPEN_ENDS: readonly string[] = [FOUND, LOST, GATE];

/** Lifelines a message touches; the open end does not count. */
const touched = (e: SequenceEvent | undefined): readonly string[] =>
  e?.type === 'message' ? [e.from, e.to].filter((id) => !OPEN_ENDS.includes(id)) : [];

/** Index of the first message for each `id`. */
export function messageIndex(events: readonly SequenceEvent[]): Map<string, number> {
  const out = new Map<string, number>();
  events.forEach((e, i) => {
    if (e.type === 'message' && e.id && !out.has(e.id)) out.set(e.id, i);
  });
  return out;
}

/** The lifelines all messages of a time constraint touch, from left to right. */
export function railLifelines(
  k: Constraint,
  events: readonly SequenceEvent[],
  ids: ReadonlyMap<string, number>,
  order: readonly string[],
): string[] {
  const at = (id: string) => {
    const i = ids.get(id);
    return i === undefined ? [] : touched(events[i]);
  };
  const common = k.type === 'duration' ? at(k.from).filter((id) => at(k.to).includes(id)) : at(k.at);
  return order.filter((id) => common.includes(id));
}

/** Width of a rail: tick, room and the text in `{...}`. */
const railWidth = (text: string, c: SeqCtx): number =>
  c.s.railTick + 2 * c.s.railTextGap + c.width(`{${text}}`, c.s.messageSize) + 2 * c.s.knockout;

/**
 * Room for the bracket left of its lifeline (the left one of those both messages touch, where the bracket has
 * a short way to them): the gap to the neighbour on the left holds bracket and text beside the bar. At the
 * leftmost lifeline none is needed, the picture grows there.
 */
export function railNeeds(m: SequenceModel, c: SeqCtx): { a: number; b: number; d: number }[] {
  const ids = messageIndex(m.diagram.events);
  const out: { a: number; b: number; d: number }[] = [];
  for (const k of m.diagram.constraints) {
    const anchor = railLifelines(k, m.diagram.events, ids, m.order)[0];
    const b = anchor === undefined ? -1 : m.order.indexOf(anchor);
    if (b > 0) out.push({ a: b - 1, b, d: railWidth(k.text, c) + c.s.barW / 2 + c.s.barLevel + c.s.labelPadX });
  }
  return out;
}
