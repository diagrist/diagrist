import type { GridGap, GridWay } from '../../way.js';
import type { Board } from '../boxes.js';
import type { Plan } from '../grid.js';
import type { Lane } from '../shape.js';

/** A lane as `GridWay` names it, where it is a gap between tracks or a lane beyond them. */
const gapOf = (lane: Lane | undefined): GridGap | undefined | false => {
  if (!lane) return undefined;
  if (lane.outer) return { axis: lane.axis, index: lane.index, outer: true };
  return lane.index < 0 ? false : { axis: lane.axis, index: lane.index };
};

/** The way of a plan, for a later run to keep; none for a loop, a route the kind laid, or a Z off the gaps. */
export function wayOf(p: Plan): GridWay | undefined {
  if (p.shape === 'loop' || p.edge.route) return undefined;
  const [lane, via] = [gapOf(p.lane), gapOf(p.via)];
  if (lane === false || via === false || (p.shape === 'Z' && !lane)) return undefined;
  return {
    shape: p.shape,
    fromSide: p.fromSide,
    toSide: p.toSide,
    ...(lane ? { lane } : {}),
    ...(via ? { via } : {}),
  };
}

/** The lane of a gap on `board`, where the grid has it. */
function laneOf(board: Board, gap: GridGap): Lane | undefined {
  const g = board.layout.gutters;
  const mids = gap.axis === 'col' ? g.cols : g.rows;
  if (!gap.outer) {
    const at = mids[gap.index];
    return at === undefined ? undefined : { axis: gap.axis, index: gap.index, at, dir: 1 };
  }
  const margins = g.margins?.[gap.axis === 'col' ? 'cols' : 'rows'];
  if (!margins) return undefined;
  const low = gap.index < 0;
  return { axis: gap.axis, index: gap.index, at: low ? margins[0] : margins[1], dir: low ? -1 : 1, outer: true };
}

/** Whether a plan keeps the way of its edge (`GridEdge.way`). */
export const keeps = (p: Plan): boolean => p.edge.way !== undefined && p.shape !== 'loop' && !p.edge.route;

/** The plan of `p` along the way its edge keeps (`GridEdge.way`); `p` where it keeps none or the grid lacks a gap. */
export function kept(board: Board, p: Plan): Plan {
  const way = p.edge.way;
  if (!way || !keeps(p)) return p;
  const lane = way.lane && laneOf(board, way.lane);
  const via = way.via && laneOf(board, way.via);
  if ((way.lane && !lane) || (way.via && !via)) return p;
  const { via: _, ...rest } = p;
  return { ...rest, shape: way.shape, fromSide: way.fromSide, toSide: way.toSide, lane, ...(via ? { via } : {}) };
}
