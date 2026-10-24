import type { Layered } from '@diagrist/layout-grid';

/** Place of a classifier: its layer and its position in half columns; a classifier takes two half columns. */
export interface Cell {
  readonly row: number;
  readonly cross: number;
}

/** A laid out package or the whole diagram: its classifiers, height in layers, width in half columns. */
export interface Block {
  readonly cells: ReadonlyMap<string, Cell>;
  readonly rows: number;
  readonly cross: number;
  /** Half column of the classifiers with relations leaving the block; the block lines up with it. */
  readonly anchor: number;
}

/** A single classifier as a block. */
export const LEAF: Block = { cells: new Map(), rows: 1, cross: 2, anchor: 1 };

/** The top left cell of each block of one level, not yet shifted to start at 0, and the height of each layer. */
export interface Stacked {
  readonly corners: ReadonlyMap<string, Cell>;
  readonly heights: readonly number[];
}

/** Sets the blocks layer by layer, each as close to its position as the block to its left allows. */
export function stack(a: Layered, inner: ReadonlyMap<string, Block>): Stacked {
  const blockOf = (id: string) => inner.get(id) ?? LEAF;
  const heights = a.layers.map((layer) => Math.max(1, ...layer.map((n) => blockOf(n).rows)));
  const starts = heights.map((_, l) => heights.slice(0, l).reduce((x, y) => x + y, 0));
  const corners = new Map<string, Cell>();
  a.layers.forEach((layer, l) => {
    let end = Number.NEGATIVE_INFINITY;
    for (const n of layer) {
      const b = blockOf(n);
      const cross = Math.max(end, Math.round(2 * (a.position.get(n) ?? 0) - (b.anchor - 1)));
      corners.set(n, { row: starts[l] ?? 0, cross });
      end = cross + b.cross;
    }
  });
  return { corners, heights };
}

/** The leftmost half column of a level. */
export const leftOf = (s: Stacked): number => Math.min(...[...s.corners.values()].map((c) => c.cross));

/** Every classifier of the level and of the blocks in it at its cell, starting at half column 0, and the width. */
export function flatten(s: Stacked, inner: ReadonlyMap<string, Block>): { cells: Map<string, Cell>; width: number } {
  const left = leftOf(s);
  const cells = new Map<string, Cell>();
  let width = 0;
  for (const [n, at] of s.corners) {
    const b = inner.get(n) ?? LEAF;
    const shift = { row: at.row, cross: at.cross - left };
    width = Math.max(width, shift.cross + b.cross);
    if (b === LEAF) cells.set(n, shift);
    for (const [id, c] of b.cells) cells.set(id, { row: c.row + shift.row, cross: c.cross + shift.cross });
  }
  return { cells, width };
}
