import { LOST, type SequenceEvent } from '../diagram.js';
import type { SeqActivation } from './types.js';

/**
 * A call without a reply ends with the last message of the callee before the caller goes on. A callback of
 * the callee to the caller and its reply still belong to the call.
 */
export function closeUnanswered(
  bar: SeqActivation,
  caller: string | undefined,
  events: readonly SequenceEvent[],
): number {
  let last = bar.from;
  let callbacks = 0;
  for (let j = bar.from + 1; j < events.length; j++) {
    const e = events[j];
    if (e?.type !== 'message') continue;
    if (e.from === bar.lifeline && e.to === caller && e.kind === 'sync') callbacks++;
    else if (e.from === caller && e.to === bar.lifeline && e.kind === 'reply' && callbacks > 0) {
      callbacks--;
      last = j;
      continue;
    }
    if (e.from === caller && e.from !== bar.lifeline) break;
    if (e.from === bar.lifeline || e.to === bar.lifeline) last = j;
  }
  return last;
}

/**
 * A self call without a reply to itself: synchronous calls of the same lifeline right after it belong to it
 * (`notifyObservers()` calls `update()`), so its bar reaches to their end. Otherwise it stays a short piece.
 */
export function extendSelfCall(
  bar: SeqActivation,
  bars: readonly SeqActivation[],
  events: readonly SequenceEvent[],
): void {
  let j = bar.from + 1;
  while (j < events.length) {
    const e = events[j];
    if (e?.type !== 'message' || e.kind !== 'sync' || e.from !== bar.lifeline) return;
    if (e.to === bar.lifeline || e.to === LOST) return;
    const call = bars.find((b) => b.from === j && b.cause === 'call');
    if (!call) return;
    bar.to = Math.max(bar.to, call.to);
    j = call.to + 1;
  }
}
