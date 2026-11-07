import type { LayeredEdge } from '../layered/spec.js';
import type { LayerEdge } from '../layers/graph.js';
import type { GraphEdge } from './spec.js';

/**
 * The ends of the line a box hangs from (`GraphEdge.hang`), each with the id of the hidden edge between the box and
 * it; none where the line is unknown, hangs itself or runs from a node to itself.
 */
function endsOf(e: GraphEdge, edges: readonly GraphEdge[]): { id: string; end: string }[] {
  const line = edges.find((k) => k.id === e.to);
  if (line === undefined || line.hang === true || line.from === line.to) return [];
  return [line.from, line.to].map((end, k) => ({ id: `${e.id}:${k}`, end }));
}

/** The two ends of a hidden edge between a box and an end of its line: the end above a box hanging below, else under. */
const ends = (e: GraphEdge, end: string) => (e.rank === 'up' ? { from: e.from, to: end } : { from: end, to: e.from });

/**
 * A box hanging from a line as the layered stages read it: two hidden edges between the ends of the line and the box,
 * which order and place it near the line, down to it where it hangs below (`rank` `down`) and up where it hangs
 * above (`up`), each naming the line drawn from the line to the box.
 */
export function heldEdges(e: GraphEdge, edges: readonly GraphEdge[]): LayeredEdge[] {
  const hang = { id: e.id, line: e.to, box: e.from };
  return endsOf(e, edges).map(({ id, end }): LayeredEdge => ({ id, ...ends(e, end), rank: 1, hidden: true, hang }));
}

/** A box hanging from a line as the layering reads it: keyed, so it stands beside the lower or upper end. */
export function heldLayerEdges(e: GraphEdge, edges: readonly GraphEdge[]): LayerEdge[] {
  const hang = { key: e.id, box: e.from };
  return endsOf(e, edges).map(({ end }): LayerEdge => ({ ...ends(e, end), rank: 1, hang }));
}
