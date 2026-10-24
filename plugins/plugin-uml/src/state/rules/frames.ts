import type { Finding } from '@diagrist/core';
import { implementing } from '../../spec/catalog.js';
import { STATE_MACHINES as S } from '../../spec/state-machines.js';
import { isInside, machineFrame, regionsOf, regionUnder, type StateModel } from '../model.js';
import { defineRule, vertexValues } from './shared.js';

export const compositeWithoutInitial = implementing(
  { uml: [S.compositeState, S.initial] },
  defineRule(
    'U946',
    'warning',
    'A transition that ends at the frame of a composite state enters it at its initial pseudostate; without one it is not clear where it continues. States with regions are checked per region.',
    (m) =>
      m.diagram.transitions.flatMap((t): Finding[] => {
        if (!m.composites.has(t.to) || regionsOf(m, t.to).length) return [];
        const has = m.diagram.vertices.some((v) => v.parent === t.to && v.kind === 'initial');
        return has ? [] : [{ span: t.span, values: { ...vertexValues(m, t.to), id: t.to } }];
      }),
  ),
);

/**
 * Ways into a state with regions: per entry the vertices it enters explicitly. Empty for a transition to the frame;
 * for a fork all its branches; for an entry point the targets of its transitions.
 */
function entries(m: StateModel, owner: string): { span: Finding['span']; targets: string[] }[] {
  const inside = (id: string) => isInside(m, id, owner);
  const out: { span: Finding['span']; targets: string[] }[] = [];
  for (const t of m.diagram.transitions) {
    if (inside(t.from) || t.from === owner || m.kind(t.from) === 'fork') continue;
    const point = m.vertices.get(t.to);
    if (t.to === owner) out.push({ span: t.span, targets: [] });
    else if (point?.kind === 'entrypoint' && point.parent === owner)
      out.push({ span: t.span, targets: m.out(t.to).map((o) => o.to) });
    else if (inside(t.to)) out.push({ span: t.span, targets: [t.to] });
  }
  for (const fork of m.diagram.vertices.filter((v) => v.kind === 'fork' && !isInside(m, v.id, owner))) {
    const targets = m
      .out(fork.id)
      .map((t) => t.to)
      .filter(inside);
    if (targets.length) out.push({ span: fork.span, targets });
  }
  return out;
}

export const regionWithoutInitial = implementing(
  { uml: [S.orthogonalRegion, S.initial] },
  defineRule(
    'U948',
    'warning',
    'Each region of a state starts at its own initial pseudostate, unless every way into the state enters the region explicitly, as the branches of a fork do.',
    (m) =>
      m.diagram.vertices.flatMap((owner) => {
        if (owner.kind !== 'state') return [];
        const ways = entries(m, owner.id);
        return regionsOf(m, owner.id).flatMap((region): Finding[] => {
          if (m.diagram.vertices.some((v) => v.kind === 'initial' && v.parent === region)) return [];
          const open = ways.find((w) => !w.targets.some((id) => regionUnder(m, id, owner.id) === region));
          const v = m.vertices.get(region);
          return open && v
            ? [{ span: v.span, values: { ...vertexValues(m, region), line: String(open.span.line), id: region } }]
            : [];
        });
      }),
  ),
);

export const pointUnused = implementing(
  { uml: [S.entryPoint, S.exitPoint] },
  defineRule(
    'U949',
    'warning',
    'An entry or exit point has a way in and a way out. On a submachine state only the outside counts, and on the frame of a machine drawn with its own points the outside lies with the caller.',
    (m) => {
      const machine = machineFrame(m);
      return m.diagram.vertices.flatMap((v): Finding[] => {
        if (v.kind !== 'entrypoint' && v.kind !== 'exitpoint') return [];
        const owner = v.parent === undefined ? undefined : m.vertices.get(v.parent);
        const sub = owner?.kind === 'state' && !m.composites.has(owner.id);
        if (sub && owner?.submachine === undefined) return [];
        const entry = v.kind === 'entrypoint';
        const frame = owner !== undefined && owner.id === machine;
        const noIn = !m.into(v.id).length && (!sub || entry) && !(frame && entry);
        const noOut = !m.out(v.id).length && (!sub || !entry) && !(frame && !entry);
        const missing = noIn ? 'in' : noOut ? 'out' : undefined;
        return missing ? [{ span: v.span, values: { case: missing, ...vertexValues(m, v.id) } }] : [];
      });
    },
  ),
);
