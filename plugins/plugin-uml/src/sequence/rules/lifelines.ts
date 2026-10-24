import type { Finding } from '@diagrist/core';
import { FOUND, LOST, type MessageEvent } from '../diagram.js';
import { defineRule, isFrameGate, names, referencedLifelines } from './shared.js';

const RESERVED: readonly string[] = [LOST, FOUND];

export const unknownLifeline = defineRule(
  'U400',
  'error',
  'Message ends and `over=` lists name declared lifelines. `lang` checks the other references; these can also be gates, so the plugin checks them.',
  (m) => {
    const known = [...m.participants.keys()];
    return m.diagram.events.flatMap((e) =>
      e.type === 'message' || e.type === 'note' || e.type === 'ref'
        ? referencedLifelines(e, m.gateIds)
            .filter((id) => !m.participants.has(id))
            .map((found) => ({ span: e.span, values: { found, known: names(known) } }))
        : [],
    );
  },
);

export const missingLifeline = defineRule(
  'U452',
  'error',
  'A note and a reference need `over=`, a state invariant needs `on=`: they stand on lifelines (UML 2.5.1, 17.2.4).',
  (m) =>
    m.diagram.events.flatMap((e): Finding[] => {
      if ((e.type === 'note' || e.type === 'ref') && e.over.length === 0)
        return [{ span: e.span, values: { statement: e.type, attribute: 'over=' } }];
      if (e.type === 'invariant' && !e.on) return [{ span: e.span, values: { statement: e.type, attribute: 'on=' } }];
      return [];
    }),
);

export const lifecycle = defineRule(
  'U404',
  'error',
  'Before its creation and after its destruction a lifeline does not exist; each happens at most once (UML 2.5.1, 17.3).',
  (m) => {
    const out: Finding[] = [];
    const created = new Map<string, number>();
    const destroyed = new Map<string, number>();
    const events = m.diagram.events;
    events.forEach((e, i) => {
      const create = e.type === 'message' && e.kind === 'create';
      if (e.type !== 'destroy' && !create) return;
      const map = create ? created : destroyed;
      const lifeline = e.type === 'destroy' ? e.target : e.type === 'message' ? e.to : '';
      if (map.has(lifeline))
        out.push({ span: e.span, values: { lifeline, case: create ? 'createdTwice' : 'destroyedTwice' } });
      else map.set(lifeline, i);
    });
    events.forEach((e, i) => {
      for (const lifeline of referencedLifelines(e)) {
        const born = created.get(lifeline);
        const dead = destroyed.get(lifeline);
        if (born !== undefined && i < born) out.push({ span: e.span, values: { lifeline, case: 'beforeCreate' } });
        if (dead !== undefined && i > dead) out.push({ span: e.span, values: { lifeline, case: 'afterDestroy' } });
      }
    });
    return out;
  },
);

function lostFoundCase(e: MessageEvent): string | undefined {
  if (e.from === LOST) return 'lostSends';
  if (e.to === FOUND) return 'foundReceives';
  if (e.from === FOUND && e.to === LOST) return 'both';
  if ((e.from === FOUND || e.to === LOST) && (e.kind === 'reply' || e.kind === 'create')) return e.kind;
  return undefined;
}

export const lostFound = defineRule(
  'U408',
  'error',
  'A lost message has no receiver, a found one no sender (UML 2.5.1, 17.4.3): `lost` only on the right, `found` only on the left, both only on a call or asynchronous message, and neither as a lifeline id.',
  (m) => [
    ...m.diagram.participants
      .filter((p) => RESERVED.includes(p.id))
      .map((p) => ({ span: p.span, values: { id: p.id, case: 'reserved' } })),
    ...m.diagram.events.flatMap((e): Finding[] => {
      const found = e.type === 'message' ? lostFoundCase(e) : undefined;
      return found ? [{ span: e.span, values: { case: found } }] : [];
    }),
  ],
);

function gateCase(e: MessageEvent): string | undefined {
  if (!isFrameGate(e.from) && !isFrameGate(e.to)) return undefined;
  if (isFrameGate(e.from) && isFrameGate(e.to)) return 'bothEnds';
  if ([e.from, e.to].some((id) => RESERVED.includes(id))) return 'openEnd';
  return e.kind === 'create' ? 'create' : undefined;
}

export const frameGate = defineRule(
  'U450',
  'error',
  'A gate links a message with the frame of the interaction (UML 2.5.1, 17.3): `gate` is no lifeline id and stands at one end of a message only, never with `lost`, `found` or a creation.',
  (m) => [
    ...m.diagram.participants
      .filter((p) => isFrameGate(p.id))
      .map((p) => ({ span: p.span, values: { id: p.id, case: 'reserved' } })),
    ...m.diagram.events.flatMap((e): Finding[] => {
      const found = e.type === 'message' ? gateCase(e) : undefined;
      return found ? [{ span: e.span, values: { case: found } }] : [];
    }),
  ],
);

export const unusedLifeline = defineRule(
  'U902',
  'warning',
  'A lifeline no message, note or reference touches says nothing; remove it or add what it does.',
  (m) => {
    const used = new Set(m.diagram.events.flatMap((e) => referencedLifelines(e, m.gateIds)));
    return m.diagram.participants
      .filter((p) => m.participants.get(p.id) === p && !used.has(p.id))
      .map((p) => ({ span: p.span, values: { id: p.id, label: p.label } }));
  },
);
