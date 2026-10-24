import type { Finding } from '@diagrist/core';
import { implementing } from '../../spec/catalog.js';
import { STATE_MACHINES as S } from '../../spec/state-machines.js';
import { isPseudo } from '../model.js';
import { defineRule, transitionText, vertexValues } from './shared.js';

export const transitionEnds = implementing(
  { uml: [S.finalState, S.initial, S.terminate] },
  defineRule(
    'U440',
    'error',
    'No transition leaves a final state or a terminate pseudostate, and none enters an initial pseudostate: it is an entry only.',
    (m) =>
      m.diagram.transitions.flatMap((t): Finding[] => {
        const from = m.kind(t.from);
        return [
          ...(from === 'final' || from === 'terminate'
            ? [{ span: t.span, values: { case: 'from', ...vertexValues(m, t.from) } }]
            : []),
          ...(m.kind(t.to) === 'initial' ? [{ span: t.span, values: { case: 'to', ...vertexValues(m, t.to) } }] : []),
        ];
      }),
  ),
);

export const pseudostateDegree = implementing(
  { uml: [S.initial, S.history, S.fork, S.join, S.choice, S.junction] },
  defineRule(
    'U441',
    'error',
    'Each pseudostate has its number of ways in and out: initial and history at most one out, a fork one in and at least two out, a join at least two in and one out, choice and junction at least one each.',
    (m) =>
      m.diagram.vertices.flatMap((v): Finding[] => {
        const ins = m.into(v.id).length;
        const outs = m.out(v.id).filter((t) => t.to !== v.id).length;
        const bad =
          v.kind === 'initial' || v.kind === 'history'
            ? outs > 1
            : v.kind === 'fork'
              ? ins !== 1 || outs < 2
              : v.kind === 'join'
                ? ins < 2 || outs !== 1
                : (v.kind === 'choice' || v.kind === 'junction') && (ins < 1 || outs < 1);
        return bad
          ? [{ span: v.span, values: { ...vertexValues(m, v.id), ins: String(ins), outs: String(outs) } }]
          : [];
      }),
  ),
);

export const triggerNotAllowed = implementing(
  { uml: [S.transition] },
  defineRule(
    'U442',
    'error',
    'The transition from an initial pseudostate and the branches of fork and join have neither trigger nor guard; transitions leaving other pseudostates have no trigger.',
    (m) =>
      m.diagram.transitions.flatMap((t): Finding[] => {
        const from = m.kind(t.from);
        const transition = transitionText(t);
        if (from === 'initial' && (t.on || t.when)) return [{ span: t.span, values: { case: 'initial', transition } }];
        if ((from === 'fork' || m.kind(t.to) === 'join') && (t.on || t.when))
          return [{ span: t.span, values: { case: 'branch', transition } }];
        return isPseudo(from) && t.on ? [{ span: t.span, values: { case: 'pseudo', transition } }] : [];
      }),
  ),
);

export const oneInitial = implementing(
  { uml: [S.initial, S.history] },
  defineRule(
    'U443',
    'error',
    'A region, the top level included, has at most one initial pseudostate, one shallow and one deep history.',
    (m) => {
      const seen = new Map<string, string>();
      return m.diagram.vertices.flatMap((v): Finding[] => {
        if (v.kind !== 'initial' && v.kind !== 'history') return [];
        const key = `${v.parent ?? ''}:${v.kind}:${v.deep}`;
        const first = seen.get(key);
        if (first === undefined) seen.set(key, v.id);
        return first === undefined ? [] : [{ span: v.span, values: { ...vertexValues(m, v.id), first } }];
      });
    },
  ),
);

export const historyPlacement = implementing(
  { uml: [S.history] },
  defineRule(
    'U444',
    'error',
    'A history pseudostate remembers the active substate of a composite state, so it lies in one.',
    (m) =>
      m.diagram.vertices.flatMap((v): Finding[] =>
        v.kind === 'history' && !(v.parent && m.vertices.has(v.parent))
          ? [{ span: v.span, values: vertexValues(m, v.id) }]
          : [],
      ),
  ),
);

export const forkJoinBranch = implementing(
  { uml: [S.fork, S.join] },
  defineRule('U446', 'error', 'The branches of a fork end at states, the branches of a join start at states.', (m) =>
    m.diagram.transitions.flatMap((t): Finding[] => {
      const [from, to] = [m.kind(t.from), m.kind(t.to)];
      const transition = transitionText(t);
      return [
        ...(from === 'fork' && to !== undefined && to !== 'state'
          ? [{ span: t.span, values: { case: 'fork', transition, ...vertexValues(m, t.to) } }]
          : []),
        ...(to === 'join' && from !== undefined && from !== 'state'
          ? [{ span: t.span, values: { case: 'join', transition, ...vertexValues(m, t.from) } }]
          : []),
      ];
    }),
  ),
);

export const elseTwice = implementing(
  { uml: [S.elseGuard] },
  defineRule(
    'U447',
    'error',
    'The else branch applies when no other guard holds; two of them at one vertex contradict each other.',
    (m) =>
      m.diagram.vertices.flatMap((v): Finding[] => {
        const elses = m.out(v.id).filter((t) => t.when === 'else');
        const second = elses[1];
        return second ? [{ span: second.span, values: { ...vertexValues(m, v.id), count: String(elses.length) } }] : [];
      }),
  ),
);
