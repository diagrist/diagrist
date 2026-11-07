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
    gutters: {
      cols: middles(cols, (c) => [c.x, c.w]),
      rows: middles(placedRows, (r) => [r.y, r.h]),
      margins: {
        cols: beyond(
          spec.metrics.laneGap,
          cols.map((c) => [c.x, c.w]),
          groups.map((g) => [g.rect.x, g.rect.w]),
        ),
        rows: beyond(
          spec.metrics.laneGap,
          placedRows.map((r) => [r.y, r.h]),
          groups.map((g) => [g.rect.y, g.rect.h]),
        ),
      },
    },
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

/**
 * The lanes beyond the first and the last track of an axis, so a line there runs outside every frame (owner decision
 * D1 of 07.11.2026): one lane gap outside the outermost frame, as far from it as a track from a box, and two outside
 * the outermost track, so a line turning from the lane into a box runs straight long enough for its head.
 */
function beyond(
  gap: number,
  tracks: readonly (readonly [number, number])[],
  frames: readonly (readonly [number, number])[],
): [number, number] {
  if (tracks.length + frames.length === 0) return [0, 0];
  const out = (spans: readonly (readonly [number, number])[], by: number): [number, number] => [
    Math.min(...spans.map(([at]) => at - by)),
    Math.max(...spans.map(([at, size]) => at + size + by)),
  ];
  const [a, b] = [out(tracks, 2 * gap), out(frames, gap)];
  return [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
}
