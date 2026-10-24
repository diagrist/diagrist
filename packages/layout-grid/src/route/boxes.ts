import type { Rect } from '@diagrist/core';
import type { GridLayout, PlacedGroup, PlacedNode } from '../layout.js';
import { type Tree, treeOf } from '../place/extent.js';
import type { GridEdge, GridNode, GridSpec } from '../spec.js';

/** What the router knows of an edge end: a node, or a frame under the id `group:<id>`. */
export interface Box {
  readonly id: string;
  readonly rect: Rect;
  readonly colIndex: number;
  readonly rowIndex: number;
}

/** Lookups the routing steps share, built once per layout. */
export interface Board {
  readonly tree: Tree;
  readonly layout: GridLayout;
  readonly nodes: readonly Box[];
  readonly node: (id: string) => GridNode | undefined;
  readonly placed: (id: string) => PlacedNode | undefined;
}

export const groupKey = (id: string): string => `group:${id}`;

export function boardOf(spec: GridSpec, layout: GridLayout): Board {
  const tree = treeOf(spec);
  const placed = new Map(layout.nodes.map((n) => [n.id, n]));
  const nodes = layout.nodes.map((n) => ({ id: n.id, rect: n.rect, colIndex: n.col, rowIndex: n.row }));
  return { tree, layout, nodes, node: tree.node, placed: (id) => placed.get(id) };
}

/** Index of the column or row a coordinate falls into, for frames over several places. */
const trackAt = (starts: readonly number[], at: number): number => {
  let index = 0;
  for (const [i, start] of starts.entries()) if (start <= at) index = i;
  return index;
};

/** The box of an edge end: the node's rectangle, else the frame's. */
export function boxOf(board: Board, id: string): Box | undefined {
  const node = board.placed(id);
  if (node) return { id, rect: node.rect, colIndex: node.col, rowIndex: node.row };
  const g = board.layout.groups.find((p) => p.id === id);
  if (!g) return undefined;
  const r = g.rect;
  return {
    id: groupKey(g.id),
    rect: r,
    colIndex: trackAt(
      board.layout.cols.map((c) => c.x),
      r.x + r.w / 2,
    ),
    rowIndex: trackAt(
      board.layout.rows.map((row) => row.y),
      r.y + r.h / 2,
    ),
  };
}

/** Node ids an end stands for: the node, or the members of the frame. */
function endNodes(board: Board, id: string): readonly string[] {
  if (board.node(id)) return [id];
  return board.tree.group(id)?.members ?? [];
}

/** Head strips of all placed frames, `height` deep. */
export const headStrips = (groups: readonly PlacedGroup[], height: number): Rect[] =>
  groups.map((g) => ({ ...g.rect, h: height }));

/** Obstacles of an edge in a fixed grid: all nodes and head strips except its own ends and their members. */
export function obstaclesFor(board: Board, edge: GridEdge): Box[] {
  const own = new Set<string>([...endNodes(board, edge.from), ...endNodes(board, edge.to)]);
  for (const end of [edge.from, edge.to]) if (!board.node(end) && board.tree.group(end)) own.add(groupKey(end));
  const height = board.tree.spec.metrics.framePad.top;
  const headers: Box[] = board.layout.groups.map((g) => ({
    id: groupKey(g.id),
    rect: { x: g.rect.x, y: g.rect.y, w: g.rect.w, h: height },
    colIndex: -1,
    rowIndex: -1,
  }));
  return [...board.nodes, ...headers].filter((o) => !own.has(o.id));
}
