import type { Row } from '../layout.js';
import type { GridNode } from '../spec.js';
import { type Extent, groupExtent, nodeExtent, partition, type Tree } from './extent.js';
import { topReserve } from './reserve.js';

const rowShare = (n: GridNode, nodeH: number): number => n.rowHeight ?? n.height ?? nodeH;

/** Rows from top to bottom: each as high as the highest node that asks of it, at least `rowMin` or `nodeH`. */
export function rows(tree: Tree): Row[] {
  const m = tree.spec.metrics;
  const out: Row[] = [];
  let y = m.firstRowY + topReserve(tree);
  for (const name of tree.rowNames) {
    const h = Math.max(
      m.rowMin ?? m.nodeH,
      ...tree.spec.nodes.filter((n) => n.row === name).map((n) => rowShare(n, m.nodeH)),
    );
    out.push({ name, y, h });
    y += h + rowGap(tree, name);
  }
  return out;
}

/** Does a frame cover nodes of the other row within its columns? */
function spansNodes(tree: Tree, e: Extent, row: number): boolean {
  return tree.spec.nodes.some((n) => {
    const x = nodeExtent(tree, n.id);
    return x !== undefined && x.rows[1] === row && x.cols[0] <= e.cols[1] && x.cols[1] >= e.cols[0];
  });
}

/**
 * Frame pads between row `row` and the next: heads of frames opening, feet of frames closing. Nested frames in one
 * column add up, frames side by side do not. `stacked` when one frame ends where the next begins, like layer bands.
 */
function framesBetween(tree: Tree, row: number): { space: number; stacked: boolean } {
  const space = tree.colNames.map(() => 0);
  const closes = new Set<number>();
  const opens = new Set<number>();
  for (const g of tree.spec.groups) {
    const e = groupExtent(tree, g);
    if (!e) continue;
    const opening = e.rows[0] === row + 1 && spansNodes(tree, e, row);
    const closing = e.rows[1] === row && spansNodes(tree, e, row + 1);
    const add = (opening ? g.pads.top : 0) + (closing ? g.pads.bottom : 0);
    for (let c = e.cols[0]; c <= e.cols[1]; c++) {
      const before = space[c];
      if (before !== undefined) space[c] = before + add;
      if (opening) opens.add(c);
      if (closing) closes.add(c);
    }
  }
  const stacked = [...opens].some((c) => closes.has(c));
  return { space: Math.max(0, ...space), stacked };
}

function endRows(tree: Tree, id: string): readonly [number, number] | undefined {
  const node = nodeExtent(tree, id);
  if (node) return node.rows;
  const group = tree.group(id);
  return group ? groupExtent(tree, group)?.rows : undefined;
}

/** Does an edge without lane cross the border between this row and the next? */
function crossed(tree: Tree, row: number): boolean {
  return tree.spec.edges.some((e) => {
    if (e.lane) return false;
    const a = endRows(tree, e.from);
    const b = endRows(tree, e.to);
    if (!a || !b) return false;
    return (a[1] <= row && b[0] > row) || (b[1] <= row && a[0] > row);
  });
}

/**
 * Gap below a row. Straight lines need no corridors, only room for frames ending or starting there. A fixed grid
 * keeps its gap. An adaptive one adds what slots stacked across rows need.
 */
function rowGap(tree: Tree, name: string): number {
  const m = tree.spec.metrics;
  const i = tree.rowNames.indexOf(name);
  if (tree.spec.lines === 'straight') {
    const frames = framesBetween(tree, i).space;
    return m.rowGap + (frames ? frames + m.laneGap : 0);
  }
  const base = Math.max(baseGap(tree, name), tree.spec.rows[i]?.gap ?? 0);
  if (!tree.spec.adaptive) return base;
  let extra = 0;
  for (const n of tree.spec.nodes) {
    const p = partition(n);
    const e = nodeExtent(tree, n.id);
    if (!e || p.axis !== 'rows' || e.rows[0] > i || e.rows[1] <= i) continue;
    const needed = (p.count - 1) * (m.nodeH + m.laneGap * 2);
    const gaps = tree.rowNames.slice(e.rows[0], e.rows[1]).map((r) => baseGap(tree, r));
    const available = (e.rows[1] - e.rows[0]) * m.nodeH + gaps.reduce((a, b) => a + b, 0);
    extra = Math.max(extra, Math.max(0, needed - available) / gaps.length);
  }
  return base + Math.ceil(extra);
}

/**
 * Gap of an adaptive grid: long edges leaving the row (over more than one row) get their own corridors, frames their
 * pads. Stacked frames without edges between them need only a slit. Rows with the same prefix before a dot stand close.
 */
function baseGap(tree: Tree, row: string): number {
  const m = tree.spec.metrics;
  if (!tree.spec.adaptive) return m.rowGap;
  const names = tree.rowNames;
  const long = tree.spec.edges.filter((e) => {
    if (e.bundle) return false;
    const from = tree.node(e.from);
    const to = tree.node(e.to);
    return from?.row === row && to && Math.abs(names.indexOf(row) - names.indexOf(to.row)) > 1;
  });
  const i = names.indexOf(row);
  const { space: frames, stacked } = framesBetween(tree, i);
  if (stacked && !long.length && !crossed(tree, i)) return frames + m.laneGap / 2;
  const next = names[i + 1];
  const tight = next !== undefined && row.includes('.') && row.split('.')[0] === next.split('.')[0];
  return (
    (m.rowOverhang ?? 0) +
    Math.max(
      tight ? Math.min(m.subColGap, m.nodeH + m.laneGap) : m.nodeH + m.laneGap,
      long.length * (m.laneGap + m.labelLineH * 2),
      frames ? frames + m.laneGap * 3 : 0,
    )
  );
}
