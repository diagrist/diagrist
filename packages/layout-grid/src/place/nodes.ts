import type { Rect } from '@diagrist/core';
import type { Column, PlacedNode, Row } from '../layout.js';
import type { GridNode } from '../spec.js';
import { partition, type Tree } from './extent.js';

/**
 * Rectangle of every node whose column and row exist, in the order of the spec. A node fills its cell, in an adaptive
 * grid its slot of the area up to `to`. Own width and height put it in the middle; a circle becomes the square
 * around it in the middle of its place.
 */
export function placeNodes(tree: Tree, cols: readonly Column[], rows: readonly Row[]): PlacedNode[] {
  return tree.spec.nodes.flatMap((n): PlacedNode[] => {
    const ci = cols.findIndex((c) => c.name === n.col);
    const ri = rows.findIndex((r) => r.name === n.row);
    const col = cols[ci];
    const row = rows[ri];
    if (!col || !row) return [];
    const own = n.shape === 'circle' ? undefined : n.width;
    const base: Rect =
      own !== undefined && !tree.spec.adaptive
        ? { x: col.x + col.w / 2 - own / 2, y: row.y, w: own, h: row.h }
        : { x: col.x, y: row.y, w: col.w, h: row.h };
    const fitted = tree.spec.adaptive ? slotRect(n, own, base, cols, rows, tree.spec.metrics.subColGap) : base;
    const height = n.shape === 'circle' ? undefined : n.height;
    const sized =
      height !== undefined && height < fitted.h
        ? { ...fitted, y: fitted.y + (fitted.h - height) / 2, h: height }
        : fitted;
    const rect = n.shape === 'circle' ? circleRect(sized, n.width ?? 0) : sized;
    return [{ id: n.id, rect, col: ci, row: ri }];
  });
}

/** The square of a circle with diameter `d` in the middle of `rect`. */
function circleRect(rect: Rect, d: number): Rect {
  const r = d / 2;
  return { x: rect.x + rect.w / 2 - r, y: rect.y + rect.h / 2 - r, w: 2 * r, h: 2 * r };
}

/**
 * Rectangle in the area of an adaptive grid. Across columns the node grows in width; across rows it keeps its height,
 * and slots spread evenly between the middles of the first and the last row. Own width stands in the middle.
 */
function slotRect(
  n: GridNode,
  fixed: number | undefined,
  rect: Rect,
  cols: readonly Column[],
  rows: readonly Row[],
  subColGap: number,
): Rect {
  const p = partition(n);
  const end = cols.find((c) => c.name === p.end);
  const endRow = rows.find((r) => r.name === p.endRow);
  if (!end || !endRow) return rect;
  const range = { x: rect.x, w: end.x + end.w - rect.x, y: rect.y, h: endRow.y + endRow.h - rect.y };
  if (p.axis === 'rows') {
    const first = rect.y + rect.h / 2;
    const last = endRow.y + endRow.h / 2;
    const at = p.count === 1 ? (first + last) / 2 : first + ((last - first) * (p.index - 1)) / (p.count - 1);
    const placed = { ...rect, y: at - rect.h / 2 };
    return fixed !== undefined && fixed < rect.w ? { ...placed, x: rect.x + (rect.w - fixed) / 2, w: fixed } : placed;
  }
  const width = (range.w - subColGap * (p.count - 1)) / p.count;
  const y = range.h > rect.h ? range.y + (range.h - rect.h) / 2 : rect.y;
  const x = rect.x + (p.index - 1) * (width + subColGap);
  return fixed !== undefined && fixed < width
    ? { ...rect, x: x + (width - fixed) / 2, w: fixed, y }
    : { ...rect, x, w: width, y };
}
