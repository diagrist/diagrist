import { type LineInput, lineFindings, lineMetrics } from '@diagrist/core';
import { DETOUR } from '../score.js';
import { arrange } from './arrange.js';
import { finish, type LayeredLayout } from './finish.js';
import { layeredLines } from './output.js';
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
 * A picture laid out in the order of fewest crossings and, where the order stage found one, also in the order of
 * shorter lines (`Arrangement.shorter`); the shorter one stays where its drawing trades better (`traded`). The order
 * stage only estimates where boxes will stand, so the drawing decides: both orders are drawn without the passes that
 * move boxes to straighten lines, and only the one that stays is laid out in full. `release` turns a layout into the
 * one drawn, and `outer` is the spec it is read by.
 */
export function laidOut(
  spec: LayeredSpec,
  release: (layout: LayeredLayout) => LayeredLayout = (l) => l,
  outer: LayeredSpec = spec,
): LayeredLayout {
  const arranged = arrange(spec);
  const { shorter } = arranged;
  if (shorter === undefined) return release(finish(spec, arranged));
  const rough = (layers: string[][]) =>
    layeredLines(outer, release(finish(spec, { ...arranged, layers, rough: true })));
  const better = traded(rough(arranged.layers), rough(shorter));
  return release(finish(spec, better ? { ...arranged, layers: shorter } : arranged));
}
