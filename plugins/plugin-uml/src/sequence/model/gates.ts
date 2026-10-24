import { GATE, type SequenceDiagram, type SequenceEvent } from '../diagram.js';

/**
 * One end of a message on a frame (gate, UML 2.5.1, 17.4.3.5): `gate` is the frame `sd` of the interaction, the
 * `id` of a reference or fragment is its edge; `.name` after it names the gate.
 */
export interface SeqGate {
  readonly end: 'from' | 'to';
  /** Reference or fragment with this `id`; missing for the frame `sd`. */
  readonly frame: string | undefined;
  readonly name: string | undefined;
}

type Where = Omit<SeqGate, 'end'>;

/** Frames with a name: `id=` on references and fragments, with the index of their event; the first one wins. */
export function frameIds(events: readonly SequenceEvent[]): Map<string, number> {
  const out = new Map<string, number>();
  events.forEach((e, i) => {
    if ((e.type === 'ref' || e.type === 'fragment') && e.id && !out.has(e.id)) out.set(e.id, i);
  });
  return out;
}

/** The gate of a message end; a declared lifeline always wins. */
export function gateEnd(
  id: string,
  participants: ReadonlyMap<string, unknown>,
  frames: ReadonlyMap<string, number>,
): Where | undefined {
  if (participants.has(id)) return undefined;
  const dot = id.indexOf('.');
  const head = dot < 0 ? id : id.slice(0, dot);
  const name = dot < 0 ? undefined : id.slice(dot + 1) || undefined;
  if (head === GATE) return { frame: undefined, name };
  return frames.has(head) ? { frame: head, name } : undefined;
}

export interface Gates {
  /** For each message its end on a frame; when both ends are on one, the receiver counts (rules `frameGate`, `frameEdgeGate`). */
  readonly byMessage: ReadonlyMap<number, SeqGate>;
  /** All message ends that are gates; they are no lifelines. */
  readonly ids: ReadonlySet<string>;
  /** Events with the frame instead of the gate name, so a call and its reply pair up over different gates. */
  readonly events: readonly SequenceEvent[];
}

const key = (g: Where | undefined, raw: string) => (g ? (g.frame ?? GATE) : raw);

export function resolveGates(d: SequenceDiagram, participants: ReadonlyMap<string, unknown>): Gates {
  const frames = frameIds(d.events);
  const byMessage = new Map<number, SeqGate>();
  const ids = new Set<string>();
  const events = d.events.map((e, i): SequenceEvent => {
    if (e.type !== 'message') return e;
    const [from, to] = [gateEnd(e.from, participants, frames), gateEnd(e.to, participants, frames)];
    if (from) ids.add(e.from);
    if (to) ids.add(e.to);
    const gate = to ? { end: 'to' as const, ...to } : from ? { end: 'from' as const, ...from } : undefined;
    if (gate) byMessage.set(i, gate);
    return from || to ? { ...e, from: key(from, e.from), to: key(to, e.to) } : e;
  });
  return { byMessage, ids, events };
}
