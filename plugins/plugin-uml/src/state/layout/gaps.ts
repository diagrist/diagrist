import type { Transition } from '../diagram.js';
import { isInside, type StateModel } from '../model.js';
import { labelLines, labelWidth } from './labels.js';
import { STATE as S } from './metrics.js';

/** Column and row index of a placed vertex in the grid. */
export type GridAt = (id: string) => { readonly col: number; readonly row: number } | undefined;

/** Grid places of the labelled transitions: source and target as column and row index. */
function spans(m: StateModel, at: GridAt) {
  return m.diagram.transitions.flatMap((t) => {
    const [a, b] = [at(t.from), at(t.to)];
    const lines = labelLines(t, m.diagram.protocol);
    return a && b && lines.length ? [{ a, b, lines, t, self: t.from === t.to }] : [];
  });
}

/**
 * Gap between columns. Across the flow, room for rails and side labels suffices; where source and target stand side
 * by side, the label has to fit into the gap.
 */
export function stateColumnGap(m: StateModel, at: GridAt): number {
  const needs = spans(m, at)
    .filter((x) => !x.self && x.a.row === x.b.row)
    .map((x) => labelWidth(x.lines) + 2 * S.labelAir);
  const least = 4 * S.laneGap + S.labelAir;
  return Math.ceil(Math.max(least, ...needs) / S.grid) * S.grid;
}

/**
 * Extra gap below row `row`: the more labelled transitions cross it, the more room their texts get, so they stand
 * staggered beside their lines. Going down, lines that run outside around a composite state do not carry their text
 * in its gaps, and texts of columns far apart do not disturb each other.
 */
export function stateRowGap(
  m: StateModel,
  at: GridAt,
  frames: ReadonlyMap<string, readonly [number, number]>,
  row: number,
): number {
  const all = spans(m, at);
  const across = all.filter((x) => !x.self && Math.min(x.a.row, x.b.row) <= row && Math.max(x.a.row, x.b.row) > row);
  const down = m.diagram.direction !== 'right';
  const open = [...frames].filter(([, rows]) => rows[0] <= row && rows[1] > row).map(([id]) => id);
  const within = (id: string, frame: string) => id === frame || isInside(m, id, frame);
  const outside = (t: Transition) => open.some((f) => ![t.from, t.to].some((id) => within(id, f)));
  const crossing = down ? across.filter((x) => !outside(x.t)) : across;
  if (!crossing.length) return 0;
  const lines = Math.max(...crossing.map((x) => x.lines.length));
  const stack = lines * S.labelLineH + 2 * S.labelGap;
  const near = (x: (typeof crossing)[number]) => crossing.filter((y) => Math.abs(y.a.col - x.a.col) <= 1).length;
  const peers = down ? Math.max(...crossing.map(near)) : crossing.length;
  return 56 + S.laneGap + Math.min(2, peers - 1) * stack;
}
