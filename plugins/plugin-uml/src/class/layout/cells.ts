import { type LayerEdge, layerGraph } from '@diagrist/layout-grid';
import type { ClassModel } from '../model.js';
import { classGraph } from './graph.js';
import { CLASS } from './metrics.js';

/** Place of a classifier: its layer and its position in half columns; a classifier takes two half columns. */
export interface Cell {
  readonly row: number;
  readonly cross: number;
}

/** A laid out package or the whole diagram: its classifiers, height in layers, width in half columns. */
interface Block {
  readonly cells: ReadonlyMap<string, Cell>;
  readonly rows: number;
  readonly cross: number;
  /** Half column of the classifiers with relations leaving the block; the block lines up with it. */
  readonly anchor: number;
}

const LEAF: Block = { cells: new Map(), rows: 1, cross: 2, anchor: 1 };

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
 * dependent packages stand above each other like classes and every package stays a rectangle.
 */
function blockOf(m: ClassModel, edges: readonly LayerEdge[], owner: string | undefined): Block {
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
  if (!kids.length) return LEAF;
  const inner = new Map(kids.map((k) => [k, filled.has(k) ? blockOf(m, edges, k) : LEAF]));
  const lifted = edges.flatMap((e): LayerEdge[] => {
    const from = lift(e.from);
    const to = lift(e.to);
    return from && to && from !== to && kids.includes(from) && kids.includes(to) ? [{ ...e, from, to }] : [];
  });
  const stated = edges.filter((e) => e.rank === 1 && kids.includes(e.from) && kids.includes(e.to));
  const agreed = lifted.filter((e) => e.rank === 0 || !stated.some((s) => s.from === e.to && s.to === e.from));
  const { layers, position } = layerGraph({ nodes: kids, edges: agreed, maxPerLayer: CLASS.perLayer });
  const blockOfId = (id: string): Block => inner.get(id) ?? LEAF;
  const heights = layers.map((layer) => Math.max(1, ...layer.map((n) => blockOfId(n).rows)));
  const starts = heights.map((_, l) => heights.slice(0, l).reduce((x, y) => x + y, 0));
  const placed = new Map<string, Cell>();
  layers.forEach((layer, l) => {
    let end = Number.NEGATIVE_INFINITY;
    for (const n of layer) {
      const b = blockOfId(n);
      const cross = Math.max(end, Math.round(2 * (position.get(n) ?? 0) - (b.anchor - 1)));
      placed.set(n, { row: starts[l] ?? 0, cross });
      end = cross + b.cross;
    }
  });
  const left = Math.min(...[...placed.values()].map((c) => c.cross));
  const cells = new Map<string, Cell>();
  let width = 0;
  for (const [n, at] of placed) {
    const b = blockOfId(n);
    const shift = { row: at.row, cross: at.cross - left };
    width = Math.max(width, shift.cross + b.cross);
    if (b === LEAF) cells.set(n, shift);
    for (const [id, c] of b.cells) cells.set(id, { row: c.row + shift.row, cross: c.cross + shift.cross });
  }
  const rows = heights.reduce((a, b) => a + b, 0);
  return { cells, rows, cross: width, anchor: anchorOf(cells, width, edges) };
}

/**
 * The automatic grid of a class diagram: a cell per classifier and diamond, each package one connected rectangle of
 * cells. Columns are half columns, so a class can stand in the middle between two others.
 */
export function classCells(m: ClassModel): ReadonlyMap<string, Cell> {
  return blockOf(m, classGraph(m, m.diagram.packages.length > 0).edges, undefined).cells;
}
