import type { Column } from '../layout.js';
import type { GridNode } from '../spec.js';
import { partition, type Tree } from './extent.js';
import { reserveFrames } from './reserve.js';

const prefix = (name: string): string => name.split('.')[0] ?? name;

/**
 * Columns from left to right. Neighbours with the same prefix before a dot stand closer. An adaptive grid widens
 * columns to what their nodes ask and moves them apart for the pads of frames between them.
 */
export function columns(tree: Tree): { cols: Column[]; width: number } {
  const m = tree.spec.metrics;
  const cols: Column[] = [];
  let x = m.marginX;
  tree.spec.cols.forEach((c, i) => {
    const prev = tree.spec.cols[i - 1];
    if (prev) x += prefix(prev.name) === prefix(c.name) ? m.subColGap : m.colGap;
    const w = c.width ?? m.nodeW;
    cols.push({ name: c.name, x, w });
    x += w;
  });
  const reserved = tree.spec.adaptive ? reserveFrames(fitColumns(cols, tree), tree) : { cols, trailing: 0 };
  const last = reserved.cols.at(-1);
  return { cols: reserved.cols, width: last ? last.x + last.w + m.marginX + reserved.trailing : x + m.marginX };
}

function demand(n: GridNode, nodeW: number): { readonly width: number; readonly exact: boolean } {
  if (n.demand) return n.demand;
  return n.width !== undefined ? { width: n.width, exact: true } : { width: nodeW, exact: false };
}

/**
 * Widths after the nodes' demands: a column of only exact demands takes the widest of them, then every node that
 * needs more than its columns and gaps offer spreads the rest evenly over its columns. Gaps stay.
 */
function fitColumns(cols: readonly Column[], tree: Tree): Column[] {
  const m = tree.spec.metrics;
  const nodes = tree.spec.nodes;
  const widths = cols.map((c) => c.w);
  const gaps = cols.slice(1).map((c, i) => c.x - ((cols[i] as Column).x + (cols[i] as Column).w));
  cols.forEach((c, i) => {
    const own = nodes.filter((n) => n.col === c.name && partition(n).end === c.name);
    const needs = own.map((n) => demand(n, m.nodeW));
    if (needs.length && needs.every((d) => d.exact)) widths[i] = Math.max(...needs.map((d) => d.width));
  });
  for (const n of nodes) {
    const p = partition(n);
    const lo = cols.findIndex((c) => c.name === n.col);
    const hi = cols.findIndex((c) => c.name === p.end);
    if (lo < 0 || hi < lo) continue;
    const count = p.axis === 'cols' ? p.count : 1;
    const needed = demand(n, m.nodeW).width * count + m.subColGap * (count - 1);
    const available =
      widths.slice(lo, hi + 1).reduce((a, b) => a + b, 0) + gaps.slice(lo, hi).reduce((a, b) => a + b, 0);
    const extra = Math.max(0, needed - available) / (hi - lo + 1);
    for (let i = lo; i <= hi; i++) widths[i] = (widths[i] as number) + extra;
  }
  let x = cols[0]?.x ?? m.marginX;
  return cols.map((c, i) => {
    const result = { name: c.name, x, w: widths[i] as number };
    x += result.w + (gaps[i] ?? 0);
    return result;
  });
}
