import { type LineInput, type LineMetrics, type LineThresholds, lineFindings, lineMetrics } from '@diagrist/core';
import { DETOUR, scoreOf } from '../score.js';
import { type Arrangement, arrange } from './arrange.js';
import { finish, type LayeredLayout } from './finish.js';
import { layeredLines } from './output.js';
import { railChoices } from './rail-search.js';
import type { LayeredSpec } from './spec.js';

/** The findings of the line check that no saving of length may buy. */
const KEPT = ['through', 'ports', 'label', 'parallel', 'jog', 'lead', 'tail'] as const;

/**
 * A picture measured once for the rule of the detour: its line measures, its kept findings by rule and its score,
 * reckoned when first asked.
 */
export interface Trade {
  readonly metrics: LineMetrics;
  readonly kept: readonly number[];
  readonly cost: () => number;
}

/**
 * The measures of a picture that `trades` compares, under `thresholds` of the line check; without `centring` its
 * score leaves the centring of boxes out.
 */
export function tradeOf(input: LineInput, centring = true, thresholds: Partial<LineThresholds> = {}): Trade {
  const found = lineFindings(input, { ...thresholds, crossingsUpTo: 0 });
  let cost: number | undefined;
  return {
    metrics: lineMetrics(input),
    kept: KEPT.map((r) => found.filter((f) => f.rule === r).length),
    cost: () => {
      cost ??= scoreOf(input, thresholds, centring).cost;
      return cost;
    },
  };
}

/**
 * Whether the picture `b` trades better than `a` by the rule of the detour (owner decision D2 of 07.11.2026): it has
 * no more lines on one another and breaks no rule of `KEPT` more often, and its crossings and length together cost
 * less, a crossing worth `DETOUR` pixels. Of two pictures with as many crossings, `even` decides: the shorter, or with
 * `score` the cheaper by `scoreOf`, which also weighs bends.
 */
export function trades(a: Trade, b: Trade, even: 'length' | 'score' = 'length'): boolean {
  const [x, y] = [a.metrics, b.metrics];
  if (y.overlaps > x.overlaps || b.kept.some((n, i) => n > (a.kept[i] ?? 0))) return false;
  if (even === 'score' && y.crossings === x.crossings) return b.cost() < a.cost() - 1e-6;
  return DETOUR * (y.crossings - x.crossings) + (y.length - x.length) < 0;
}

/**
 * A picture laid out in the order of fewest crossings and, where the order stage found them, also in the order of
 * shorter lines (`Arrangement.shorter`) and the order of hanging rows (`Arrangement.hanging`); each in turn stays
 * where its drawing trades better than the one kept so far (`trades`). The order stage only estimates where boxes
 * will stand, so the drawing decides: the orders are drawn without the passes that move boxes to straighten lines, and
 * only the one that stays is laid out in full.
 */
function laidFrom(
  spec: LayeredSpec,
  arranged: Arrangement,
  release: (layout: LayeredLayout) => LayeredLayout,
  outer: LayeredSpec,
): LayeredLayout {
  const others = [arranged.shorter, arranged.hanging].filter((l) => l !== undefined);
  if (others.length === 0) return release(finish(spec, arranged));
  const rough = (layers: string[][]) =>
    layeredLines(outer, release(finish(spec, { ...arranged, layers, rough: true })));
  let kept = { layers: arranged.layers, trade: tradeOf(rough(arranged.layers)) };
  for (const layers of others) {
    const trade = tradeOf(rough(layers));
    if (trades(kept.trade, trade)) kept = { layers, trade };
  }
  return release(finish(spec, { ...arranged, layers: kept.layers }));
}

/**
 * A picture laid out as `laidFrom` lays out its arrangement. Where rails stood inside its first order, it is laid
 * out with every other choice of their sides as well (`railChoices`), and the cheapest picture by `scoreOf` stays,
 * the first on a tie. `release` turns a layout into the one drawn, and `outer` is the spec it is read by.
 */
export function laidOut(
  spec: LayeredSpec,
  release: (layout: LayeredLayout) => LayeredLayout = (l) => l,
  outer: LayeredSpec = spec,
): LayeredLayout {
  const first = arrange(spec);
  const choices = railChoices(spec, first);
  const laid = laidFrom(spec, first, release, outer);
  if (choices.length === 0) return laid;
  const price = (layout: LayeredLayout) => ({ layout, cost: scoreOf(layeredLines(outer, layout)).cost });
  return choices
    .map((a) => price(laidFrom(spec, a, release, outer)))
    .reduce((a, b) => (b.cost < a.cost ? b : a), price(laid)).layout;
}
