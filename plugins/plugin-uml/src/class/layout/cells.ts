import { type LayerEdge, type Layered, layerGraph } from '@diagrist/layout-grid';
import type { ClassModel } from '../model.js';
import { arrangements } from './arrange.js';
import { type Block, type Cell, flatten, LEAF, stack } from './blocks.js';
import { classGraph } from './graph.js';
import { CLASS } from './metrics.js';
import { spread } from './spread.js';

/** From so many packages on the top level its blocks are arranged by search; fewer are left to layering. */
const ARRANGE_FROM = 4;

/** Arrangements of a level with many packages that the layout tries; each costs a whole layout. */
const CHOICES = 4;

/** Middle of the classifiers joined across the border of the block, else the middle of the block. */
function anchorOf(cells: ReadonlyMap<string, Cell>, width: number, edges: readonly LayerEdge[]): number {
  const linked = edges.flatMap((e) => (cells.has(e.from) !== cells.has(e.to) ? [e.from, e.to] : []));
  const centres = [...new Set(linked)].flatMap((id) => {
    const c = cells.get(id);
    return c ? [c.cross + 1] : [];
  });
  return centres.length ? centres.reduce((a, b) => a + b, 0) / centres.length : width / 2;
}

/** The chain from an element up through its packages; unknown packages and cycles end it. */
function chains(m: ClassModel): (id: string) => readonly string[] {
  const up = new Map<string, string | undefined>([
    ...m.diagram.classifiers.map((c) => [c.id, c.package] as const),
    ...m.diagram.associations.map((a) => [a.id, a.package] as const),
    ...m.diagram.packages.map((p) => [p.id, p.parent] as const),
  ]);
  return (id) => {
    const chain = [id];
    for (let p = up.get(id); p && m.packages.has(p) && !chain.includes(p); p = up.get(p)) chain.push(p);
    return chain;
  };
}

/**
 * Lays out the content of a package (`owner`; undefined for the top level): classifiers and nested packages, each
 * nested one first as a block of its own. Relations across package borders are lifted to the direct children, so
 * dependent packages stand above each other like classes and every package stays a rectangle. The top level with
 * many packages gives the most promising arrangements of a search, the layered one among them.
 */
function blockChoices(m: ClassModel, edges: readonly LayerEdge[], owner: string | undefined): Block[] {
  const chain = chains(m);
  const lift = (id: string): string | undefined => {
    const c = chain(id);
    if (owner === undefined) return c.at(-1);
    const i = c.indexOf(owner);
    return i > 0 ? c[i - 1] : undefined;
  };
  const gridded = [...m.diagram.classifiers, ...m.diagram.associations];
  const filled = new Set(gridded.flatMap((c) => chain(c.id).slice(1)));
  const kids = [...gridded, ...m.diagram.packages.filter((p) => filled.has(p.id))]
    .filter((x) => (owner === undefined ? chain(x.id).length === 1 : chain(x.id)[1] === owner))
    .sort((a, b) => a.span.line - b.span.line)
    .map((x) => x.id);
  if (!kids.length) return [LEAF];
  const inner = new Map(kids.map((k) => [k, filled.has(k) ? (blockChoices(m, edges, k)[0] ?? LEAF) : LEAF]));
  const lifted = edges.flatMap((e): LayerEdge[] => {
    const from = lift(e.from);
    const to = lift(e.to);
    return from && to && from !== to && kids.includes(from) && kids.includes(to) ? [{ ...e, from, to }] : [];
  });
  const stated = edges.filter((e) => e.rank === 1 && kids.includes(e.from) && kids.includes(e.to));
  const agreed = lifted.filter((e) => e.rank === 0 || !stated.some((s) => s.from === e.to && s.to === e.from));
  const first = layerGraph({ nodes: kids, edges: agreed, maxPerLayer: CLASS.perLayer });
  const packages = kids.filter((k) => inner.get(k) !== LEAF).length;
  const cost = (a: Layered) => spread(stack(a, inner), inner, edges, lift);
  const search = owner === undefined && packages >= ARRANGE_FROM;
  const choices = search ? arrangements(first, agreed, CLASS.perLayer, cost, CHOICES) : [first];
  return choices.map((a) => {
    const stacked = stack(a, inner);
    const { cells, width } = flatten(stacked, inner);
    const rows = stacked.heights.reduce((x, y) => x + y, 0);
    return { cells, rows, cross: width, anchor: anchorOf(cells, width, edges) };
  });
}

/**
 * The automatic grid of a class diagram: a cell per classifier and diamond, each package one connected rectangle of
 * cells. Columns are half columns, so a class can stand in the middle between two others. With many packages on the
 * top level there are several grids to try, the most promising first.
 */
export function classCells(m: ClassModel): ReadonlyMap<string, Cell>[] {
  return blockChoices(m, classGraph(m, m.diagram.packages.length > 0).edges, undefined).map((b) => b.cells);
}
