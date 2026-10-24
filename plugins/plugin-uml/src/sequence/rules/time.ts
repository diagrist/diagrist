import type { Finding } from '@diagrist/core';
import { implementing } from '../../spec/catalog.js';
import { INTERACTIONS } from '../../spec/interactions.js';
import { defineRule, messageIds } from './shared.js';

export const durationOrder = implementing(
  { uml: [INTERACTIONS.durationConstraint] },
  defineRule(
    'U906',
    'warning',
    'A duration runs from the earlier to the later message; swapped, Diagrist still draws it.',
    (m) => {
      const ids = messageIds(m.diagram.events);
      return m.diagram.constraints.flatMap((c): Finding[] => {
        if (c.type !== 'duration') return [];
        const [a, b] = [ids.get(c.from), ids.get(c.to)];
        if (a === undefined || b === undefined || a < b) return [];
        return [{ span: c.span, values: { from: c.from, to: c.to, case: a === b ? 'same' : 'reversed' } }];
      });
    },
  ),
);

export const durationNotDrawn = implementing(
  { uml: [INTERACTIONS.durationConstraint] },
  defineRule(
    'U908',
    'warning',
    '`duration=` slopes the arrow. A self call is a loop and a creation ends at the head at its height: there the arrow stays level and the duration is missing from the picture.',
    (m) =>
      m.diagram.events.flatMap((e): Finding[] =>
        e.type === 'message' && e.duration && (e.from === e.to || e.kind === 'create')
          ? [{ span: e.span, values: { duration: e.duration, case: e.kind === 'create' ? 'create' : 'self' } }]
          : [],
      ),
  ),
);
