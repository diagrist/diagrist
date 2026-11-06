import { type AreaMark, areaMark, domId, lineArea } from '@diagrist/core';
import type { StateLayout } from '../layout/index.js';
import type { TransitionEnds } from '../layout/transitions.js';
import { areaOf, type StateModel } from '../model.js';

/** The area of a transition: its own, else the coloured one of its source, else of its target (ADR 0033). */
const transitionArea = (m: StateModel, t: TransitionEnds): string | undefined =>
  lineArea(m.diagram.areas, t.area, areaOf(m, t.from), areaOf(m, t.to));

/**
 * The area marks of a state machine by DOM id: states and pseudostates as bodies, composite states as frames,
 * transitions and their labels as lines, route `k` drawn as `edge-<k>`. Regions draw no group of their own; they pass
 * their area on to their vertices.
 */
export function stateAreaMarks(m: StateModel, l: StateLayout): Map<string, AreaMark> {
  const out = new Map<string, AreaMark>();
  const put = (id: string, area: string | undefined, as: AreaMark['as']) => {
    const mark = areaMark(m.diagram.areas, area, as);
    if (mark !== undefined) out.set(id, mark);
  };
  for (const n of l.grid.nodes) put(domId.node(n.id), areaOf(m, n.id), 'body');
  for (const g of l.grid.groups) put(domId.group(g.id), areaOf(m, g.id), 'line');
  l.ends.forEach((t, k) => {
    put(domId.edge(k), transitionArea(m, t), 'line');
    put(domId.label(k), transitionArea(m, t), 'line');
  });
  return out;
}

/** The areas the picture paints something in, for its legend: those of its vertices and of its transitions. */
export const usedAreas = (m: StateModel): Set<string> =>
  new Set(
    m.diagram.vertices
      .filter((v) => v.kind !== 'region')
      .map((v) => areaOf(m, v.id))
      .concat(m.diagram.transitions.map((t) => transitionArea(m, t)))
      .filter((a): a is string => a !== undefined),
  );
