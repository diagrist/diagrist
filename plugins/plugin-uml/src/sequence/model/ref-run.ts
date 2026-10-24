import { FOUND, LOST, type SequenceEvent } from '../diagram.js';
import type { SeqGate } from './gates.js';

/**
 * Actual gates on a reference (UML 2.5.1, 17.3) that do not follow it directly: the reference reaches down to
 * the last message on its edge. Only events beside it may stand in between, touching none of its lifelines
 * and not crossing it; frames, dividers and references end the run.
 */
export interface RefParts {
  readonly events: readonly SequenceEvent[];
  readonly gates: ReadonlyMap<number, SeqGate>;
  readonly order: readonly string[];
}

/** Columns from left to right an event covers; a gate on the frame `sd` lies left or right of all. */
function spanOf(e: SequenceEvent, j: number, p: RefParts): [number, number] | undefined {
  const at = (id: string) => p.order.indexOf(id);
  switch (e.type) {
    case 'message': {
      const g = p.gates.get(j);
      if (g?.frame !== undefined) return undefined;
      const left = g && (g.end === 'from' || e.kind === 'reply');
      const gate = left ? -1 : p.order.length;
      const from = e.from === FOUND ? at(e.to) - 0.5 : g?.end === 'from' ? gate : at(e.from);
      const to = e.to === LOST || e.from === e.to ? at(e.from) + 0.5 : g?.end === 'to' ? gate : at(e.to);
      return [Math.min(from, to), Math.max(from, to)];
    }
    case 'activate':
    case 'deactivate':
    case 'destroy':
      return [at(e.target), at(e.target)];
    case 'invariant':
      return e.on === undefined ? undefined : [at(e.on), at(e.on)];
    case 'note': {
      const ks = e.over.map(at);
      return [Math.min(...ks), Math.max(...ks)];
    }
    default:
      return undefined;
  }
}

/** Whether event `j` lies beside the reference over the columns `a..b`. */
export function besideRef(j: number, a: number, b: number, p: RefParts): boolean {
  const e = p.events[j];
  const span = e ? spanOf(e, j, p) : undefined;
  return span !== undefined && span[0] >= 0 && (span[1] < a || span[0] > b);
}

/** Columns below a reference, from left to right. */
export function refSpan(over: readonly string[], order: readonly string[]): [number, number] {
  const ks = over.map((id) => order.indexOf(id)).filter((k) => k >= 0);
  return [Math.min(...ks), Math.max(...ks)];
}

/**
 * The last message on the edge of reference `k` named `id`, as long as everything in between lies beside it;
 * missing when no message starts or ends at it.
 */
export function refRunEnd(k: number, id: string, over: readonly string[], p: RefParts): number | undefined {
  const [a, b] = refSpan(over, p.order);
  let last: number | undefined;
  for (let j = k + 1; j < p.events.length; j++) {
    if (p.gates.get(j)?.frame === id) last = j;
    else if (!besideRef(j, a, b, p)) break;
  }
  return last;
}
