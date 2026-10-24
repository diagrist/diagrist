import type { Finding } from '@diagrist/core';
import { implementing } from '../../spec/catalog.js';
import { STATE_MACHINES as S } from '../../spec/state-machines.js';
import { machineFrame, type StateModel } from '../model.js';
import { defineRule, vertexValues } from './shared.js';

const topInitials = (m: StateModel) =>
  m.diagram.vertices.filter((v) => v.kind === 'initial' && !(v.parent && m.vertices.has(v.parent)));

export const initialRequired = implementing(
  { uml: [S.initial] },
  defineRule(
    'U940',
    'warning',
    'A state machine starts at an initial pseudostate at the top level, and an initial pseudostate leads somewhere. A machine drawn as one state with its own entry and exit points starts at the caller instead.',
    (m) => {
      const missing =
        !topInitials(m).length && !machineFrame(m)
          ? [{ span: m.diagram.vertices[0]?.span ?? m.diagram.span, values: { case: 'none' } }]
          : [];
      const idle = m.diagram.vertices.flatMap((v): Finding[] =>
        v.kind === 'initial' && !m.out(v.id).length
          ? [{ span: v.span, values: { case: 'idle', ...vertexValues(m, v.id) } }]
          : [],
      );
      return [...missing, ...idle];
    },
  ),
);

/** Vertices reached from the initial pseudostates at the top level, entering composites and their parents. */
function reached(m: StateModel): Set<string> {
  const seen = new Set(topInitials(m).map((v) => v.id));
  const queue = [...seen];
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    queue.push(id);
  };
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    for (const t of m.out(id)) visit(t.to);
    for (const v of m.diagram.vertices) if (v.parent === id) visit(v.id);
    const point = m.vertices.get(id);
    const host = point?.kind === 'entrypoint' && point.parent ? m.vertices.get(point.parent) : undefined;
    if (host?.submachine) visit(host.id);
    const chain = new Set<string>();
    for (let p = point?.parent; p && m.vertices.has(p) && !chain.has(p); p = m.vertices.get(p)?.parent) {
      chain.add(p);
      seen.add(p);
      for (const t of m.out(p)) visit(t.to);
    }
  }
  return seen;
}

export const unreachable = implementing(
  { uml: [S.state] },
  defineRule(
    'U941',
    'warning',
    'Every state can be reached from the initial pseudostate: entering a composite state reaches its inside, and being in a substate means being in its parents too.',
    (m) => {
      if (!topInitials(m).length) return [];
      const seen = reached(m);
      return m.diagram.vertices.flatMap((v): Finding[] =>
        v.kind === 'state' && !seen.has(v.id) ? [{ span: v.span, values: vertexValues(m, v.id) }] : [],
      );
    },
  ),
);

export const deadEnd = implementing(
  { uml: [S.state, S.finalState] },
  defineRule(
    'U942',
    'warning',
    'A simple state that no transition leaves, neither itself nor a parent nor an exit point of it, is a dead end; usually a transition to a final state is missing.',
    (m) => {
      const stuck = (id: string): boolean => {
        for (let v = m.vertices.get(id); v; v = v.parent ? m.vertices.get(v.parent) : undefined)
          if (m.out(v.id).some((t) => t.to !== v?.id)) return false;
        return !m.diagram.vertices.some((x) => x.kind === 'exitpoint' && x.parent === id && m.out(x.id).length);
      };
      return m.diagram.vertices.flatMap((v): Finding[] =>
        v.kind === 'state' && !m.composites.has(v.id) && stuck(v.id)
          ? [{ span: v.span, values: vertexValues(m, v.id) }]
          : [],
      );
    },
  ),
);
