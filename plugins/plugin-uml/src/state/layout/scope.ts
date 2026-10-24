import type { LayerEdge } from '@diagrist/layout-grid';
import { ancestors, isBorderPoint, type StateModel } from '../model.js';

/**
 * A scope of the state machine: the top level or the inside of a composite state. Its nodes are the direct children;
 * transitions between children of different sub-scopes are lifted to these children, so a composite state is layered
 * as one block.
 */
export interface Scope {
  readonly nodes: readonly string[];
  readonly edges: readonly LayerEdge[];
  /** Final states and terminate pseudostates: they stand in the last layer. */
  readonly sinks: readonly string[];
}

/** Shortest distance from the start along the edges; what is not reached gets infinity. */
function distances(nodes: readonly string[], edges: readonly LayerEdge[], starts: readonly string[]) {
  const dist = new Map<string, number>(nodes.map((n) => [n, Number.POSITIVE_INFINITY]));
  const queue = [...starts];
  for (const s of starts) dist.set(s, 0);
  for (let n = queue.shift(); n !== undefined; n = queue.shift())
    for (const e of edges)
      if (e.from === n && dist.get(e.to) === Number.POSITIVE_INFINITY) {
        dist.set(e.to, (dist.get(n) ?? 0) + 1);
        queue.push(e.to);
      }
  return dist;
}

/**
 * The scope `owner` (undefined: the top level). Nodes: the initial pseudostate first, then as declared. Edges are
 * sorted by the distance of their target from the start, so breaking cycles follows the main way and the order of
 * the `go` lines does not change the picture.
 */
export function scopeOf(m: StateModel, owner: string | undefined): Scope {
  const up = (id: string) => ancestors(m, id);
  const inside = (id: string): string | undefined => {
    const chain = [id, ...up(id)];
    const at = owner === undefined ? chain.length - 1 : chain.indexOf(owner) - 1;
    return at >= 0 ? chain[at] : undefined;
  };
  const kids = m.diagram.vertices.filter(
    (v) => !isBorderPoint(v.kind) && (owner === undefined ? up(v.id).length === 0 : up(v.id)[0] === owner),
  );
  const nodes = [...kids.filter((v) => v.kind === 'initial'), ...kids.filter((v) => v.kind !== 'initial')].map(
    (v) => v.id,
  );
  const lifted = m.diagram.transitions.flatMap((t): LayerEdge[] => {
    if (!m.vertices.has(t.from) || !m.vertices.has(t.to)) return [];
    const from = inside(t.from);
    const to = inside(t.to);
    return from && to && from !== to && nodes.includes(from) && nodes.includes(to) ? [{ from, to, rank: 1 }] : [];
  });
  const starts = nodes.filter((n) => m.kind(n) === 'initial');
  const dist = distances(nodes, lifted, starts.length ? starts : nodes.slice(0, 1));
  const at = (n: string) => dist.get(n) ?? 0;
  const edges = [...lifted].sort((a, b) => at(a.to) - at(b.to) || nodes.indexOf(a.to) - nodes.indexOf(b.to));
  const sinks = kids.filter((v) => v.kind === 'final' || v.kind === 'terminate').map((v) => v.id);
  return { nodes, edges, sinks };
}
