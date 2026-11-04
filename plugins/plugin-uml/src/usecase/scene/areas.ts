import { type AreaMark, areaMark, domId, lineArea, type Shape } from '@diagrist/core';
import type { Relation } from '../diagram.js';
import type { UseCaseLayout } from '../layout/index.js';
import { areaOf, type UseCaseModel } from '../model.js';

/** The area of a relation: its own, else the coloured one of its first end, else of its second (ADR 0033). */
const relationArea = (m: UseCaseModel, r: Relation): string | undefined =>
  lineArea(m.diagram.areas, r.area, areaOf(m, r.from), areaOf(m, r.to));

/**
 * The area marks of a use case diagram by DOM id: actors and use cases as bodies, subjects as frames, relations and
 * their labels as lines, `drawn[k]` drawn as `edge-<k>`.
 */
export function useCaseAreaMarks(m: UseCaseModel, l: UseCaseLayout): Map<string, AreaMark> {
  const out = new Map<string, AreaMark>();
  const put = (id: string, area: string | undefined, as: AreaMark['as']) => {
    const mark = areaMark(m.diagram.areas, area, as);
    if (mark !== undefined) out.set(id, mark);
  };
  for (const n of l.grid.nodes) put(domId.node(n.id), areaOf(m, n.id), 'body');
  for (const g of l.grid.groups) put(domId.group(g.id), areaOf(m, g.id), 'line');
  l.drawn.forEach((d, k) => {
    put(domId.edge(k), relationArea(m, d.relation), 'line');
    put(domId.label(k), relationArea(m, d.relation), 'line');
  });
  return out;
}

/**
 * The note of an extend line marked with the area of its line, whose labels stand in it; a group without a DOM id,
 * so the mark is set here. A note on an element keeps the ink, as the notes of the other kinds do.
 */
export function markExtendNote(m: UseCaseModel, l: UseCaseLayout, route: number | undefined, shape: Shape): Shape {
  const relation = route === undefined ? undefined : l.drawn.find((d) => d.route === route)?.relation;
  const mark = relation === undefined ? undefined : areaMark(m.diagram.areas, relationArea(m, relation), 'line');
  return mark === undefined || shape.kind !== 'group' ? shape : { ...shape, area: mark };
}

/** The areas the picture paints something in, for its legend: those of its elements, subjects and relations. */
export const usedAreas = (m: UseCaseModel): Set<string> =>
  new Set(
    [...m.actors.keys(), ...m.cases.keys(), ...m.subjects.keys()]
      .map((id) => areaOf(m, id))
      .concat(m.diagram.relations.map((r) => relationArea(m, r)))
      .filter((a): a is string => a !== undefined),
  );
