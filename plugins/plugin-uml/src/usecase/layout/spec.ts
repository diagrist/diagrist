import { textWidth } from '@diagrist/core';
import type { GridNode, GridSpec } from '@diagrist/layout-grid';
import { isKnown } from '../diagram.js';
import type { UseCaseModel } from '../model.js';
import { actorSize } from './actor.js';
import type { AutoGrid } from './auto/grid.js';
import { useCaseSize } from './ellipse.js';
import { UC_FONTS, UC_GRID } from './metrics.js';

/** Where the name of a subject stands in its frame, from the top left corner. */
export const SUBJECT_TITLE = { x: 12, y: 20 } as const;

const PADS = { top: 56, bottom: 24, left: 24, right: 24 } as const;

/** Id of the edge of the relation at `index` in source order. */
export const edgeId = (index: number): string => `rel-${index}`;

/**
 * The grid spec of a use case diagram: columns and rows of the automatic grid, actors and use cases with their
 * own measures, subjects as frames around their use cases, relations as straight lines. Columns start empty and
 * grow to their widest element.
 */
export function useCaseSpec(m: UseCaseModel, grid: AutoGrid): GridSpec {
  const place = (id: string) => grid.places.get(id);
  const actors = m.diagram.actors.flatMap((a): GridNode[] => {
    const at = place(a.id);
    if (!at) return [];
    const size = actorSize(a);
    return [
      {
        id: a.id,
        col: at.col,
        row: at.row,
        ...(at.toRow ? { to: { row: at.toRow } } : {}),
        width: size.w,
        height: size.h,
        rowHeight: size.h,
        demand: { width: size.column, exact: true },
        shape: 'box',
        ...(size.caption ? { caption: size.caption } : {}),
        source: a.span,
      },
    ];
  });
  const cases = m.diagram.cases.flatMap((u): GridNode[] => {
    const at = place(u.id);
    if (!at) return [];
    const { w, h } = useCaseSize(u);
    const shape = u.classifier ? 'box' : 'ellipse';
    return [{ id: u.id, col: at.col, row: at.row, width: w, height: h, shape, source: u.span }];
  });
  const groups = m.diagram.subjects.flatMap((s) => {
    const members = m.diagram.cases.filter((u) => u.subject === s.id).map((u) => u.id);
    const minWidth = textWidth(s.label, UC_FONTS.name) + 2 * SUBJECT_TITLE.x;
    return members.length ? [{ id: s.id, members, pads: PADS, minWidth, source: s.span }] : [];
  });
  const edges = m.diagram.relations.flatMap((r, i) =>
    isKnown(r) ? [{ id: edgeId(i), from: r.from, to: r.to, source: r.span }] : [],
  );
  return {
    cols: grid.cols.map((name) => ({ name, width: 0 })),
    rows: grid.rows.map((name) => ({ name })),
    nodes: [...actors, ...cases],
    groups,
    edges,
    metrics: UC_GRID,
    adaptive: true,
    lines: 'straight',
  };
}
