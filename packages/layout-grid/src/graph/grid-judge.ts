import { checkPlacement } from '@diagrist/core';
import { type Trade, tradeOf, trades } from '../layered/detour.js';
import { linesOfLaid } from '../score.js';
import type { GridSpec } from '../spec.js';
import type { CellLayout } from './cells.js';

/** A laid out grid as the check reads it: how often its placement breaks a rule, and its lines with their texts. */
interface Judged {
  readonly placement: number;
  readonly trade: Trade;
}

/** The findings of the placement check and the measures of the lines of a laid out grid; its boxes stay. */
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
  return { placement, trade: tradeOf(input, false) };
}

/**
 * Whether the grid laid out with its routes priced (`priced`) stays over the one laid out without (`plain`): the
 * routes are priced before their texts are placed, so the picture with its texts decides (ADR 0039). It stays where
 * its placement breaks no rule more often and its lines with their texts trade better by the rule of the detour.
 */
export function pricedStays(spec: GridSpec, plain: CellLayout, priced: CellLayout): boolean {
  const [a, b] = [judged(spec, plain), judged(spec, priced)];
  return b.placement <= a.placement && trades(a.trade, b.trade, 'score');
}
