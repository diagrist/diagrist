import type { Finding } from '@diagrist/core';
import { ACTIVITIES } from '../../spec/activities.js';
import { implementing } from '../../spec/catalog.js';
import { at, defineRule, inputs, joinedFrom, named, nodesOf, reach, written } from './shared.js';

export const mergeAfterFork = implementing(
  { uml: [ACTIVITIES.merge] },
  defineRule(
    'U937',
    'warning',
    'A merge does not synchronize: when its incoming edges come from parallel branches of a fork, everything after it runs several times. Valid UML, but usually a join is meant.',
    (m) =>
      nodesOf(m, 'merge').flatMap((n) => {
        const fork = joinedFrom(m, n, 'fork');
        return fork ? [at(n.span, { ...named(n, m), ...named(fork, m, 'from'), id: n.id })] : [];
      }),
  ),
);

export const finalInBranch = implementing(
  { uml: [ACTIVITIES.activityFinal] },
  defineRule(
    'U938',
    'warning',
    'An activity final ends every flow. When two parallel branches end in an activity final each without a join, the faster one stops the other: the main branch ends with `final`, side branches with `flowfinal`.',
    (m) =>
      nodesOf(m, 'fork').flatMap((f) => {
        const stop = (id: string) => id === f.id || m.byId.get(id)?.kind === 'join';
        const finals = m
          .outs(f.id)
          .map((o) => [...reach(m, [o.to], stop)].find((id) => m.byId.get(id)?.kind === 'final'))
          .filter((id): id is string => id !== undefined);
        const second = finals[1] === undefined ? undefined : m.byId.get(finals[1]);
        return second ? [at(second.span, { ...named(f, m), count: String(finals.length) })] : [];
      }),
  ),
);

export const implicitJoin = implementing(
  { uml: [ACTIVITIES.action] },
  defineRule(
    'U939',
    'warning',
    'An action with several incoming edges waits for all of them (implicit join), with several outgoing ones it starts all of them (implicit fork). Usually a merge or a decision is meant. Object flows at pins do not count: each pin is an object node of its own.',
    (m) => {
      const pinned = new Map(m.flows.map((f, i) => [f, m.pins[i] ?? {}]));
      const out: Finding[] = [];
      for (const n of nodesOf(m, 'action', 'send')) {
        const ins = inputs(m, n.id).filter((f) => !pinned.get(f)?.to);
        const outs = m.outs(n.id).filter((f) => !pinned.get(f)?.from);
        if (ins.length > 1) out.push(at(n.span, { ...named(n, m), case: 'join', count: String(ins.length) }));
        if (outs.length > 1) out.push(at(n.span, { ...named(n, m), case: 'fork', count: String(outs.length) }));
      }
      return out;
    },
  ),
);

export const regionWithoutInterrupt = implementing(
  { uml: [ACTIVITIES.interruptibleRegion] },
  defineRule(
    'U955',
    'warning',
    'An interruptible region without an interrupting edge `~>` interrupts nothing: usually the edge is missing, or the frame only groups.',
    (m) =>
      m.diagram.regions
        .filter((r) => !m.flows.some((f) => f.interrupt && m.byId.get(f.from)?.interruptible === r.id))
        .map((r) => at(r.span, { region: r.label ?? r.id })),
  ),
);

export const expansionCrossing = implementing(
  { uml: [ACTIVITIES.expansionRegion] },
  defineRule(
    'U956',
    'warning',
    'An edge that crosses the frame of an expansion region without an expansion node is valid UML, but leaves open whether it acts once per element or once for the whole region. The way through the input or output is clearer.',
    (m) =>
      m.flows.flatMap((f): Finding[] => {
        const [from, to] = [m.byId.get(f.from), m.byId.get(f.to)];
        if (!from || !to || from.expansion === to.expansion || from.port || to.port) return [];
        const region = to.expansion ?? from.expansion ?? '';
        return [at(f.span, { flow: written(m, f), region, case: to.expansion ? 'in' : 'out', from: f.from, to: f.to })];
      }),
  ),
);

export const expansionEmpty = implementing(
  { uml: [ACTIVITIES.expansionRegion] },
  defineRule(
    'U957',
    'warning',
    'An expansion region without nodes, or without an edge from its input inside, processes nothing: usually `expansion=` on the nodes or `go region => first` is missing.',
    (m) =>
      m.nodes.flatMap((n): Finding[] => {
        const port = n.port;
        if (port?.side !== 'in') return [];
        const members = m.diagram.nodes.filter((x) => x.expansion === port.region);
        const values = { ...named(n, m), region: port.region, pin: port.name ?? '' };
        if (members.length === 0) return port.index === 0 ? [at(n.span, { ...values, case: 'empty' })] : [];
        const first = members[0]?.id ?? '';
        const inside = m.outs(n.id).some((f) => members.some((x) => x.id === f.to));
        return inside ? [] : [at(n.span, { ...values, case: 'noEdge', first })];
      }),
  ),
);
