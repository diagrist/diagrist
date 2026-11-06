import type { GridLayout, GridSpec, Route } from '@diagrist/layout-grid';
import { isKnown, type KnownRelation } from '../diagram.js';
import type { UseCaseModel } from '../model.js';
import { edgeId } from './spec.js';

/** One relation with the index of its route. */
export interface Drawn {
  readonly relation: KnownRelation;
  readonly route: number;
}

/** The relation of every route, in the order of the routes. */
export function drawnOf(m: UseCaseModel, routes: readonly Route[]): Drawn[] {
  return routes.flatMap((r, route) => {
    const relation = m.diagram.relations.find((_, i) => edgeId(i) === r.edge);
    return relation && isKnown(relation) ? [{ relation, route }] : [];
  });
}

/** Box of the role below a stick figure. */
export function captionBoxes(spec: GridSpec, layout: GridLayout) {
  return layout.nodes.flatMap((p) => {
    const c = spec.nodes.find((n) => n.id === p.id)?.caption;
    if (!c) return [];
    return [{ id: p.id, rect: { x: p.rect.x + p.rect.w / 2 - c.w / 2, y: p.rect.y + p.rect.h, w: c.w, h: c.below } }];
  });
}
