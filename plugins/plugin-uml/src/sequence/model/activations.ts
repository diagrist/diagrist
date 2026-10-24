import { FOUND, LOST, type MessageEvent, type SequenceEvent } from '../diagram.js';
import type { SeqGate } from './gates.js';
import { closeUnanswered, extendSelfCall } from './implicit.js';
import type { SeqActivation, SeqIssue, SeqItem } from './types.js';

/** An open synchronous call: who waits for whom, and the bar that belongs to it. */
interface Call {
  readonly caller: string;
  readonly callee: string;
  readonly index: number;
  readonly bar: SeqActivation;
}

interface State {
  calls: Call[];
  explicit: Map<string, readonly SeqActivation[]>;
  readonly bars: SeqActivation[];
  readonly answered: Set<number>;
  readonly issues: SeqIssue[];
  /** Start of the current `else` operand; a bar that already ended in an earlier one restarts there. */
  branch: number | undefined;
  /** Events with the frame instead of the gate name, and which message ends on a frame. */
  readonly events: readonly SequenceEvent[];
  readonly gates: ReadonlyMap<number, SeqGate>;
}

const OPEN = -1;

/**
 * Closes a bar. If it already ended in an earlier operand of the same `alt`, the current operand gets a piece
 * of its own from its separator, so every branch shows only its own execution.
 */
function close(state: State, bar: SeqActivation, index: number): void {
  if (bar.to === OPEN || state.branch === undefined || bar.to > state.branch) bar.to = Math.max(bar.to, index);
  else state.bars.push({ ...bar, from: state.branch, to: index });
}

/**
 * Calls, self calls and creations open a bar; a reply in the opposite direction closes the innermost one.
 * Lost messages reach no lifeline; found ones activate the receiver like a call.
 */
function message(state: State, index: number, e: MessageEvent): void {
  if (e.to === LOST || (e.from === FOUND && e.kind !== 'sync')) return;
  if (e.kind === 'sync' || e.kind === 'create') {
    const cause = e.kind === 'create' ? 'create' : e.from === e.to ? 'self' : 'call';
    const bar: SeqActivation = { lifeline: e.to, from: index, to: OPEN, level: 0, cause };
    if (state.gates.get(index)?.end !== 'to') state.bars.push(bar);
    state.calls.push({ caller: e.from, callee: e.to, index, bar });
    return;
  }
  if (e.kind !== 'reply') return;
  let k = state.calls.length - 1;
  while (k >= 0 && !(state.calls[k]?.caller === e.to && state.calls[k]?.callee === e.from)) k--;
  const call = state.calls[k];
  if (!call) {
    state.issues.push({ case: 'replyWithoutCall', span: e.span, values: { from: e.from, to: e.to } });
    return;
  }
  close(state, call.bar, index);
  state.answered.add(call.index);
  state.calls = state.calls.slice(0, k);
}

function event(state: State, index: number, e: SequenceEvent): void {
  if (e.type === 'message') message(state, index, e);
  else if (e.type === 'activate') {
    const bar: SeqActivation = { lifeline: e.target, from: index, to: OPEN, level: 0, cause: 'explicit' };
    state.bars.push(bar);
    state.explicit.set(e.target, [...(state.explicit.get(e.target) ?? []), bar]);
  } else if (e.type === 'deactivate') {
    const open = state.explicit.get(e.target) ?? [];
    const bar = open.at(-1);
    state.explicit.set(e.target, open.slice(0, -1));
    if (bar) close(state, bar, index);
    else state.issues.push({ case: 'deactivateWithoutActivate', span: e.span, values: { target: e.target } });
  } else if (e.type === 'destroy') {
    for (const bar of state.bars)
      if (bar.lifeline === e.target && bar.to === OPEN && bar.cause !== 'create') bar.to = index;
    state.calls = state.calls.filter((c) => c.callee !== e.target);
    state.explicit.delete(e.target);
  }
}

/** What is open after an `alt`: whatever stayed open in any branch, in the original order. */
function union(states: readonly (readonly Call[])[]): Call[] {
  const all = new Set(states.flat());
  return [...all].sort((p, q) => p.index - q.index);
}

/**
 * `alt`: every operand starts from the state before the fragment; afterwards open is what stayed open in a
 * branch. `break` and `neg` (an invalid trace) leave the state after them untouched; other fragments run in
 * sequence.
 */
function walk(state: State, items: readonly SeqItem[]): void {
  for (const item of items) {
    if (item.kind === 'event') {
      event(state, item.index, state.events[item.index] ?? item.event);
      continue;
    }
    const before = state.calls;
    const explicit = new Map(state.explicit);
    const ends: (readonly Call[])[] = [];
    for (const operand of item.operands) {
      if (item.event.operator === 'alt') {
        state.calls = [...before];
        state.explicit = new Map(explicit);
      }
      const outer = state.branch;
      if (operand.marker === 'else') state.branch = operand.index;
      walk(state, operand.items);
      state.branch = outer;
      ends.push(state.calls);
    }
    if (item.event.operator === 'alt') state.calls = union(ends);
    if (item.event.operator === 'break' || item.event.operator === 'neg') {
      state.calls = before;
      state.explicit = new Map(explicit);
    }
  }
}

export interface Activations {
  readonly bars: readonly SeqActivation[];
  readonly answered: ReadonlySet<number>;
  readonly issues: readonly SeqIssue[];
}

/** Bars that are still open at the end of the walk: explicit ones run to the end, calls end implicitly. */
function closeOpen(state: State, events: readonly SequenceEvent[]): void {
  for (const bar of state.bars) {
    if (bar.to !== OPEN) continue;
    if (bar.cause === 'explicit') {
      const e = events[bar.from];
      bar.to = Math.max(bar.from, events.length - 1);
      if (e) state.issues.push({ case: 'openActivation', span: e.span, values: { lifeline: bar.lifeline } });
    } else if (bar.cause === 'self') bar.to = bar.from;
    else if (bar.cause === 'call') {
      const call = events[bar.from];
      bar.to = closeUnanswered(bar, call?.type === 'message' ? call.from : undefined, events);
    }
  }
}

/** Activation bars from calls and replies plus `activate`/`deactivate`; their level from containment. */
export function activations(
  root: readonly SeqItem[],
  events: readonly SequenceEvent[],
  gates: ReadonlyMap<number, SeqGate>,
): Activations {
  const state: State = {
    calls: [],
    explicit: new Map(),
    bars: [],
    answered: new Set(),
    issues: [],
    branch: undefined,
    events,
    gates,
  };
  walk(state, root);
  closeOpen(state, events);
  for (const bar of state.bars)
    if (bar.cause === 'self' && bar.to === bar.from) extendSelfCall(bar, state.bars, events);
  state.bars.forEach((bar, k) => {
    bar.level = state.bars.filter(
      (other, j) =>
        other !== bar &&
        other.lifeline === bar.lifeline &&
        other.from <= bar.from &&
        other.to >= bar.from &&
        (other.from < bar.from || j < k),
    ).length;
  });
  return { bars: state.bars.filter((b) => b.to !== OPEN), answered: state.answered, issues: state.issues };
}
