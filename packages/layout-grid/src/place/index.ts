import type { Column, GridLayout, Row } from '../layout.js';
import type { GridSpec } from '../spec.js';
import { columns } from './columns.js';
import { treeOf } from './extent.js';
import { placeGroups } from './frames.js';
import { placeNodes } from './nodes.js';
import { rows } from './rows.js';

/**
 * Places columns, rows, nodes and frames of a grid. Nodes with an unknown column or row are left out; the kind
 * reports them. The same spec gives the same numbers: everything runs in the order of the spec.
 */
export function placeGrid(spec: GridSpec): GridLayout {
  const tree = treeOf(spec);
  const { cols, width } = columns(tree);
  const placedRows = rows(tree);
  const nodes = placeNodes(tree, cols, placedRows);
  const groups = placeGroups(tree, nodes, cols);
  const bottom = Math.max(
    spec.metrics.firstRowY,
    ...groups.map((g) => g.rect.y + g.rect.h),
    ...nodes.map((p) => p.rect.y + p.rect.h + spec.metrics.framePad.bottom),
  );
  return {
    cols,
    rows: placedRows,
    gutters: { cols: middles(cols, (c) => [c.x, c.w]), rows: middles(placedRows, (r) => [r.y, r.h]) },
    nodes,
    groups,
    width,
    bottom,
  };
}

/** Middles of the gaps between neighbouring tracks. */
function middles<T extends Column | Row>(tracks: readonly T[], span: (t: T) => readonly [number, number]): number[] {
  return tracks.slice(1).map((b, i) => {
    const [at, size] = span(tracks[i] as T);
    return (at + size + span(b)[0]) / 2;
  });
}
