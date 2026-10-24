import type { Finding } from '@diagrist/core';
import { ACTIVITIES } from '../../spec/activities.js';
import { implementing } from '../../spec/catalog.js';
import type { Flow } from '../diagram.js';
import { at, defineRule, guardText, inputs, joinedFrom, named, nodesOf, written } from './shared.js';

export const activityEnds = implementing(
  { uml: [ACTIVITIES.initialNode, ACTIVITIES.activityFinal, ACTIVITIES.flowFinal] },
  defineRule(
    'U430',
    'error',
    'An initial node has no incoming edge, an activity final and a flow final node have no outgoing one.',
    (m) => [
      ...nodesOf(m, 'initial')
        .filter((n) => inputs(m, n.id).length > 0)
        .map((n) => at(n.span, { ...named(n, m), case: 'incoming' })),
      ...nodesOf(m, 'final', 'flowfinal')
        .filter((n) => m.outs(n.id).length > 0)
        .map((n) => at(n.span, { ...named(n, m), case: 'outgoing' })),
    ],
  ),
);

export const decisionInputs = implementing(
  { uml: [ACTIVITIES.decision] },
  defineRule(
    'U431',
    'error',
    'A decision has one incoming edge; bringing flows together is the job of a merge in front of it.',
    (m) =>
      nodesOf(m, 'decision')
        .filter((n) => inputs(m, n.id).length > 1)
        .map((n) => at(n.span, { ...named(n, m), count: String(inputs(m, n.id).length), id: n.id })),
  ),
);

export const controlArity = implementing(
  { uml: [ACTIVITIES.merge, ACTIVITIES.join, ACTIVITIES.fork] },
  defineRule(
    'U432',
    'error',
    'A merge and a join have exactly one outgoing edge, a fork exactly one incoming edge.',
    (m) => [
      ...nodesOf(m, 'merge', 'join')
        .filter((n) => m.outs(n.id).length !== 1)
        .map((n) => at(n.span, { ...named(n, m), case: 'outgoing', count: String(m.outs(n.id).length) })),
      ...nodesOf(m, 'fork')
        .filter((n) => inputs(m, n.id).length !== 1)
        .map((n) => at(n.span, { ...named(n, m), case: 'incoming', count: String(inputs(m, n.id).length) })),
    ],
  ),
);

const norm = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');

/** Repeated guards of a decision from the second on; `else` counts too. */
function duplicates(flows: readonly Flow[]): Flow[] {
  const seen = new Set<string>();
  return flows.filter((f) => {
    const text = guardText(f);
    if (text === undefined) return false;
    if (seen.has(norm(text))) return true;
    seen.add(norm(text));
    return false;
  });
}

export const guards = implementing(
  { uml: [ACTIVITIES.guard, ACTIVITIES.elseGuard] },
  defineRule(
    'U433',
    'error',
    'The guards of a decision exclude each other, so none appears twice, and `else` appears at most once and only on an edge out of a decision.',
    (m) => {
      const out: Finding[] = [];
      for (const d of nodesOf(m, 'decision'))
        for (const f of duplicates(m.outs(d.id)))
          out.push(at(f.span, { ...named(d, m), case: 'twice', guard: guardText(f) ?? '' }));
      for (const f of m.flows)
        if (f.else && m.byId.get(f.from)?.kind !== 'decision')
          out.push(at(f.span, { case: 'else', flow: written(m, f) }));
      return out;
    },
  ),
);

export const joinAfterDecision = implementing(
  { uml: [ACTIVITIES.join] },
  defineRule(
    'U435',
    'error',
    'A join waits for all its incoming edges. When they come from alternatives of one decision, only one of them runs and the activity hangs; a merge is meant.',
    (m) =>
      nodesOf(m, 'join').flatMap((j) => {
        const d = joinedFrom(m, j, 'decision');
        return d ? [at(j.span, { ...named(j, m), ...named(d, m, 'from'), id: j.id })] : [];
      }),
  ),
);
