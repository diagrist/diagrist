import { type AreaMark, areaMark, domId, lineArea } from '@diagrist/core';
import type { ClassRelation } from '../diagram.js';
import { areaOf, type ClassModel } from '../model.js';

/** The area of a relation: its own, else the coloured one of its first end, else of its second (ADR 0033). */
export const relationArea = (m: ClassModel, r: ClassRelation): string | undefined =>
  lineArea(m.diagram.areas, r.area, areaOf(m, r.from), areaOf(m, r.to));

/**
 * The area marks of a class diagram by DOM id: classifiers and diamonds as bodies, packages as frames, relations and
 * their labels as lines, `relations[k]` drawn as `edge-<k>`.
 */
export function classAreaMarks(m: ClassModel, relations: readonly ClassRelation[]): Map<string, AreaMark> {
  const out = new Map<string, AreaMark>();
  const put = (id: string, area: string | undefined, as: AreaMark['as']) => {
    const mark = areaMark(m.diagram.areas, area, as);
    if (mark !== undefined) out.set(id, mark);
  };
  for (const id of [...m.classifiers.keys(), ...m.associations.keys()]) put(domId.node(id), areaOf(m, id), 'body');
  for (const id of m.packages.keys()) put(domId.group(id), areaOf(m, id), 'line');
  relations.forEach((r, k) => {
    put(domId.edge(k), relationArea(m, r), 'line');
    put(domId.label(k), relationArea(m, r), 'line');
  });
  return out;
}

/** The areas the picture paints something in, for its legend. */
export const usedAreas = (m: ClassModel): Set<string> =>
  new Set(
    [...m.classifiers.keys(), ...m.associations.keys(), ...m.packages.keys()]
      .map((id) => areaOf(m, id))
      .concat(m.diagram.relations.map((r) => relationArea(m, r)))
      .filter((a): a is string => a !== undefined),
  );
