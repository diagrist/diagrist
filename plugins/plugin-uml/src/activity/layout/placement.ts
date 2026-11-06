import type { Point, Rect } from '@diagrist/core';
import type { Side } from '@diagrist/layout-grid';
import type { ActivityNode } from '../diagram.js';
import type { GraphFlow } from './graph.js';
import type { ActivityArt } from './size.js';

/** A node with its place and drawing. */
export interface PlacedNode {
  readonly id: string;
  readonly node: ActivityNode;
  readonly rect: Rect;
  readonly art: ActivityArt;
}

/** Where the nodes stand, by id. */
export interface Placement {
  readonly nodes: ReadonlyMap<string, PlacedNode>;
}

/** An edge with its route and the sides it leaves and enters by. */
export interface Routed {
  readonly flow: GraphFlow;
  readonly points: readonly Point[];
  readonly fromSide: Side;
  readonly toSide: Side;
}
