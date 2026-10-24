import { layerGraph } from '@diagrist/layout-grid';
import type { StateModel } from '../model.js';
import { regionsOf } from '../model.js';
import { type Scope, scopeOf } from './scope.js';

/**
 * Place of a simple vertex: `main` is the layer along the flow, `cross` the position across it in half places. A
 * simple vertex takes two half places, so it can also stand in the middle between two others.
 */
export interface Cell {
  readonly main: number;
  readonly cross: number;
}

interface Block {
  readonly cells: ReadonlyMap<string, Cell>;
  readonly main: number;
  readonly cross: number;
  /** A fork or join bar, reserved as wide as the state with regions beside it. */
  readonly bar?: boolean;
  /** That state: the bar stands right above or below it. */
  readonly peer?: string;
}

const LEAF: Block = { cells: new Map(), main: 1, cross: 2 };

/**
 * Fork and join at a state with orthogonal regions reach over all regions. Their block is as wide as the state, so
 * nothing stands beside the bar where it stretches.
 */
function widenBars(m: StateModel, scope: Scope, inner: Map<string, Block>): void {
  const regional = (id: string) => regionsOf(m, id).length > 0;
  for (const n of scope.nodes) {
    if (m.kind(n) !== 'fork' && m.kind(n) !== 'join') continue;
    const peers = scope.edges.flatMap((e) => (e.from === n ? [e.to] : e.to === n ? [e.from] : []));
    const width = (id: string) => inner.get(id)?.cross ?? 2;
    const widest = peers.filter(regional).sort((a, b) => width(b) - width(a))[0];
    const cross = widest ? width(widest) : 2;
    if (widest && cross > 2) inner.set(n, { cells: new Map(), main: 1, cross, bar: true, peer: widest });
  }
}

/**
 * Lays out a scope: the insides first, then each composite as one block in its layer. Regions stand across the flow
 * side by side and start at the same height.
 */
function blockOf(m: StateModel, owner: string | undefined, frames: ReadonlySet<string>): Block {
  const scope = scopeOf(m, owner);
  if (!scope.nodes.length) return LEAF;
  const inner = new Map(scope.nodes.map((n) => [n, frames.has(n) ? blockOf(m, n, frames) : LEAF]));
  widenBars(m, scope, inner);
  const at = (n: string) => inner.get(n) ?? LEAF;
  const graph = { nodes: scope.nodes, edges: scope.edges, maxPerLayer: Number.POSITIVE_INFINITY, last: scope.sinks };
  const { layers, position } = layerGraph(graph);
  const heights = layers.map((layer) => Math.max(1, ...layer.map((n) => at(n).main)));
  const starts = heights.map((_, l) => heights.slice(0, l).reduce((a, b) => a + b, 0));
  const placed = new Map<string, Cell>();
  layers.forEach((layer, l) => {
    let end = Number.NEGATIVE_INFINITY;
    for (const n of layer) {
      const b = at(n);
      const cross = Math.max(end, Math.round(2 * (position.get(b.peer ?? n) ?? 0) - (b.cross - 2) / 2));
      const centred = m.kind(n) === 'region' ? 0 : Math.floor(((heights[l] ?? 1) - b.main) / 2);
      placed.set(n, { main: (starts[l] ?? 0) + centred, cross });
      end = cross + b.cross;
    }
  });
  const left = Math.min(...[...placed.values()].map((c) => c.cross));
  const cells = new Map<string, Cell>();
  let width = 0;
  for (const [n, c] of placed) {
    const b = at(n);
    const shift = { main: c.main, cross: c.cross - left };
    width = Math.max(width, shift.cross + b.cross);
    if (b === LEAF || b.bar) cells.set(n, b.bar ? { ...shift, cross: shift.cross + (b.cross - 2) / 2 } : shift);
    for (const [id, x] of b.cells) cells.set(id, { main: x.main + shift.main, cross: x.cross + shift.cross });
  }
  return { cells, main: heights.reduce((a, b) => a + b, 0), cross: width };
}

/**
 * The automatic grid of a state machine: the initial pseudostate first (on top, or left with `direction=right`),
 * final states last, back edges against the flow. Composite states and regions are blocks.
 */
export function stateCells(m: StateModel): ReadonlyMap<string, Cell> {
  const frames = new Set([...m.composites, ...m.diagram.vertices.filter((v) => v.kind === 'region').map((v) => v.id)]);
  return blockOf(m, undefined, frames).cells;
}
