import type { Finding } from '@diagrist/core';
import { FOUND, LOST, type MessageEvent, type SequenceEvent } from '../diagram.js';
import { besideRef, refSpan } from '../model/ref-run.js';
import type { SequenceModel } from '../model/types.js';
import { defineRule, isFrameGate } from './shared.js';

const RESERVED: readonly string[] = [LOST, FOUND];

/** A frame name that collides with a lifeline, a reserved word or another frame. */
function nameCase(e: SequenceEvent, i: number, m: SequenceModel): string | undefined {
  if ((e.type !== 'ref' && e.type !== 'fragment') || !e.id) return undefined;
  if (m.participants.has(e.id)) return 'lifeline';
  if (isFrameGate(e.id) || RESERVED.includes(e.id)) return 'reserved';
  return m.frameIds.get(e.id) === i ? undefined : 'twice';
}

/** What is wrong with a message at a reference or fragment, if anything. */
function gateCase(e: MessageEvent, i: number, m: SequenceModel): string | undefined {
  const g = m.gates.get(i);
  if (g?.frame === undefined) return undefined;
  if (m.gateIds.has(e.from) && m.gateIds.has(e.to)) return 'frameToFrame';
  if ([e.from, e.to].some((id) => RESERVED.includes(id))) return 'openEnd';
  if (e.kind === 'create') return 'create';
  const at = m.frameIds.get(g.frame) ?? -1;
  const owner = m.diagram.events[at];
  if (owner?.type === 'fragment') {
    const f = m.fragments.find((x) => x.index === at);
    const inside = f !== undefined && i > f.index && i < (f.end ?? m.diagram.events.length);
    return inside ? undefined : 'outsideFragment';
  }
  if (owner?.type !== 'ref') return undefined;
  const [a, b] = refSpan(owner.over, m.order);
  const parts = { events: m.diagram.events, gates: m.gates, order: m.order };
  for (let k = at + 1; k < i; k++)
    if (m.gates.get(k)?.frame !== g.frame && !besideRef(k, a, b, parts)) return 'crossed';
  const lifeline = m.order.indexOf(g.end === 'to' ? e.from : e.to);
  return lifeline >= a && lifeline <= b ? 'covered' : undefined;
}

export const frameEdgeGate = defineRule(
  'U454',
  'error',
  'A gate links a message with the edge of a reference (actual gate) or a fragment (formal gate), UML 2.5.1, 17.3. At a reference the message comes from a lifeline outside it and follows it, with only events beside it in between; at a fragment it stands inside. The frame name is its own.',
  (m) =>
    m.diagram.events.flatMap((e, i): Finding[] => {
      const named = nameCase(e, i, m);
      const id = e.type === 'ref' || e.type === 'fragment' ? (e.id ?? '') : '';
      const gate = e.type === 'message' ? gateCase(e, i, m) : undefined;
      const frame = m.gates.get(i)?.frame ?? '';
      return [
        ...(named ? [{ span: e.span, values: { case: named, frame: id } }] : []),
        ...(gate ? [{ span: e.span, values: { case: gate, frame } }] : []),
      ];
    }),
);

export const frameWithoutGate = defineRule(
  'U950',
  'warning',
  '`id=` on a reference or fragment only serves gates; without a message at its edge it has no effect.',
  (m) => {
    const used = new Set([...m.gates.values()].map((g) => g.frame));
    return [...m.frameIds].flatMap(([id, index]): Finding[] => {
      const e = m.diagram.events[index];
      return !used.has(id) && e ? [{ span: e.span, values: { frame: id } }] : [];
    });
  },
);

export const gateUsedTwice = defineRule(
  'U951',
  'warning',
  'A gate is a point on the frame with one message per side (UML 2.5.1, 17.3); two messages through the same named gate in the same direction leave open which one is meant.',
  (m) => {
    const seen = new Set<string>();
    const out: Finding[] = [];
    for (const [i, g] of m.gates) {
      if (!g.name) continue;
      const key = `${g.frame ?? ''}\u0000${g.name}\u0000${g.end}`;
      const e = m.diagram.events[i];
      if (seen.has(key) && e) out.push({ span: e.span, values: { gate: g.name, frame: g.frame ?? '', end: g.end } });
      seen.add(key);
    }
    return out;
  },
);
