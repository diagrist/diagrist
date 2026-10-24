import type { Finding } from '@diagrist/core';
import { implementing } from '../../spec/catalog.js';
import { STATE_MACHINES as S } from '../../spec/state-machines.js';
import { events } from '../source.js';
import { defineRule, transitionText, vertexValues } from './shared.js';

const EVENT = /^(after|when)\b/i;

/** What is wrong with the spelling of a time or change event; undefined when it is right or no such event. */
function eventError(trigger: string): { word: string; problem: string } | undefined {
  const m = EVENT.exec(trigger);
  if (!m) return undefined;
  const word = (m[1] ?? '').toLowerCase();
  const rest = trigger.slice(m[0].length).trim();
  if (!rest.startsWith('(') || !rest.endsWith(')')) return { word, problem: 'parentheses' };
  return rest.slice(1, -1).trim() ? undefined : { word, problem: 'empty' };
}

export const timeChangeEvent = implementing(
  { uml: [S.timeEvent, S.changeEvent] },
  defineRule(
    'U462',
    'error',
    'A time event `after(duration)` and a change event `when(condition)` are triggers: they stand in `on=` with parentheses. In the guard `when=` they would be a condition, not an event.',
    (m) =>
      [...m.diagram.transitions, ...m.diagram.internals].flatMap((t): Finding[] => {
        const where = 'from' in t ? transitionText(t) : `internal ${t.state}`;
        const spelled = events(t.on).flatMap((trigger): Finding[] => {
          const error = eventError(trigger);
          return error ? [{ span: t.span, values: { case: error.problem, where, word: error.word, trigger } }] : [];
        });
        const guard = t.when?.trim();
        const asGuard =
          guard && /^(after|when)\s*\(/i.test(guard)
            ? [{ span: t.span, values: { case: 'guard', where, trigger: guard } }]
            : [];
        return [...spelled, ...asGuard];
      }),
  ),
);

export const protocol = implementing(
  { uml: [S.protocolStateMachine, S.protocolTransition] },
  defineRule(
    'U463',
    'error',
    'A protocol state machine (`{protocol}` in the title) says which calls are allowed in which order. Its states have no entry, do or exit behaviour, its transitions no effect, and it has no history.',
    (m) => {
      if (!m.diagram.protocol) return [];
      const states = m.diagram.vertices.flatMap((v): Finding[] => [
        ...(v.entry || v.do || v.exit
          ? [{ span: v.span, values: { case: 'behaviour', ...vertexValues(m, v.id) } }]
          : []),
        ...(v.kind === 'history' ? [{ span: v.span, values: { case: 'history', ...vertexValues(m, v.id) } }] : []),
      ]);
      const effects = [...m.diagram.transitions, ...m.diagram.internals].flatMap((t): Finding[] =>
        t.do
          ? [
              {
                span: t.span,
                values: {
                  case: 'effect',
                  where: 'from' in t ? transitionText(t) : `internal ${t.state}`,
                  effect: t.do,
                },
              },
            ]
          : [],
      );
      return [...states, ...effects];
    },
  ),
);

export const postcondition = implementing(
  { uml: [S.protocolTransition] },
  defineRule('U464', 'error', 'Only the transition of a protocol state machine has a postcondition `post=`.', (m) =>
    m.diagram.protocol
      ? []
      : m.diagram.transitions.flatMap((t): Finding[] =>
          t.post ? [{ span: t.span, values: { transition: transitionText(t) } }] : [],
        ),
  ),
);
