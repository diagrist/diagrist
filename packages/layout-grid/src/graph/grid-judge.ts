import { checkPlacement, DEFAULT_THRESHOLDS } from '@diagrist/core';
import { type Trade, tradeOf, trades } from '../layered/detour.js';
import { linesOfLaid } from '../score.js';
import type { GridSpec } from '../spec.js';
import type { CellLayout } from './cells.js';

/** A laid out grid as the check reads it: how often its placement breaks a rule, and its lines with their texts. */
interface Judged {
  readonly placement: number;
  readonly trade: Trade;
}

/**
 * The findings of the placement check and the measures of the lines of a laid out grid; its boxes stay, and a text
 * may stand as far from its line as the grid sets it (`labelGap`).
 */
function judged(spec: GridSpec, laid: CellLayout): Judged {
  const grid = laid.grid;
  const ends = new Map(spec.edges.map((e) => [e.id, [e.from, e.to] as const]));
  const input = linesOfLaid({
    nodes: grid.nodes,
    routes: laid.routes,
    ends: laid.routes.map((r) => ends.get(r.edge) ?? ['', '']),
    labels: laid.labels,
    frames: grid.groups.map((g) => ({ id: g.id, rect: g.rect })),
    width: grid.width,
    height: grid.bottom,
  });
  const placement = checkPlacement(laid.placed, { width: grid.width, height: grid.bottom }).length;
  const labelNear = Math.max(DEFAULT_THRESHOLDS.labelNear, spec.metrics.labelGap);
  return { placement, trade: tradeOf(input, false, { labelNear }) };
}

/**
 * Whether the laid out grid `b` is better than `a` as the check reads them with their texts (ADR 0039): its placement
 * breaks no rule more often and its lines with their texts trade better by the rule of the detour.
 */
export function better(spec: GridSpec, a: CellLayout, b: CellLayout): boolean {
  const [x, y] = [judged(spec, a), judged(spec, b)];
  return y.placement <= x.placement && trades(x.trade, y.trade, 'score');
}
