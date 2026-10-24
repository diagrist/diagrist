import type { Finding } from '@diagrist/core';
import { implementing } from '../../spec/catalog.js';
import { STATE_MACHINES as S } from '../../spec/state-machines.js';
import { events } from '../source.js';
import { defineRule, transitionText, vertexValues } from './shared.js';

export const choiceComplete = implementing(
  { uml: [S.choice, S.elseGuard] },
  defineRule(
    'U943',
    'warning',
    'Every way out of a choice has a guard and one of them is `else`, so the machine never gets stuck there; `else` belongs to a choice or junction.',
    (m) =>
      m.diagram.vertices.flatMap((v): Finding[] => {
        const outs = m.out(v.id);
        if (v.kind === 'choice') {
          if (outs.some((t) => !t.when)) return [{ span: v.span, values: { case: 'guard', ...vertexValues(m, v.id) } }];
          return outs.length && !outs.some((t) => t.when === 'else')
            ? [{ span: v.span, values: { case: 'else', ...vertexValues(m, v.id) } }]
            : [];
        }
        if (v.kind === 'junction') return [];
        return outs
          .filter((t) => t.when === 'else')
          .map((t) => ({
            span: t.span,
            values: { case: 'misplaced', transition: transitionText(t), ...vertexValues(m, v.id) },
          }));
      }),
  ),
);

export const nondeterministic = implementing(
  { uml: [S.transition] },
  defineRule(
    'U944',
    'warning',
    'Two ways out of a state on the same trigger need guards that tell them apart; otherwise the machine is not deterministic.',
    (m) =>
      m.diagram.vertices.flatMap((v) => {
        if (v.kind !== 'state') return [];
        const seen = new Map<string, string | undefined>();
        return m.out(v.id).flatMap((t): Finding[] => {
          const key = events(t.on).sort().join(',');
          if (!key) return [];
          const before = seen.get(key);
          const clash = seen.has(key) && (!t.when || !before || before === t.when);
          seen.set(key, t.when);
          return clash ? [{ span: t.span, values: { ...vertexValues(m, v.id), on: t.on ?? '' } }] : [];
        });
      }),
  ),
);

export const selfTransitionBehaviour = implementing(
  { uml: [S.internalTransition, S.stateBehavior] },
  defineRule(
    'U945',
    'warning',
    'A transition of a state to itself leaves and enters it again and runs its exit and entry behaviour; an internal transition does not.',
    (m) =>
      m.diagram.transitions.flatMap((t): Finding[] => {
        const v = m.vertices.get(t.from);
        return t.from === t.to && v && (v.entry || v.exit)
          ? [{ span: t.span, values: { ...vertexValues(m, v.id), id: v.id } }]
          : [];
      }),
  ),
);

export const forkWithoutJoin = implementing(
  { uml: [S.fork, S.join] },
  defineRule('U947', 'warning', 'What a fork splits, a join usually brings together again.', (m) =>
    m.diagram.vertices.some((v) => v.kind === 'join')
      ? []
      : m.diagram.vertices.flatMap((v): Finding[] =>
          v.kind === 'fork' ? [{ span: v.span, values: vertexValues(m, v.id) }] : [],
        ),
  ),
);

export const deferOverridden = implementing(
  { uml: [S.deferredEvent] },
  defineRule(
    'U960',
    'warning',
    'A state that defers an event and fires a transition on it in the same state: the transition wins and the deferral says nothing.',
    (m) =>
      m.diagram.vertices.flatMap((v) => {
        const own = [...m.out(v.id), ...m.diagram.internals.filter((i) => i.state === v.id)];
        return v.defer.flatMap((e): Finding[] =>
          own.some((t) => events(t.on).includes(e))
            ? [{ span: v.span, values: { ...vertexValues(m, v.id), event: e } }]
            : [],
        );
      }),
  ),
);

export const deferNeverConsumed = implementing(
  { uml: [S.deferredEvent] },
  defineRule(
    'U961',
    'warning',
    'A deferred event waits for a later state that fires a transition on it; without one it waits forever.',
    (m) => {
      const used = new Set([...m.diagram.transitions, ...m.diagram.internals].flatMap((t) => events(t.on)));
      return m.diagram.vertices.flatMap((v) =>
        v.defer.flatMap((e): Finding[] =>
          used.has(e) ? [] : [{ span: v.span, values: { ...vertexValues(m, v.id), event: e } }],
        ),
      );
    },
  ),
);
