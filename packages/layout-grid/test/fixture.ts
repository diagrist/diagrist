import type { Rect } from '@diagrist/core';
import type { GridEdge, GridGroup, GridMetrics, GridNode, GridSpec } from '../src/index.js';

/** The measures of the standard look, so numbers in tests read like those of real pictures. */
export const METRICS: GridMetrics = {
  grid: 8,
  nodeW: 192,
  nodeH: 56,
  colGap: 136,
  subColGap: 104,
  rowGap: 120,
  marginX: 48,
  firstRowY: 128,
  margin: 32,
  laneGap: 16,
  portSpread: 16,
  loopReach: 32,
  framePad: { top: 56, bottom: 24, x: 24 },
  labelFont: { size: 10 },
  labelLineH: 12,
  labelGap: 10,
};

export const PADS = { top: 56, bottom: 24, left: 24, right: 24 } as const;

/** A spec from `cols` and `rows` given as words, nodes placed with `id@col/row`. */
export function spec(
  cols: string,
  rows: string,
  nodes: readonly (string | GridNode)[],
  more: Partial<Omit<GridSpec, 'cols' | 'rows' | 'nodes'>> = {},
): GridSpec {
  return {
    cols: cols.split(' ').map((name) => ({ name })),
    rows: rows.split(' ').map((name) => ({ name })),
    nodes: nodes.map((n) => {
      if (typeof n !== 'string') return n;
      const [id = '', at = ''] = n.split('@');
      const [col = '', row = ''] = at.split('/');
      return { id, col, row };
    }),
    groups: [],
    edges: [],
    metrics: METRICS,
    adaptive: false,
    ...more,
  };
}

export const edge = (from: string, to: string, more: Partial<GridEdge> = {}): GridEdge => ({
  id: `${from}-${to}`,
  from,
  to,
  ...more,
});

export const group = (id: string, members: readonly string[], more: Partial<GridGroup> = {}): GridGroup => ({
  id,
  members,
  pads: PADS,
  ...more,
});

export const inside = (a: Rect, b: Rect): boolean =>
  a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;

export const overlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
