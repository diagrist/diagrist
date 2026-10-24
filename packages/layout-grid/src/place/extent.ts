import type { GridGroup, GridNode, GridSpec } from '../spec.js';

/** Where a node lies in its area: last column and row, its slot, and whether slots stack across rows. */
export interface Partition {
  readonly end: string;
  readonly endRow: string;
  readonly index: number;
  readonly count: number;
  readonly axis: 'cols' | 'rows';
}

export function partition(n: GridNode): Partition {
  const index = n.slot?.index ?? 1;
  const count = n.slot?.count ?? 1;
  const end = n.to?.col ?? n.col;
  const endRow = n.to?.row ?? n.row;
  const axis = endRow !== n.row && end === n.col ? 'rows' : 'cols';
  return { end, endRow, index, count, axis };
}

/** First and last column and row index an area covers; an unknown name gives -1. */
export interface Extent {
  readonly cols: readonly [number, number];
  readonly rows: readonly [number, number];
}

/** Lookups on a spec that the placement steps share; built once per spec. */
export interface Tree {
  readonly spec: GridSpec;
  readonly node: (id: string) => GridNode | undefined;
  readonly group: (id: string) => GridGroup | undefined;
  readonly colNames: readonly string[];
  readonly rowNames: readonly string[];
}

export function treeOf(spec: GridSpec): Tree {
  const nodes = new Map(spec.nodes.map((n) => [n.id, n]));
  const groups = new Map(spec.groups.map((g) => [g.id, g]));
  return {
    spec,
    node: (id) => nodes.get(id),
    group: (id) => groups.get(id),
    colNames: spec.cols.map((c) => c.name),
    rowNames: spec.rows.map((r) => r.name),
  };
}

/** Grid area of a node, including its span. */
export function nodeExtent(tree: Tree, id: string): Extent | undefined {
  const n = tree.node(id);
  if (!n) return undefined;
  const p = partition(n);
  return {
    cols: [tree.colNames.indexOf(n.col), tree.colNames.indexOf(p.end)],
    rows: [tree.rowNames.indexOf(n.row), tree.rowNames.indexOf(p.endRow)],
  };
}

/** How deep a frame is nested: 0 for a frame without parent. A cycle of parents ends the count. */
export function depth(tree: Tree, g: GridGroup): number {
  const seen = new Set<string>();
  let d = 0;
  for (let p = g.parent; p !== undefined && !seen.has(p); p = tree.group(p)?.parent) {
    if (!tree.group(p)) break;
    seen.add(p);
    d++;
  }
  return d;
}

/** Does `inner` lie in `outer`, directly or over more levels? A frame does not lie in itself. */
export function isWithin(tree: Tree, inner: GridGroup, outer: GridGroup): boolean {
  const seen = new Set<string>();
  for (let p = inner.parent; p !== undefined && !seen.has(p); p = tree.group(p)?.parent) {
    if (p === outer.id) return true;
    seen.add(p);
  }
  return false;
}

/** The frame itself and all frames nested in it, in the order of the spec. */
export const innerGroups = (tree: Tree, g: GridGroup): GridGroup[] =>
  tree.spec.groups.filter((c) => c === g || isWithin(tree, c, g));

/** Grid area of a frame: the areas of all nodes in it and its nested frames, and the columns they cover. */
export function groupExtent(tree: Tree, g: GridGroup): Extent | undefined {
  const inner = innerGroups(tree, g);
  const extents = inner.flatMap((c) => c.members.flatMap((m) => nodeExtent(tree, m) ?? []));
  if (!extents.length) return undefined;
  const covered = inner.flatMap((c) => (c.cover ? [tree.colNames.indexOf(c.cover)] : []));
  const cols = [...extents.flatMap((e) => e.cols), ...covered.filter((i) => i >= 0)];
  return {
    cols: [Math.min(...cols), Math.max(...cols)],
    rows: [Math.min(...extents.map((e) => e.rows[0])), Math.max(...extents.map((e) => e.rows[1]))],
  };
}

/** The frame a node lies in directly; the first one listing it. */
export function homeOf(tree: Tree, nodeId: string): GridGroup | undefined {
  return tree.spec.groups.find((g) => g.members.includes(nodeId));
}
