import { type AreaMark, areaMark, lineArea, type Shape } from '@diagrist/core';
import type { Graph, Relation } from '../model.js';

/** The area of a relation: its own, else that of its first item, else that of its second (ADR 0033). */
export function relationArea(model: Graph, r: Relation): string | undefined {
  if (model.areas === undefined) return undefined;
  const areaOf = (id: string) => model.items.find((i) => i.id === id)?.area;
  return lineArea(model.areas, r.area, areaOf(r.from), areaOf(r.to));
}

/** The mark of an area, or none in a picture without areas or for an area in ink. */
export const markOf = (model: Graph, area: string | undefined, as: AreaMark['as']): AreaMark | undefined =>
  model.areas === undefined ? undefined : areaMark(model.areas, area, as);

/** The shapes in a group of the area, or as they are when the area paints nothing. */
export const inArea = (mark: AreaMark | undefined, shapes: Shape[]): Shape[] =>
  mark === undefined ? shapes : [{ kind: 'group', area: mark, children: shapes }];
