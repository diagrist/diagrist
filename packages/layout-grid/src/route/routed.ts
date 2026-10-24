import type { Point } from '@diagrist/core';
import type { Side } from '../geometry.js';
import type { Route, RouteShape } from '../layout.js';
import type { GridEdge } from '../spec.js';
import type { Box } from './boxes.js';

/** A route while the router still works on it: with its edge and the boxes of both ends. */
export interface Routed {
  readonly edge: GridEdge;
  readonly from: Box;
  readonly to: Box;
  readonly shape: RouteShape;
  readonly points: readonly Point[];
  readonly fromSide: Side;
  readonly toSide: Side;
  readonly unroutable?: boolean;
}

export function toRoute(r: Routed): Route {
  return {
    edge: r.edge.id,
    points: r.points,
    shape: r.shape,
    fromSide: r.fromSide,
    toSide: r.toSide,
    ...(r.unroutable ? { unroutable: true } : {}),
  };
}
