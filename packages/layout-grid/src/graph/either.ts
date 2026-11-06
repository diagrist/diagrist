import type { LayeredLayout } from '../layered/output.js';
import { layeredLines } from '../layered/output.js';
import type { LayeredSpec } from '../layered/spec.js';
import { scoreOf } from '../score.js';
import type { GraphEdge, LayoutGraph } from './spec.js';

/** What a target turned to the other side costs, in the units of `scoreOf`: as much as one crossing. */
const CONVENTION = 1_000;
/** The most targets the search turns, those with the most edges first; every set of them is laid out once. */
const TARGETS = 4;

/** The targets of `either` edges, those with the most such edges first, then in edge order. */
function targetsOf(edges: readonly GraphEdge[]): string[] {
  const count = new Map<string, number>();
  for (const e of edges)
    if (e.either === true && (e.rank === 'up' || e.rank === 'down')) count.set(e.to, (count.get(e.to) ?? 0) + 1);
  return [...count.keys()].sort((a, b) => (count.get(b) ?? 0) - (count.get(a) ?? 0)).slice(0, TARGETS);
}

/** Every non-empty set of `items`, smaller sets first, each in the order of `items`. */
function subsets<T>(items: readonly T[]): T[][] {
  const all: T[][] = [];
  for (let mask = 1; mask < 1 << items.length; mask++) all.push(items.filter((_, i) => (mask & (1 << i)) !== 0));
  return all.sort((a, b) => a.length - b.length);
}

/** The graph with the `either` edges into `turned` ranked the other way. */
function turn(graph: LayoutGraph, turned: ReadonlySet<string>): LayoutGraph {
  const edges = graph.edges.map((e) =>
    e.either === true && turned.has(e.to) && (e.rank === 'up' || e.rank === 'down')
      ? { ...e, rank: e.rank === 'up' ? ('down' as const) : ('up' as const) }
      : e,
  );
  return { ...graph, edges };
}

/**
 * A graph with `either` edges laid out with their targets where the notation puts them, and again with every set of
 * up to `TARGETS` of them turned to the other side of their sources; a turned picture stays only where it costs less
 * by `scoreOf` with `CONVENTION` added for each target it turns, so a target leaves its side only for crossings it
 * clearly saves. A picture without crossings is laid out once.
 */
export function eitherWay(
  graph: LayoutGraph,
  lay: (graph: LayoutGraph) => LayeredLayout,
  specOf: (graph: LayoutGraph) => LayeredSpec,
): { graph: LayoutGraph; layout: LayeredLayout } {
  const layout = lay(graph);
  const targets = targetsOf(graph.edges);
  if (targets.length === 0) return { graph, layout };
  const base = scoreOf(layeredLines(specOf(graph), layout));
  if (base.metrics.crossings === 0) return { graph, layout };
  let best = { graph, layout, cost: base.cost };
  for (const set of subsets(targets)) {
    const turned = turn(graph, new Set(set));
    const laid = lay(turned);
    const cost = scoreOf(layeredLines(specOf(turned), laid)).cost + CONVENTION * set.length;
    if (cost < best.cost) best = { graph: turned, layout: laid, cost };
  }
  return { graph: best.graph, layout: best.layout };
}
