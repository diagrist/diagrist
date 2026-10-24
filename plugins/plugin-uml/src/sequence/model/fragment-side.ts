import type { SequenceEvent } from '../diagram.js';
import type { SequenceModel } from './types.js';

/** Lifelines an event touches. */
function touched(e: SequenceEvent): readonly string[] {
  switch (e.type) {
    case 'message':
      return [e.from, e.to];
    case 'activate':
    case 'deactivate':
    case 'destroy':
      return [e.target];
    case 'note':
    case 'ref':
      return e.over;
    case 'invariant':
      return e.on === undefined ? [] : [e.on];
    case 'coregion':
      return [e.on];
    default:
      return [];
  }
}

/**
 * Side of a gate on a fragment (UML 2.5.1, 17.4.3.5): the side of the frame nearer to the message's
 * lifeline, counted in lifelines up to the outermost one in the fragment. Missing when the message has no gate
 * on a fragment or both sides are equally far; then the rule of the frame `sd` applies.
 */
export function fragmentGateSide(m: SequenceModel, i: number): 'left' | 'right' | undefined {
  const g = m.gates.get(i);
  const e = m.diagram.events[i];
  if (g?.frame === undefined || e?.type !== 'message') return undefined;
  const f = m.fragments.find((x) => x.event.id === g.frame);
  if (!f) return undefined;
  const end = f.end ?? m.diagram.events.length;
  const ks = m.diagram.events
    .slice(f.index + 1, end)
    .flatMap(touched)
    .map((id) => m.order.indexOf(id))
    .filter((k) => k >= 0);
  const k = m.order.indexOf(g.end === 'to' ? e.from : e.to);
  if (k < 0 || ks.length === 0) return undefined;
  const [left, right] = [k - Math.min(...ks), Math.max(...ks) - k];
  return left === right ? undefined : left < right ? 'left' : 'right';
}
