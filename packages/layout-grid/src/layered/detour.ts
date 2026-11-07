import { type LineInput, lineFindings, lineMetrics } from '@diagrist/core';
import { DETOUR, scoreOf } from '../score.js';
import { type Arrangement, arrange } from './arrange.js';
import { finish, type LayeredLayout } from './finish.js';
import { layeredLines } from './output.js';
import { railChoices } from './rail-search.js';
import type { LayeredSpec } from './spec.js';

/** The findings of the line check that no saving of length may buy. */
const KEPT = ['through', 'ports', 'label', 'parallel', 'jog', 'lead', 'tail'] as const;

/**
 * Whether the picture `b` trades better than `a` by the rule of the detour: its crossings and length together cost
 * less, a crossing worth `DETOUR` pixels, and it has no more lines on one another and breaks no rule of `KEPT` more
 * often. Bends may change with the length; a detour has its own.
 */
function traded(a: LineInput, b: LineInput): boolean {
  const [x, y] = [lineMetrics(a), lineMetrics(b)];
  if (y.overlaps > x.overlaps || DETOUR * (y.crossings - x.crossings) + (y.length - x.length) >= 0) return false;
  const rules = (input: LineInput) => {
    const found = lineFindings(input, { crossingsUpTo: 0 });
    return KEPT.map((r) => found.filter((f) => f.rule === r).length);
  };
  const before = rules(a);
  return rules(b).every((n, i) => n <= (before[i] ?? 0));
}

/**
 * A picture laid out in the order of fewest crossings and, where the order stage found them, also in the order of
 * shorter lines (`Arrangement.shorter`) and the order of hanging rows (`Arrangement.hanging`); each in turn stays
 * where its drawing trades better than the one kept so far (`traded`). The order stage only estimates where boxes
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
  let kept = { layers: arranged.layers, lines: rough(arranged.layers) };
  for (const layers of others) {
    const lines = rough(layers);
    if (traded(kept.lines, lines)) kept = { layers, lines };
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
