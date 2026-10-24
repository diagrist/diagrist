import type { Finding } from '@diagrist/core';
import { ACTIVITIES } from '../../spec/activities.js';
import { implementing } from '../../spec/catalog.js';
import { complementary } from './complement.js';
import { at, defineRule, guardText, inputs, named, nodesOf, OBJECT_KINDS, reach } from './shared.js';

export const initialCount = implementing(
  { uml: [ACTIVITIES.initialNode] },
  defineRule('U930', 'warning', 'UML allows no initial node or several; exam practice expects exactly one.', (m) => {
    const starts = nodesOf(m, 'initial');
    if (starts.length === 0) return m.diagram.nodes.length ? [at(m.diagram.span, { case: 'none' })] : [];
    return starts.slice(1).map((n) => at(n.span, { case: 'many', count: String(starts.length) }));
  }),
);

export const decisionOutgoing = implementing(
  { uml: [ACTIVITIES.decision] },
  defineRule(
    'U931',
    'warning',
    'UML asks for one outgoing edge at least; a decision with fewer than two decides nothing.',
    (m) =>
      nodesOf(m, 'decision')
        .filter((n) => m.outs(n.id).length < 2)
        .map((n) => at(n.span, { ...named(n, m), count: String(m.outs(n.id).length), id: n.id })),
  ),
);

export const controlWidth = implementing(
  { uml: [ACTIVITIES.merge, ACTIVITIES.join, ACTIVITIES.fork] },
  defineRule(
    'U932',
    'warning',
    'A merge or join with fewer than two incoming edges, and a fork with fewer than two outgoing ones, has no effect.',
    (m) => [
      ...nodesOf(m, 'merge', 'join')
        .filter((n) => m.ins(n.id).length < 2)
        .map((n) => at(n.span, { ...named(n, m), case: 'incoming' })),
      ...nodesOf(m, 'fork')
        .filter((n) => m.outs(n.id).length < 2)
        .map((n) => at(n.span, { ...named(n, m), case: 'outgoing' })),
    ],
  ),
);

export const guardMissing = implementing(
  { uml: [ACTIVITIES.guard] },
  defineRule(
    'U933',
    'warning',
    'Every alternative of a decision needs a guard; otherwise it is open when it applies.',
    (m) =>
      nodesOf(m, 'decision').flatMap((d) =>
        m
          .outs(d.id)
          .filter((f) => guardText(f) === undefined)
          .map((f) => at(f.span, { ...named(d, m), from: f.from, to: f.to })),
      ),
  ),
);

export const guardsIncomplete = implementing(
  { uml: [ACTIVITIES.guard, ACTIVITIES.elseGuard] },
  defineRule(
    'U934',
    'warning',
    'The guards of a decision should cover every case together. Without `else` that shows only for obvious pairs such as yes and no; otherwise the flow may stop.',
    (m) =>
      nodesOf(m, 'decision').flatMap((d) => {
        const guards = m.outs(d.id).map(guardText);
        if (guards.length < 2 || guards.includes('else') || guards.includes(undefined)) return [];
        const [a, b] = guards;
        if (guards.length === 2 && a !== undefined && b !== undefined && complementary(a, b)) return [];
        return [at(d.span, { ...named(d, m), guards: guards.map((x) => `[${x}]`).join(', ') })];
      }),
  ),
);

export const unreachable = defineRule(
  'U935',
  'warning',
  'Every node should be reachable from a start: an initial node, or an accept event, time event or data store without incoming edge, which start a flow from outside. A handler counts when the action it protects does.',
  (m) => {
    const isStart = (kind: string, id: string) =>
      kind === 'initial' || (['accept', 'wait', 'datastore'].includes(kind) && inputs(m, id).length === 0);
    const starts = m.nodes.filter((n) => n.port === undefined && isStart(n.kind, n.id)).map((n) => n.id);
    if (starts.length === 0) return [];
    const reached = reach(m, starts);
    for (const h of m.handlers) if (reached.has(h.protected)) reached.add(h.handler);
    return m.nodes.filter((n) => !reached.has(n.id)).map((n) => at(n.span, named(n, m)));
  },
);

export const noEnd = implementing(
  { uml: [ACTIVITIES.activityFinal, ACTIVITIES.flowFinal] },
  defineRule(
    'U936',
    'warning',
    'UML allows an activity without end; exam practice expects one. A node without outgoing edge that is no end lets its flow run out; after a handler the flow goes on at its protected action.',
    (m) => {
      if (m.nodes.length === 0) return [];
      const handled = new Set(m.handlers.map((h) => h.handler));
      const out: Finding[] = nodesOf(m, 'final', 'flowfinal').length ? [] : [at(m.diagram.span, { case: 'none' })];
      for (const n of m.nodes)
        if (
          !['final', 'flowfinal'].includes(n.kind) &&
          !OBJECT_KINDS.has(n.kind) &&
          !handled.has(n.id) &&
          m.outs(n.id).length === 0
        )
          out.push(at(n.span, { ...named(n, m), case: 'open' }));
      return out;
    },
  ),
);
