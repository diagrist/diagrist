import type { Column } from '../layout.js';
import { groupExtent, type Tree } from './extent.js';

/**
 * Frames need room between columns: the pads of all frames ending and starting there, nested ones adding up, frames
 * above each other not, and a lane between neighbouring frames. Tight columns move apart for it. At the outer edges only what goes beyond the usual pad
 * counts; `trailing` is the extra on the right. Last, columns right of a frame whose head is wider than the frame
 * move further.
 */
export function reserveFrames(cols: readonly Column[], tree: Tree): { cols: Column[]; trailing: number } {
  const pad = tree.spec.metrics.framePad;
  const rows = tree.rowNames.length;
  const grid = () => cols.map(() => Array.from({ length: rows }, () => 0));
  const open = grid();
  const close = grid();
  for (const g of tree.spec.groups) {
    const e = groupExtent(tree, g);
    if (!e) continue;
    for (let r = e.rows[0]; r <= e.rows[1]; r++) {
      add(open, e.cols[0], r, g.pads.left);
      add(close, e.cols[1], r, g.pads.right);
    }
  }
  const opening = open.map((c) => Math.max(0, ...c));
  const closing = close.map((c) => Math.max(0, ...c));
  const lead = Math.max(0, (opening[0] ?? 0) - pad.x);
  const trailing = Math.max(0, (closing.at(-1) ?? 0) - pad.x);
  const air = tree.spec.metrics.laneGap;
  let shift = lead;
  const shifted = cols.map((c, i) => {
    const prev = cols[i - 1];
    if (prev) {
      const gap = c.x - (prev.x + prev.w);
      const frames = (closing[i - 1] as number) + (opening[i] as number);
      if (frames > 0) shift += Math.max(0, frames + air - gap);
    }
    return { ...c, x: c.x + shift };
  });
  return { cols: headRoom(shifted, tree), trailing };
}

function add(cells: number[][], col: number, row: number, value: number): void {
  const column = cells[col];
  if (column === undefined || column[row] === undefined) return;
  column[row] += value;
}

function headRoom(cols: Column[], tree: Tree): Column[] {
  const out = [...cols];
  for (const g of tree.spec.groups) {
    const e = groupExtent(tree, g);
    const first = e && out[e.cols[0]];
    const last = e && out[e.cols[1]];
    if (!e || !first || !last) continue;
    const span = last.x + last.w - first.x;
    const need = g.minWidth ?? 0;
    const more = need ? Math.max(0, need - (span + g.pads.left + g.pads.right)) : 0;
    if (more > 0)
      for (let i = e.cols[1] + 1; i < out.length; i++)
        out[i] = { ...(out[i] as Column), x: (out[i] as Column).x + more };
  }
  return out;
}

/**
 * Extra room above the first row of an adaptive grid: where several nested frames open at the first row, their heads
 * add up. One frame fits without extra; each further one pushes the rows down, rounded up to the grid.
 */
export function topReserve(tree: Tree): number {
  const m = tree.spec.metrics;
  if (!tree.spec.adaptive) return 0;
  const stack = tree.colNames.map(() => 0);
  for (const g of tree.spec.groups) {
    const e = groupExtent(tree, g);
    if (e?.rows[0] !== 0) continue;
    for (let c = e.cols[0]; c <= e.cols[1]; c++) {
      const below = stack[c];
      if (below !== undefined) stack[c] = below + g.pads.top;
    }
  }
  const need = Math.max(0, ...stack) - m.framePad.top;
  return need > 0 ? Math.ceil(need / m.grid) * m.grid : 0;
}
