import type { Finding } from '@diagrist/core';
import { implementing } from '../../spec/catalog.js';
import { INTERACTIONS } from '../../spec/interactions.js';
import { FOUND, LOST } from '../diagram.js';
import { defineRule, issues } from './shared.js';

export const replyWithoutCall = implementing(
  { uml: [INTERACTIONS.reply, INTERACTIONS.synchronousCall] },
  defineRule(
    'U403',
    'error',
    'A reply `-->` answers an open synchronous call in the opposite direction; the model pairs them innermost first.',
    (m) => issues(m, 'replyWithoutCall'),
  ),
);

export const deactivateWithoutActivate = implementing(
  { uml: [INTERACTIONS.executionSpecification] },
  defineRule('U405', 'error', '`deactivate` ends a bar that `activate` started on the same lifeline.', (m) =>
    issues(m, 'deactivateWithoutActivate'),
  ),
);

export const callWithoutReply = implementing(
  { uml: [INTERACTIONS.synchronousCall, INTERACTIONS.reply] },
  defineRule(
    'U901',
    'warning',
    'UML allows leaving out the reply; it is still named. Exempt are self calls and calls made while the caller handles a call it answers later: that reply implies the inner call returned. Lost and found messages are U907.',
    (m) =>
      m.diagram.events.flatMap((e, i): Finding[] => {
        if (e.type !== 'message' || e.kind !== 'sync' || e.from === e.to || m.answered.has(i)) return [];
        if (e.to === LOST || e.from === FOUND) return [];
        const outer = m.activations.some(
          (b) => b.lifeline === e.from && b.cause === 'call' && b.from < i && b.to > i && m.answered.has(b.from),
        );
        return outer ? [] : [{ span: e.span, values: { from: e.from, to: e.to, label: e.label ?? '' } }];
      }),
  ),
);

export const openActivation = implementing(
  { uml: [INTERACTIONS.executionSpecification] },
  defineRule('U905', 'warning', '`activate` without `deactivate`: the bar reaches to the end of the diagram.', (m) =>
    issues(m, 'openActivation'),
  ),
);

export const lostFoundCall = implementing(
  { uml: [INTERACTIONS.lostMessage, INTERACTIONS.foundMessage, INTERACTIONS.synchronousCall] },
  defineRule(
    'U907',
    'warning',
    'No reply can follow a lost or found message, so as a synchronous call it would wait forever; use `~>`.',
    (m) =>
      m.diagram.events.flatMap((e): Finding[] =>
        e.type === 'message' && e.kind === 'sync' && (e.to === LOST || e.from === FOUND)
          ? [{ span: e.span, values: { case: e.to === LOST ? 'lost' : 'found' } }]
          : [],
      ),
  ),
);
